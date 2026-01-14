import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
    <AuthShell title="Log in" subtitle="Access your dashboard" backTo="/">
      <form onSubmit={onSubmit} className="mt-8 space-y-4 max-w-[480px] mx-auto">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 dark:text-red-200 rounded-xl p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-base font-medium">Email</p>
          <input
            className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec] border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#192633] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] px-4 text-base"
            placeholder="admin@company.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-base font-medium">Password</p>
          <div className="relative">
            <input
              className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec] border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#192633] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] px-4 text-base pr-14"
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
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#92adc9]"
              aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showPass ? 'Ocultar' : 'Mostrar'}
            >
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full h-14 bg-[#137fec] text-white font-bold rounded-xl text-lg hover:bg-[#137fec]/90 transition-colors shadow-lg shadow-[#137fec]/20 disabled:opacity-50"
          >
            {loading ? 'Entrando…' : 'Log in'}
          </button>
        </div>

        <div className="pt-4 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Don’t have an account?
            <Link className="text-[#137fec] font-semibold ml-1 hover:underline" to="/register">
              Create one
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
