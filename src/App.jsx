import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { Check, Copy, LogOut, Palette, Store, User, X } from 'lucide-react'

import { useAuthSession } from './hooks/useAuthSession'
import { CATALOG_TEMPLATES } from './data/catalogSettingsRepository'
import { useCatalogTemplate } from './hooks/useCatalogTemplate'
import DashboardPrecios from './components/DashboardPrecios'
import CatalogoProductos from './components/CatalogoProductos'
import FloatingWhatsAppButton from './components/FloatingWhatsAppButton'
import FloatingLocationButton from './components/FloatingLocationButton'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'
import SuperAdminPage from './pages/SuperAdminPage'
import PricingPage from './pages/PricingPage'
import CheckoutPage from './pages/CheckoutPage'
import PaymentPendingPage from './pages/PaymentPendingPage'
import PaymentThanksPage from './pages/PaymentThanksPage'
import NotFoundPage from './pages/NotFoundPage'
import { tiendasRepository } from './data/tiendasRepository'
import { perfilesRepository } from './data/perfilesRepository'
import { suscripcionesRepository } from './data/suscripcionesRepository'
import { solicitudesPagoRepository } from './data/solicitudesPagoRepository'

const LegacyCatalogRedirect = () => {
  const { handle } = useParams()
  return <Navigate to={`/${handle}`} replace />
}

const AdminPage = () => {
  const navigate = useNavigate()
  const { session, cargando, error, cerrarSesion } = useAuthSession()
  const [themesOpen, setThemesOpen] = useState(false)
  const [tienda, setTienda] = useState(null)
  const [tiendaError, setTiendaError] = useState('')
  const [tiendaLoading, setTiendaLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // URL pública “canónica” para compartir links.
  // Configura en Vercel: VITE_PUBLIC_BASE_URL=https://cataly.shop
  const publicBaseUrl = useMemo(() => {
    const fromEnv = import.meta?.env?.VITE_PUBLIC_BASE_URL || import.meta?.env?.VITE_PUBLIC_ORIGIN || ''
    const origin = String(fromEnv || globalThis?.location?.origin || '').trim()
    return origin.replace(/\/+$/, '')
  }, [])

  const [profileOpen, setProfileOpen] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileNombreCompleto, setProfileNombreCompleto] = useState('')
  const [profileNombreNegocio, setProfileNombreNegocio] = useState('')
  const [profileDireccion, setProfileDireccion] = useState('')
  const [profileTelefono, setProfileTelefono] = useState('')
  const [profileMapsUrl, setProfileMapsUrl] = useState('')

  const normalizeTelefono = (telefono) => String(telefono || '').replace(/\D/g, '')

  const sessionUserId = session?.user?.id
  const sessionEmail = session?.user?.email
  const sessionBusinessName = session?.user?.user_metadata?.business_name || session?.user?.user_metadata?.businessName

  const [subStatus, setSubStatus] = useState(null)
  const [subLoading, setSubLoading] = useState(false)
  const [subError, setSubError] = useState('')

  const [pendingSolicitud, setPendingSolicitud] = useState(null)
  const [pendingSolicitudLoading, setPendingSolicitudLoading] = useState(false)

  const {
    catalogTemplate,
    setCatalogTemplate: guardarCatalogTemplate,
    cargando: cargandoCatalogSettings,
    guardando: guardandoCatalogSettings,
    error: catalogSettingsError,
  } = useCatalogTemplate({ enableSave: true, ownerId: sessionUserId })

  const avatarLabel = useMemo(() => {
    const email = session?.user?.email || ''
    const name = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || ''
    const base = (name || email).trim()
    if (!base) return 'A'
    const parts = base.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] || 'A'
    const second = parts.length > 1 ? (parts[1]?.[0] || '') : (parts[0]?.[1] || '')
    return (first + second).toUpperCase()
  }, [session])

  const openProfile = async () => {
    setProfileOpen(true)
    setProfileError('')
    setProfileLoading(true)
    try {
      const perfil = await perfilesRepository.getMine()
      const catalogContacto = await perfilesRepository.getMyCatalogContact()
      const myTienda = (await tiendasRepository.getMine()) || (await tiendasRepository.ensureMine({ nombreNegocio: sessionBusinessName }))
      const fallbackNombre = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || ''
      setProfileNombreCompleto(perfil?.nombreCompleto || fallbackNombre)
      setProfileNombreNegocio((myTienda?.nombreNegocio || sessionBusinessName || '').trim())
      setProfileDireccion(perfil?.direccion || '')
      // No mostramos teléfono en UI (se eliminó del registro), pero lo preservamos para no pisarlo al guardar.
      setProfileTelefono(perfil?.telefono || '')
      setProfileMapsUrl(catalogContacto?.mapsUrl || '')
    } catch (e) {
      setProfileError(e?.message || 'No se pudieron cargar tus datos.')
    } finally {
      setProfileLoading(false)
    }
  }

  const saveProfile = async (e) => {
    e?.preventDefault?.()
    setProfileError('')
    setProfileSaving(true)
    try {
      const negocio = String(profileNombreNegocio || '').trim()
      if (!negocio) {
        setProfileError('El nombre del negocio es requerido.')
        return
      }

      const telefonoDigits = normalizeTelefono(profileTelefono)
      if (String(profileTelefono || '').trim() && telefonoDigits.length < 7) {
        setProfileError('Escribe un teléfono válido (mínimo 7 dígitos) o déjalo vacío.')
        return
      }

      await perfilesRepository.upsertMine({
        nombreCompleto: profileNombreCompleto,
        telefono: telefonoDigits,
        direccion: profileDireccion,
        mapsUrl: profileMapsUrl,
      })

      // Asegurar tienda y actualizar nombre de negocio.
      await tiendasRepository.ensureMine({ nombreNegocio: negocio })
      const updatedTienda = await tiendasRepository.updateMine({ nombreNegocio: negocio })
      setTienda(updatedTienda)

      setProfileOpen(false)
    } catch (err) {
      setProfileError(err?.message || 'No se pudieron guardar tus datos.')
    } finally {
      setProfileSaving(false)
    }
  }

  useEffect(() => {
    let mounted = true

    if (!sessionUserId) {
      setTienda(null)
      setTiendaError('')
      setTiendaLoading(false)
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      setTiendaLoading(true)
      setTiendaError('')
      try {
        const mine = (await tiendasRepository.getMine()) || (await tiendasRepository.ensureMine({ nombreNegocio: sessionBusinessName }))

        // Si el handle fue generado desde el email (viejo comportamiento), intentamos migrarlo
        // al nombre del negocio (si existe y no choca).
        const emailSlug = sessionEmail ? tiendasRepository.normalizeHandle(sessionEmail) : ''
        const desiredBase = (mine?.nombreNegocio || sessionBusinessName || '').trim()
        const desiredSlug = desiredBase ? tiendasRepository.normalizeHandle(desiredBase) : ''

        const randomSuffix = () => String(Math.floor(Math.random() * 9000) + 1000)

        let finalTienda = mine
        if (
          mine?.handle &&
          emailSlug &&
          desiredSlug &&
          mine.handle === emailSlug &&
          desiredSlug !== mine.handle
        ) {
          try {
            // Intentamos migrar a nombredelnegocio. Si choca, agregamos sufijo.
            let migrated = null
            for (let attempt = 0; attempt < 6; attempt += 1) {
              const next = attempt === 0 ? desiredSlug : `${desiredSlug}-${randomSuffix()}`
              try {
                migrated = await tiendasRepository.updateMine({ handle: next })
                break
              } catch {
                // reintenta
              }
            }
            finalTienda = migrated || mine
          } catch {
            // Si falla (por ejemplo, ya existe), no bloqueamos el flujo.
            finalTienda = mine
          }
        }

        if (mounted) setTienda(finalTienda)
      } catch (e) {
        if (mounted) {
          setTienda(null)
          setTiendaError(e?.message || 'No se pudo generar tu link de catálogo.')
        }
      } finally {
        if (mounted) setTiendaLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [sessionUserId, sessionEmail, sessionBusinessName])

  useEffect(() => {
    let mounted = true

    if (!sessionUserId) {
      setSubStatus(null)
      setSubError('')
      setSubLoading(false)
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      setSubLoading(true)
      setSubError('')
      try {
        const status = await suscripcionesRepository.getMyStatus()
        if (!mounted) return
        setSubStatus(status)
      } catch (e) {
        if (!mounted) return
        setSubStatus(null)
        setSubError(e?.message || 'No se pudo verificar tu suscripción.')
      } finally {
        if (mounted) setSubLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [sessionUserId])

  useEffect(() => {
    let mounted = true

    if (!sessionUserId) {
      setPendingSolicitud(null)
      setPendingSolicitudLoading(false)
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      setPendingSolicitudLoading(true)
      try {
        const row = await solicitudesPagoRepository.getMyPendingSolicitud()
        if (!mounted) return
        setPendingSolicitud(row)
      } catch {
        if (!mounted) return
        setPendingSolicitud(null)
      } finally {
        if (mounted) setPendingSolicitudLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [sessionUserId])

  const catalogPath = tienda?.handle ? `/${tienda.handle}` : '/'

  const dashboardLabel = useMemo(() => {
    const nombre = (tienda?.nombreNegocio || sessionBusinessName || '').trim()
    return nombre ? `Hola! ${nombre}` : 'Dashboard'
  }, [tienda?.nombreNegocio, sessionBusinessName])

  const ensureTienda = async () => {
    setTiendaLoading(true)
    setTiendaError('')
    try {
      const mine = (await tiendasRepository.getMine()) || (await tiendasRepository.ensureMine({}))
      setTienda(mine)
      return mine
    } catch (e) {
      setTienda(null)
      setTiendaError(e?.message || 'No se pudo generar tu link de catálogo.')
      return null
    } finally {
      setTiendaLoading(false)
    }
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">
        Cargando…
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">
        {error}
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (subLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">
        Verificando tu suscripción…
      </div>
    )
  }

  if (subError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-sm p-5">
          <div className="text-base font-semibold text-gray-900">No se pudo validar el acceso</div>
          <div className="mt-2 text-sm text-gray-600">{subError}</div>
          <div className="mt-4 flex gap-2">
            <Link to="/precios" className="inline-flex items-center justify-center rounded-xl bg-gray-900 text-white px-4 h-10 text-sm font-semibold">
              Ver planes
            </Link>
            <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 px-4 h-10 text-sm font-semibold">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!subStatus?.hasAccess) {
    const expired = Boolean(subStatus?.isExpired)

    if (pendingSolicitudLoading) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">
          Verificando tu pago…
        </div>
      )
    }

    // Si el usuario ya envió comprobante y está en revisión, mostramos la pantalla de espera.
    if (pendingSolicitud) {
      return <Navigate to="/pago/pendiente" replace />
    }

    return (
      <div className="min-h-screen bg-background-dark font-[Manrope] antialiased">
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
          <div
            className="absolute top-[-50px] left-[-50px] h-[300px] w-[300px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,51,153,0.22) 0%, rgba(255,51,153,0) 70%)',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-[10%] right-[-100px] h-[400px] w-[400px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,51,153,0.16) 0%, rgba(255,51,153,0) 60%)',
            }}
            aria-hidden="true"
          />

          <div className="flex items-center p-6 pb-2 justify-between z-10">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-white/80 flex size-10 shrink-0 items-center justify-start"
              aria-label="Volver"
              title="Volver"
            >
              <span className="material-symbols-outlined cursor-pointer">arrow_back_ios</span>
            </button>
            <h2 className="text-white text-lg font-bold tracking-tight flex-1 text-center pr-10">Cataly</h2>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 z-10">
            <div className="w-full max-w-sm mb-12 text-center">
              <div className="relative inline-flex items-center justify-center">
                <div className="absolute w-32 h-32 bg-primary/20 blur-3xl rounded-full" aria-hidden="true" />
                <div className="relative w-40 h-40 rounded-full flex items-center justify-center border border-primary/30 bg-white/5 backdrop-blur-[16px]">
                  <span
                    className="material-symbols-outlined text-[84px] text-primary"
                    style={{
                      fontVariationSettings: "'FILL' 1, 'wght' 300",
                      textShadow: '0 0 20px rgba(255,51,153,0.6)',
                    }}
                    aria-hidden="true"
                  >
                    lock_clock
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl bg-white/5 backdrop-blur-[16px] border border-white/10">
              <div className="mb-2 inline-flex px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-primary text-[10px] uppercase font-bold tracking-widest">Suscripción</span>
              </div>

              <h3 className="text-white text-3xl font-extrabold leading-tight pb-3">
                {expired ? '¡Hey! Tu plan está vencido' : '¡Hey! Tu acceso está pendiente'}
              </h3>

              <p className="text-white/70 text-base font-medium leading-relaxed mb-10 max-w-[240px]">
                {expired ? (
                  <>
                    Realiza tu pago para seguir disfrutando de <span className="text-primary font-bold">Cataly</span>
                  </>
                ) : (
                  <>
                    Envía tu comprobante y activa tu acceso a <span className="text-primary font-bold">Cataly</span>
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={() => navigate('/precios')}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 rounded-2xl transition-all duration-300 shadow-[0_8px_30px_rgba(255,51,153,0.3)] flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <span className="material-symbols-outlined">payments</span>
                Realizar pago
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = 'mailto:soporte@cataly.app'
                }}
                className="mt-8 text-white/40 text-sm font-semibold hover:text-white transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
                Contactar soporte técnico
              </button>
            </div>

            <div className="mt-12 flex items-center gap-2 opacity-20 grayscale">
              <div className="h-[1px] w-8 bg-white" />
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-white">Security &amp; Billing</span>
              <div className="h-[1px] w-8 bg-white" />
            </div>
          </div>

          <div className="h-10" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">{dashboardLabel}</span>
            {tienda?.handle ? (
              <span className="hidden sm:inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
                {publicBaseUrl ? `${publicBaseUrl}/${tienda.handle}` : `/${tienda.handle}`}
              </span>
            ) : (
              <button
                type="button"
                disabled={tiendaLoading}
                onClick={ensureTienda}
                className="hidden sm:inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title={tiendaError || 'Generar link del catálogo'}
              >
                {tiendaLoading ? 'Generando…' : (tiendaError ? 'Reintentar link' : 'Generar link')}
              </button>
            )}
          </div>

          <div className="relative flex items-center gap-2">
            <Link
              to={catalogPath}
              className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              title="Ver catálogo"
              aria-label="Ver catálogo"
            >
              <Store size={18} />
            </Link>

            <button
              type="button"
              disabled={tiendaLoading}
              onClick={async () => {
                try {
                  const t = tienda?.handle ? tienda : await ensureTienda()
                  if (!t?.handle) return

                  const path = `/${t.handle}`
                  const url = publicBaseUrl ? `${publicBaseUrl}${path}` : `${globalThis?.location?.origin || ''}${path}`
                  if (globalThis?.navigator?.clipboard?.writeText) {
                    await globalThis.navigator.clipboard.writeText(url)
                  } else {
                    globalThis?.prompt?.('Copia el link de tu catálogo:', url)
                  }
                  setCopied(true)
                  globalThis?.setTimeout?.(() => setCopied(false), 1200)
                } catch {
                  // fallback
                  try {
                    const t = tienda?.handle ? tienda : null
                    const path = t?.handle ? `/${t.handle}` : catalogPath
                    const url = publicBaseUrl ? `${publicBaseUrl}${path}` : `${globalThis?.location?.origin || ''}${path}`
                    globalThis?.prompt?.('Copia el link de tu catálogo:', url)
                  } catch {
                    // noop
                  }
                }
              }}
              className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title={copied ? 'Copiado' : (tiendaError ? tiendaError : 'Copiar link del catálogo')}
              aria-label="Copiar link del catálogo"
            >
              <Copy size={18} className={copied ? 'text-emerald-600' : undefined} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setThemesOpen((v) => !v)}
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) setThemesOpen(false)
                }}
                disabled={cargandoCatalogSettings}
                className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title={catalogSettingsError ? catalogSettingsError : 'Temas del catálogo'}
                aria-label="Temas del catálogo"
              >
                <Palette size={18} />
              </button>

              {themesOpen ? (
                <div
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                  role="menu"
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="text-xs text-gray-500">Tema</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {guardandoCatalogSettings ? 'Guardando…' : 'Selecciona un tema'}
                    </div>
                    {catalogSettingsError ? (
                      <div className="mt-1 text-xs text-rose-600">{catalogSettingsError}</div>
                    ) : null}
                  </div>

                  {[{
                    value: CATALOG_TEMPLATES.SIMPLE,
                    label: 'Elegance',
                  }, {
                    value: CATALOG_TEMPLATES.BOUTIQUE,
                    label: 'Boutique',
                  }, {
                    value: CATALOG_TEMPLATES.MODERN,
                    label: 'Moderna',
                  }, {
                    value: CATALOG_TEMPLATES.HEAVY,
                    label: 'Heavy',
                  }].map((opt) => {
                    const active = catalogTemplate === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={async () => {
                          try {
                            await guardarCatalogTemplate(opt.value)
                          } finally {
                            setThemesOpen(false)
                          }
                        }}
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
                        role="menuitem"
                        disabled={guardandoCatalogSettings}
                      >
                        <span className="font-medium">{opt.label}</span>
                        {active ? <Check size={18} className="text-emerald-600" /> : <span className="w-[18px]" />}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openProfile}
              className="inline-flex items-center gap-2"
              title="Tus datos"
            >
              <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold select-none">
                {avatarLabel}
              </span>
            </button>
          </div>
        </div>
      </div>

      {profileOpen ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              if (!profileSaving) setProfileOpen(false)
            }}
            aria-label="Cerrar"
          />

          <div className="relative mx-auto max-w-lg px-4 pt-6 sm:pt-10">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-gray-700" />
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Tus datos personales</div>
                    <div className="text-xs text-gray-500">Edita tu perfil</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!profileSaving) setProfileOpen(false)
                  }}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={profileSaving}
                  aria-label="Cerrar"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                {profileError ? (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">
                    {profileError}
                  </div>
                ) : null}

                {profileLoading ? (
                  <div className="text-sm text-gray-600">Cargando…</div>
                ) : (
                  <form onSubmit={saveProfile} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Correo</label>
                      <input
                        type="email"
                        value={session?.user?.email || ''}
                        readOnly
                        className="mt-1 w-full p-2 border rounded-lg bg-gray-50 text-gray-700"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre del negocio</label>
                      <input
                        type="text"
                        value={profileNombreNegocio}
                        onChange={(e) => setProfileNombreNegocio(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                        placeholder="Nombre de tu tienda"
                        autoComplete="organization"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
                      <input
                        type="text"
                        value={profileNombreCompleto}
                        onChange={(e) => setProfileNombreCompleto(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                        placeholder="Tu nombre"
                        autoComplete="name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dirección</label>
                      <input
                        type="text"
                        value={profileDireccion}
                        onChange={(e) => setProfileDireccion(e.target.value)}
                        className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                        placeholder="Av. Principal, Local 3"
                        autoComplete="street-address"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Ubicación (Google Maps)</label>
                      <input
                        type="url"
                        value={profileMapsUrl}
                        onChange={(e) => setProfileMapsUrl(e.target.value)}
                        onBlur={() => setProfileMapsUrl((v) => String(v || '').trim())}
                        className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                        placeholder="https://maps.app.goo.gl/... o https://www.google.com/maps?..."
                        autoComplete="url"
                        inputMode="url"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Recomendado: abre Google Maps → Compartir → Copiar enlace. Así tus clientes llegan exacto a tu local.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <input
                        type="tel"
                        value={profileTelefono}
                        onChange={(e) => setProfileTelefono(e.target.value)}
                        onBlur={() => setProfileTelefono((v) => normalizeTelefono(v))}
                        className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400"
                        placeholder="+58 412 000 0000"
                        autoComplete="tel"
                      />
                      <p className="mt-1 text-xs text-gray-500">Se guardará sin espacios ni símbolos (solo dígitos).</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await cerrarSesion()
                        }}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                      >
                        <LogOut size={18} />
                        Cerrar sesión
                      </button>

                      <div className="flex-1" />

                      <button
                        type="button"
                        onClick={() => setProfileOpen(false)}
                        disabled={profileSaving}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-black disabled:opacity-50"
                      >
                        {profileSaving ? 'Guardando…' : 'Guardar'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <DashboardPrecios ownerId={session?.user?.id} />
    </div>
  )
}

const CatalogoTiendaPublica = () => {
  const { handle } = useParams()
  const [tienda, setTienda] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('')
  const [direccionNegocio, setDireccionNegocio] = useState('')
  const [mapsUrlNegocio, setMapsUrlNegocio] = useState('')

  const [catalogAllowed, setCatalogAllowed] = useState(true)
  const [catalogChecking, setCatalogChecking] = useState(false)

  useEffect(() => {
    let mounted = true

    // Evitar setState síncrono directo en el cuerpo del effect (regla lint).
    Promise.resolve().then(() => {
      if (!mounted) return
      setCargando(true)
      setError('')
    })

    tiendasRepository
      .getByHandle(handle)
      .then((t) => {
        if (!mounted) return
        setTienda(t)
      })
      .catch((e) => {
        if (!mounted) return
        setError(e?.message || 'No se pudo cargar la tienda.')
        setTienda(null)
      })
      .finally(() => {
        if (!mounted) return
        setCargando(false)
      })

    return () => {
      mounted = false
    }
  }, [handle])

  useEffect(() => {
    let mounted = true

    if (!tienda?.ownerId) {
      Promise.resolve().then(() => {
        if (!mounted) return
        setCatalogAllowed(true)
        setCatalogChecking(false)
      })
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      setCatalogChecking(true)
      try {
        const allowed = await suscripcionesRepository.getCatalogAccessForOwner(tienda.ownerId)
        if (!mounted) return
        // Si la función aún no existe (null), no bloqueamos el catálogo.
        setCatalogAllowed(typeof allowed === 'boolean' ? allowed : true)
      } catch {
        if (!mounted) return
        setCatalogAllowed(true)
      } finally {
        if (mounted) setCatalogChecking(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [tienda?.ownerId])

  useEffect(() => {
    let mounted = true
    if (!tienda?.ownerId) {
      // Evitar setState síncrono directo en el cuerpo del effect (regla lint).
      Promise.resolve().then(() => {
        if (!mounted) return
        setTelefonoWhatsApp('')
        setDireccionNegocio('')
        setMapsUrlNegocio('')
      })
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      try {
        const contacto = await perfilesRepository.getPublicContactByUserId(tienda.ownerId)
        if (!mounted) return
        setTelefonoWhatsApp(contacto?.telefono || '')
        setDireccionNegocio(contacto?.direccion || '')
        setMapsUrlNegocio(contacto?.mapsUrl || '')
      } catch {
        if (!mounted) return
        setTelefonoWhatsApp('')
        setDireccionNegocio('')
        setMapsUrlNegocio('')
      }
    })()

    return () => {
      mounted = false
    }
  }, [tienda?.ownerId])

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">Cargando…</div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">{error}</div>
    )
  }

  if (!tienda) {
    return (
      <NotFoundPage
        title="¡Hey! No se encontró esta ruta"
        description={
          <>
            Esta página no existe o el enlace no es válido. Regístrate en{' '}
            <span className="text-primary font-bold">Cataly</span> para crear o reactivar tu catálogo.
          </>
        }
        primaryCtaLabel="Ir al inicio"
        primaryCtaTo="/"
      />
    )
  }

  if (catalogChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">Cargando…</div>
    )
  }

  if (!catalogAllowed) {
    return (
      <NotFoundPage
        title="¡Hey! No se encontró esta ruta"
        description={
          <>
            Tu suscripción ha expirado o el enlace no es válido. Regístrate en{' '}
            <span className="text-primary font-bold">Cataly</span> para reactivar tu catálogo.
          </>
        }
        primaryCtaLabel="Ir al inicio"
        primaryCtaTo="/"
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-gray-800">{tienda.nombreNegocio || 'Catálogo'}</span>
          <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">Mi catálogo</Link>
        </div>
      </div>

      <CatalogoProductos ownerId={tienda.ownerId} brandName={tienda?.nombreNegocio || ''} />

      <FloatingLocationButton url={mapsUrlNegocio} />

      <FloatingWhatsAppButton
        number={telefonoWhatsApp}
        message={
          tienda?.nombreNegocio
            ? `Hola, vengo del catálogo de ${tienda.nombreNegocio}. Me gustaría consultar por un producto.`
            : 'Hola, vengo del catálogo. Me gustaría consultar por un producto.'
        }
      />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/precios" element={<PricingPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/pago/gracias" element={<PaymentThanksPage />} />
        <Route path="/pago/pendiente" element={<PaymentPendingPage />} />
        <Route path="/catalogo" element={<Navigate to="/" replace />} />
        <Route path="/t/:handle" element={<LegacyCatalogRedirect />} />
        <Route path="/superadmin" element={<SuperAdminPage />} />
        <Route path="/:handle" element={<CatalogoTiendaPublica />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
