import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthShell from './AuthShell'
import { authRepository } from '../data/authRepository'
import { perfilesRepository } from '../data/perfilesRepository'
import { tiendasRepository } from '../data/tiendasRepository'

export default function RegisterPage({ redirectTo = '/admin', preferredHandle } = {}) {
  const navigate = useNavigate()

  const [nombreCompleto, setNombreCompleto] = useState('')
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [email, setEmail] = useState('')
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
          direccion: direccion ? String(direccion).trim() : null,
        },
      })

      // 2) Si hay sesión inmediatamente, crear perfil/tienda.
      // Si tu proyecto requiere confirmación por email, esta parte puede ejecutarse al primer login.
      try {
        await perfilesRepository.upsertMine({
          nombreCompleto,
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
      title="Crea tu cuenta en Cataly"
      subtitle="Configura la herramienta de gestión de tu catálogo de negocios"
      backTo="/"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm font-sans">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold font-sans text-[#1c0d16]/80">Nombre completo</p>
          <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
            <input
              className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
              placeholder="Tu nombre"
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold font-sans text-[#1c0d16]/80">Nombre de tu negocio</p>
          <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
            <input
              className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
              placeholder="Nombre de tu negocio"
              type="text"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold font-sans text-[#1c0d16]/80">Correo electrónico</p>
          <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
            <input
              className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
              placeholder="correo@mail.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold font-sans text-[#1c0d16]/80">Dirección del negocio (opcional)</p>
          <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
            <input
              className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
              placeholder="Av. Principal, Local 3"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              autoComplete="street-address"
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
              autoComplete="new-password"
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
          <p className="mt-1 font-sans text-xs text-[#1c0d16]/60">Mínimo 6 caracteres</p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full inline-flex items-center justify-center rounded-xl bg-primary px-6 py-4 text-base font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Creando…' : 'Crear cuenta'}
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="font-sans text-sm text-[#1c0d16]/70">
            ¿Ya tienes una cuenta?
            <Link className="text-primary font-semibold ml-1 hover:underline" to="/login">
              Iniciar sesión
            </Link>
          </p>
        </div>

        <div className="mt-10 text-center px-6">
          <p className="font-sans text-[11px] text-[#1c0d16]/45 leading-relaxed uppercase tracking-wider">
            Al registrarte, aceptas nuestros <br />
            <span className="underline">Términos del servicio</span> y <span className="underline">Política de privacidad</span>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
