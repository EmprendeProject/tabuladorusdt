import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { authRepository } from '../data/authRepository'
import { perfilesRepository } from '../data/perfilesRepository'
import { tiendasRepository } from '../data/tiendasRepository'

export default function RegisterPage({ redirectTo = '/admin', preferredHandle } = {}) {
  const navigate = useNavigate()

  const [nombreCompleto, setNombreCompleto] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [direccion, setDireccion] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canSubmit = useMemo(() => {
    return (
      String(nombreCompleto).trim().length > 0 &&
      String(nombreNegocio).trim().length > 0 &&
      String(email).trim().length > 0 &&
      String(password).length >= 6
    )
  }, [nombreCompleto, nombreNegocio, email, password])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1) Crear usuario (email/password)
      await authRepository.signUp({
        email: String(email).trim(),
        password,
        data: {
          full_name: String(nombreCompleto).trim(),
          business_name: String(nombreNegocio).trim(),
          telefono: String(telefono || '').trim(),
          direccion: direccion ? String(direccion).trim() : null,
        },
      })

      // 2) Si hay sesión inmediatamente, crear perfil/tienda.
      // Si tu proyecto requiere confirmación por email, esta parte puede ejecutarse al primer login.
      try {
        await perfilesRepository.upsertMine({
          nombreCompleto,
          telefono,
          direccion,
        })
      } catch {
        // noop: puede fallar si no hay sesión por confirmación de email.
      }

      try {
        await tiendasRepository.ensureMine({ nombreNegocio, preferredHandle })
      } catch {
        // noop por misma razón.
      }

      navigate(redirectTo, { replace: true })
    } catch (err) {
      console.error('Error registro:', err)
      setError(err?.message || 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Create Admin Account"
      subtitle="Set up your business catalog management tool"
      backTo="/"
    >
      <form onSubmit={onSubmit} className="mt-8 space-y-4 max-w-[480px] mx-auto">
        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 dark:text-red-200 rounded-xl p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-base font-medium">Full Name</p>
          <input
            className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec] border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#192633] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] px-4 text-base"
            placeholder="John Doe"
            type="text"
            value={nombreCompleto}
            onChange={(e) => setNombreCompleto(e.target.value)}
            autoComplete="name"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-base font-medium">Business Name</p>
          <input
            className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec] border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#192633] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] px-4 text-base"
            placeholder="Enter your business name"
            type="text"
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-base font-medium">Email Address</p>
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
          <p className="text-slate-900 dark:text-white text-base font-medium">Phone Number</p>
          <input
            className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec] border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#192633] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] px-4 text-base"
            placeholder="+58 412 000 0000"
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            autoComplete="tel"
          />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-slate-900 dark:text-white text-base font-medium">Business Address (optional)</p>
          <input
            className="form-input flex w-full rounded-lg text-slate-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-[#137fec] border border-slate-300 dark:border-[#324d67] bg-white dark:bg-[#192633] h-14 placeholder:text-slate-400 dark:placeholder:text-[#92adc9] px-4 text-base"
            placeholder="Av. Principal, Local 3"
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            autoComplete="street-address"
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
              autoComplete="new-password"
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Mínimo 6 caracteres
          </p>
        </div>

        <div className="pt-6">
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full h-14 bg-[#137fec] text-white font-bold rounded-xl text-lg hover:bg-[#137fec]/90 transition-colors shadow-lg shadow-[#137fec]/20 disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Create Account'}
          </button>
        </div>

        <div className="pt-4 text-center">
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Already have an account?
            <Link className="text-[#137fec] font-semibold ml-1 hover:underline" to="/login">
              Log in
            </Link>
          </p>
        </div>

        <div className="mt-12 text-center px-8">
          <p className="text-[11px] text-slate-400 leading-relaxed uppercase tracking-wider">
            By signing up, you agree to our <br />
            <span className="underline">Terms of Service</span> and <span className="underline">Privacy Policy</span>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
