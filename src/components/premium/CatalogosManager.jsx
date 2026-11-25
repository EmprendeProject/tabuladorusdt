import { useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tiendasRepository } from '../../data/tiendasRepository'
import { eliminarCatalogo } from '../../usecases/catalogosUsecases'
import PremiumUpsell from './PremiumUpsell'
import PremiumBadge from './PremiumBadge'
import DuplicarProductosPanel from './DuplicarProductosPanel'

const inputClass =
  'mt-1 w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400'

function CatalogoForm({ initial, onCancel, onSubmit, submitLabel, publicBaseUrl }) {
  const [nombre, setNombre] = useState(initial?.nombreNegocio || '')
  const [handle, setHandle] = useState(initial?.handle || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const preview = tiendasRepository.normalizeHandle(handle || nombre)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!String(nombre).trim()) {
      setError('El nombre es requerido.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({ nombreNegocio: nombre, handle: handle || nombre })
    } catch (err) {
      setError(err?.message || 'No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-sm text-gray-700">
        Nombre del catálogo
        <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Mi Tienda Kids" />
      </label>
      <label className="block text-sm text-gray-700">
        Link
        <input className={inputClass} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="mi-tienda-kids" />
        <span className="mt-1 block text-xs text-gray-500">
          {publicBaseUrl || ''}/{preview}
        </span>
      </label>
      {error ? <div className="text-sm text-rose-600">{error}</div> : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

export default function CatalogosManager({ ownerId, catalogosApi, premium, maxCatalogos, publicBaseUrl }) {
  const { catalogos, activo, setActiveId, crear, actualizar, recargar, cargando, error } = catalogosApi
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [deleting, setDeleting] = useState(null) // catálogo a borrar
  const [deleteKeyword, setDeleteKeyword] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [copiedId, setCopiedId] = useState('')

  const canCreate = premium && catalogos.length < maxCatalogos

  const copyLink = async (c) => {
    const url = `${publicBaseUrl || globalThis?.location?.origin || ''}/${c.handle}`
    try {
      await globalThis.navigator?.clipboard?.writeText(url)
      setCopiedId(c.id)
      globalThis.setTimeout?.(() => setCopiedId(''), 1200)
    } catch {
      globalThis.prompt?.('Copia el link:', url)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    if (deleteKeyword.trim().toUpperCase() !== 'BORRAR') {
      setDeleteError('Escribe BORRAR para confirmar.')
      return
    }
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await eliminarCatalogo({ ownerId, tiendaId: deleting.id })
      if (activo?.id === deleting.id) setActiveId('')
      setDeleting(null)
      setDeleteKeyword('')
      await recargar()
    } catch (e) {
      setDeleteError(e?.message || 'No se pudo borrar el catálogo.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Mis catálogos</h2>
          <p className="text-sm text-gray-500">
            {catalogos.length}/{maxCatalogos} catálogo(s). Cada uno tiene su link, productos, categorías y tema.
          </p>
        </div>
        {canCreate && !creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Nuevo catálogo
          </button>
        ) : null}
      </div>

      {error ? <div className="text-sm text-rose-600">{error}</div> : null}

      {creating ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">Nuevo catálogo</h3>
          <CatalogoForm
            submitLabel="Crear catálogo"
            publicBaseUrl={publicBaseUrl}
            onCancel={() => setCreating(false)}
            onSubmit={async (data) => {
              const created = await crear(data)
              setCreating(false)
              if (created?.id) setActiveId(created.id)
            }}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        {cargando && !catalogos.length ? (
          <div className="text-sm text-gray-500">Cargando…</div>
        ) : null}

        {catalogos.map((c) => {
          const isActive = activo?.id === c.id
          const locked = !c.esPrincipal && !premium
          return (
            <div
              key={c.id}
              className={
                'rounded-2xl border bg-white p-4 ' + (isActive ? 'border-gray-900 shadow-sm' : 'border-gray-200')
              }
            >
              {editingId === c.id ? (
                <CatalogoForm
                  initial={c}
                  submitLabel="Guardar"
                  publicBaseUrl={publicBaseUrl}
                  onCancel={() => setEditingId('')}
                  onSubmit={async (data) => {
                    await actualizar(c.id, data)
                    setEditingId('')
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 truncate">{c.nombreNegocio}</span>
                      {c.esPrincipal ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-600">Principal</span>
                      ) : null}
                      {isActive ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Editando</span>
                      ) : null}
                      {locked ? <PremiumBadge /> : null}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-500 truncate">
                      {publicBaseUrl || ''}/{c.handle}
                      {locked ? ' · oculto hasta renovar Cattaly Pro' : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isActive && !locked ? (
                      <button
                        type="button"
                        onClick={() => setActiveId(c.id)}
                        className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                      >
                        Editar productos
                      </button>
                    ) : null}
                    <button type="button" onClick={() => copyLink(c)} title="Copiar link" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                      {copiedId === c.id ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    </button>
                    <Link to={`/${c.handle}`} title="Ver catálogo" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                      <ExternalLink size={16} />
                    </Link>
                    <button type="button" onClick={() => setEditingId(c.id)} title="Renombrar" className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50">
                      <Pencil size={16} />
                    </button>
                    {!c.esPrincipal ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleting(c)
                          setDeleteKeyword('')
                          setDeleteError('')
                        }}
                        title="Borrar catálogo"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!premium ? (
        <PremiumUpsell
          title="Ten hasta 3 catálogos en tu cuenta"
          description="Crea catálogos separados por marca, línea de productos o sucursal, y copia productos entre ellos."
        />
      ) : catalogos.length > 1 ? (
        <DuplicarProductosPanel ownerId={ownerId} catalogos={catalogos} defaultFromId={activo?.id} />
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 p-5 text-sm text-gray-500">
          Crea un segundo catálogo para poder copiar o mover productos entre ellos.
        </div>
      )}

      {deleting ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => !deleteBusy && setDeleting(null)} aria-label="Cerrar" />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-gray-900">Borrar “{deleting.nombreNegocio}”</h3>
              <button type="button" onClick={() => !deleteBusy && setDeleting(null)} className="text-gray-500"><X size={18} /></button>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              Se borrarán sus productos, fotos, categorías y tema. El link dejará de funcionar. Esto no se puede deshacer.
            </p>
            <input
              className={inputClass}
              value={deleteKeyword}
              onChange={(e) => setDeleteKeyword(e.target.value)}
              placeholder="Escribe BORRAR"
            />
            {deleteError ? <div className="mt-2 text-sm text-rose-600">{deleteError}</div> : null}
            <button
              type="button"
              onClick={confirmDelete}
              disabled={deleteBusy}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleteBusy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Borrar catálogo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
