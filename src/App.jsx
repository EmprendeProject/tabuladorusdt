import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { LogOut } from 'lucide-react'

import { supabase } from './lib/supabase'
import DashboardPrecios from './components/DashboardPrecios'
import CatalogoProductos from './components/CatalogoProductos'
import AdminLogin from './components/AdminLogin'

const AdminPage = () => {
  const [session, setSession] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data?.session || null)
      setCargando(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe()
    }
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-gray-600">
        Cargando…
      </div>
    )
  }

  if (!session) {
    return <AdminLogin />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-800">Admin</span>
            <Link to="/" className="text-sm text-blue-700 hover:underline">
              Ver catálogo público
            </Link>
          </div>

          <button
            onClick={cerrarSesion}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            title="Cerrar sesión"
          >
            <LogOut size={18} />
            Salir
          </button>
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
