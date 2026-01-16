import { supabase } from '../lib/supabase'

const BUCKET = 'payment-proofs'

function isRlsOrPermissionError(error) {
  const msg = String(error?.message || '').toLowerCase()
  const code = String(error?.code || '')
  return (
    msg.includes('row-level security') ||
    msg.includes('new row violates row-level security policy') ||
    msg.includes('permission denied') ||
    code === '42501'
  )
}

function toFriendlyStorageUploadError(error) {
  if (isRlsOrPermissionError(error)) {
    return new Error(
      'No se pudo subir el comprobante por permisos/políticas (RLS) en Supabase Storage. ' +
        'Solución: crea policies para el bucket `payment-proofs` que permitan `INSERT` a rutas `payments/{uid}/...` (tu carpeta).'
    )
  }

  return error
}

function toFriendlySolicitudInsertError(error) {
  if (isRlsOrPermissionError(error)) {
    return new Error(
      'No se pudo crear la solicitud por permisos/políticas (RLS) en Supabase. ' +
        'Solución: verifica que exista la policy `solicitudes_pago_insert_own` (WITH CHECK auth.uid() = owner_id) y que tengas `GRANT INSERT` para el rol `authenticated`.'
    )
  }

  return error
}

function safeTrim(value) {
  return String(value ?? '').trim()
}

function getFileExt(file) {
  const name = safeTrim(file?.name)
  const idx = name.lastIndexOf('.')
  if (idx <= 0) return ''
  return name.slice(idx + 1).toLowerCase()
}

function randomId() {
  try {
    return globalThis.crypto?.randomUUID?.() || Math.random().toString(16).slice(2)
  } catch {
    return Math.random().toString(16).slice(2)
  }
}

export const solicitudesPagoRepository = {
  async createSolicitud({ planId, planPriceUsd, metodo, montoBs, referencia, fechaPago, comprobanteFile }) {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError
    if (!user) throw new Error('Debes iniciar sesión para enviar el comprobante.')

    const plan_id = safeTrim(planId)
    if (!plan_id) throw new Error('Plan inválido.')

    const metodoNorm = safeTrim(metodo)
    if (!['ves', 'binance'].includes(metodoNorm)) throw new Error('Método inválido.')

    const ref = safeTrim(referencia)
    if (!ref) throw new Error('Referencia requerida.')

    const date = safeTrim(fechaPago)
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) throw new Error('Fecha inválida.')

    const priceUsd = Number(planPriceUsd)
    if (!Number.isFinite(priceUsd) || priceUsd <= 0) throw new Error('Monto USD inválido.')

    if (!comprobanteFile) throw new Error('Debes adjuntar el comprobante.')

    const ext = getFileExt(comprobanteFile)
    const filename = `${Date.now()}-${randomId()}${ext ? `.${ext}` : ''}`
    const path = `payments/${user.id}/${filename}`

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, comprobanteFile, {
      upsert: false,
      contentType: comprobanteFile.type || undefined,
    })

    if (uploadError) throw toFriendlyStorageUploadError(uploadError)

    const payload = {
      owner_id: user.id,
      plan_id,
      plan_price_usd: priceUsd,
      metodo: metodoNorm,
      monto_bs: metodoNorm === 'ves' ? Number(montoBs || 0) || null : null,
      referencia: ref,
      fecha_pago: date,
      comprobante_path: path,
      status: 'pending',
    }

    const { data, error } = await supabase.from('solicitudes_pago').insert(payload).select('*').single()
    if (error) {
      // Evitar dejar archivos huérfanos si el insert falla.
      await supabase.storage.from(BUCKET).remove([path])
      throw toFriendlySolicitudInsertError(error)
    }

    return data
  },

  async listSolicitudes({ status } = {}) {
    const statusNorm = safeTrim(status)

    const solicitudesRes = await supabase
      .from('solicitudes_pago')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (solicitudesRes.error) throw solicitudesRes.error

    const rows = solicitudesRes.data || []
    const filtered = statusNorm ? rows.filter((r) => r.status === statusNorm) : rows

    const ownerIds = Array.from(new Set(filtered.map((r) => r.owner_id).filter(Boolean)))

    const [tiendasRes, perfilesRes] = await Promise.all([
      supabase.from('tiendas').select('owner_id,handle,nombre_negocio').in('owner_id', ownerIds),
      supabase.from('perfiles').select('user_id,email').in('user_id', ownerIds),
    ])

    if (tiendasRes.error) throw tiendasRes.error
    if (perfilesRes.error) throw perfilesRes.error

    const tiendasByOwnerId = new Map((tiendasRes.data || []).map((t) => [t.owner_id, t]))
    const perfilesByUserId = new Map((perfilesRes.data || []).map((p) => [p.user_id, p]))

    return filtered.map((r) => {
      const tienda = tiendasByOwnerId.get(r.owner_id)
      const perfil = perfilesByUserId.get(r.owner_id)

      return {
        ...r,
        nombreNegocio: tienda?.nombre_negocio || '',
        handle: tienda?.handle || '',
        email: perfil?.email || '',
      }
    })
  },

  async updateStatus(id, { status, reviewNote } = {}) {
    const reqId = safeTrim(id)
    if (!reqId) throw new Error('ID inválido')

    const nextStatus = safeTrim(status)
    if (!['pending', 'approved', 'rejected'].includes(nextStatus)) throw new Error('Status inválido')

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) throw authError

    const { data, error } = await supabase
      .from('solicitudes_pago')
      .update({
        status: nextStatus,
        reviewed_by: user?.id || null,
        reviewed_at: new Date().toISOString(),
        review_note: reviewNote ? safeTrim(reviewNote) : null,
      })
      .eq('id', reqId)
      .select('*')
      .single()

    if (error) throw error
    return data
  },

  async createSignedProofUrl(comprobantePath, { expiresInSeconds = 60 * 30 } = {}) {
    const path = safeTrim(comprobantePath)
    if (!path) throw new Error('Ruta de comprobante inválida')

    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
    if (error) throw error

    return data?.signedUrl || ''
  },
}
