import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Check, Copy, LogOut, Palette, Store } from 'lucide-react'

import { useAuthSession } from './hooks/useAuthSession'
import { CATALOG_TEMPLATES } from './data/catalogSettingsRepository'
import { useCatalogTemplate } from './hooks/useCatalogTemplate'
import DashboardPrecios from './components/DashboardPrecios'
import CatalogoProductos from './components/CatalogoProductos'
import FloatingWhatsAppButton from './components/FloatingWhatsAppButton'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import LandingPage from './pages/LandingPage'
import { tiendasRepository } from './data/tiendasRepository'

const LegacyCatalogRedirect = () => {
  const { handle } = useParams()
  return <Navigate to={`/${handle}`} replace />
}

const AdminPage = () => {
  const { session, cargando, error, cerrarSesion } = useAuthSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [themesOpen, setThemesOpen] = useState(false)
  const [tienda, setTienda] = useState(null)
  const [tiendaError, setTiendaError] = useState('')
  const [tiendaLoading, setTiendaLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const sessionUserId = session?.user?.id
  const sessionEmail = session?.user?.email
  const sessionBusinessName = session?.user?.user_metadata?.business_name || session?.user?.user_metadata?.businessName

  const {
    catalogTemplate,
    setCatalogTemplate: guardarCatalogTemplate,
    cargando: cargandoCatalogSettings,
    guardando: guardandoCatalogSettings,
  } = useCatalogTemplate({ enableSave: true })

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
        const desiredSlug = sessionBusinessName ? tiendasRepository.normalizeHandle(sessionBusinessName) : ''

        let finalTienda = mine
        if (
          mine?.handle &&
          emailSlug &&
          desiredSlug &&
          mine.handle === emailSlug &&
          desiredSlug !== mine.handle
        ) {
          try {
            finalTienda = await tiendasRepository.updateMine({ handle: desiredSlug })
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

  const catalogPath = tienda?.handle ? `/${tienda.handle}` : '/'

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">Admin</span>
            {tienda?.handle ? (
              <span className="hidden sm:inline-flex items-center rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
                /{tienda.handle}
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
                  const url = `${globalThis?.location?.origin || ''}${path}`
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
                    const url = `${globalThis?.location?.origin || ''}${path}`
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
                title="Temas del catálogo"
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
                  </div>

                  {[{
                    value: CATALOG_TEMPLATES.SIMPLE,
                    label: 'Simple',
                  }, {
                    value: CATALOG_TEMPLATES.BOUTIQUE,
                    label: 'Boutique',
                  }, {
                    value: CATALOG_TEMPLATES.MODERN,
                    label: 'Moderna',
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
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={(e) => {
                // Cierra si el focus sale del contenedor
                if (!e.currentTarget.contains(e.relatedTarget)) setMenuOpen(false)
              }}
              className="inline-flex items-center gap-2"
              title="Cuenta"
            >
              <span className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold select-none">
                {avatarLabel}
              </span>
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden"
                role="menu"
              >
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="text-xs text-gray-500">Sesión</div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {session?.user?.email || 'Cuenta'}
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={async () => {
                    setMenuOpen(false)
                    await cerrarSesion()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-700 hover:bg-red-50"
                  role="menuitem"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <DashboardPrecios ownerId={session?.user?.id} />

      <FloatingWhatsAppButton />
    </div>
  )
}

const CatalogoTiendaPublica = () => {
  const { handle } = useParams()
  const [tienda, setTienda] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

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
      <div className="min-h-screen bg-gray-50">
        <div className="border-b bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-800">Catálogo</span>
            <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">Ir al admin</Link>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 text-gray-600">No se encontró esta tienda.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-gray-800">{tienda.nombreNegocio || 'Catálogo'}</span>
          <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">Ir al admin</Link>
        </div>
      </div>

      <CatalogoProductos ownerId={tienda.ownerId} />

      <FloatingWhatsAppButton />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/catalogo" element={<Navigate to="/" replace />} />
        <Route path="/t/:handle" element={<LegacyCatalogRedirect />} />
        <Route path="/:handle" element={<CatalogoTiendaPublica />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
