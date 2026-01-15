import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthShell from './AuthShell'
import { authRepository } from '../data/authRepository'
import { perfilesRepository } from '../data/perfilesRepository'
import { tiendasRepository } from '../data/tiendasRepository'
import { supabase } from '../lib/supabase'

export default function LoginPage({ redirectTo = '/admin', preferredHandle } = {}) {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return String(email).trim().length > 0 && String(password).length > 0
  }, [email, password])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await authRepository.signInWithPassword({ email: String(email).trim(), password })

      // Asegurar que existan tablas para el usuario (por si el registro requiere confirmación de email)
      try {
        const perfil = await perfilesRepository.getMine()
        if (!perfil) {
          const {
            data: { user },
          } = await supabase.auth.getUser()

          await perfilesRepository.upsertMine({
            nombreCompleto: user?.user_metadata?.full_name || user?.user_metadata?.name || '',
            telefono: user?.user_metadata?.telefono || '',
            direccion: user?.user_metadata?.direccion || null,
          })
        }
      } catch {
        // noop
      }

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        await tiendasRepository.ensureMine({
          preferredHandle,
          nombreNegocio: user?.user_metadata?.business_name || user?.user_metadata?.businessName,
        })
      } catch {
        // noop
      }

      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error('Error login:', err)
      setError(err?.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Iniciar sesión" subtitle="Accede a tu panel" backTo="/">
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm font-sans">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold font-sans text-[#1c0d16]/80">Correo electrónico</p>
          <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
            <input
              className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
              placeholder="tu@correo.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold font-sans text-[#1c0d16]/80">Contraseña</p>
          <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
            <input
              className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
              placeholder="••••••••"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="ml-2 inline-flex items-center justify-center rounded-xl p-2 text-[#1c0d16]/60 hover:bg-white/60"
              aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-6 py-4 text-base font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="font-sans text-sm text-[#1c0d16]/70">
            ¿No tienes una cuenta?
            <Link className="text-[#137fec] font-semibold ml-1 hover:underline" to="/register">
              Crear una
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
