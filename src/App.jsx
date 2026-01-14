import { useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { LogOut, Store } from 'lucide-react'

import { useAuthSession } from './hooks/useAuthSession'
import DashboardPrecios from './components/DashboardPrecios'
import CatalogoProductos from './components/CatalogoProductos'
import AdminLogin from './components/AdminLogin'

const AdminPage = () => {
  const { session, cargando, error, cerrarSesion } = useAuthSession()
  const [menuOpen, setMenuOpen] = useState(false)

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
    return <AdminLogin />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">Admin</span>
          </div>

          <div className="relative flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-10 h-10 rounded-2xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              title="Ver catálogo"
              aria-label="Ver catálogo"
            >
              <Store size={18} />
            </Link>

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

      <DashboardPrecios />
    </div>
  )
}

const CatalogoPublico = () => {
  const showAdminLink = import.meta.env.VITE_SHOW_ADMIN_LINK !== 'false'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-gray-800">Catálogo</span>
          {showAdminLink ? (
            <Link to="/admin" className="text-sm text-gray-600 hover:text-gray-900">
              Admin
            </Link>
          ) : null}
        </div>
      </div>

      <CatalogoProductos />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CatalogoPublico />} />
        <Route path="/catalogo" element={<Navigate to="/" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
