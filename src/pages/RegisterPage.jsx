import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthShell from './AuthShell'
import { authRepository } from '../data/authRepository'
import { perfilesRepository } from '../data/perfilesRepository'
import { tiendasRepository } from '../data/tiendasRepository'

export default function RegisterPage({ preferredHandle } = {}) {
  const navigate = useNavigate()
  // const [params] = useSearchParams()
  // const redirectTo = params.get('redirectTo') || redirectToProp

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
      String(telefono).replace(/\D/g, '').length >= 7 &&
      String(password).length >= 6
    )
  }, [nombreCompleto, nombreNegocio, email, telefono, password])

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const negocio = String(nombreNegocio || '').trim()
      if (!negocio) {
        setError('El nombre de tu negocio es requerido.')
        return
      }

      // 1) Crear usuario (email/password)
      await authRepository.signUp({
        email: String(email).trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-verified`,
          data: {
            full_name: String(nombreCompleto).trim(),
            business_name: negocio,
            direccion: direccion ? String(direccion).trim() : null,
            telefono: String(telefono).replace(/\D/g, ''),
          },
        },
      })

      // 2) Si hay sesión inmediatamente, crear perfil/tienda.
      // Si tu proyecto requiere confirmación por email, esta parte puede ejecutarse al primer login.
      try {
        await perfilesRepository.upsertMine({
          nombreCompleto,
          direccion,
          telefono: String(telefono).replace(/\D/g, ''),
        })
      } catch {
        // noop: puede fallar si no hay sesión por confirmación de email.
      }

      try {
        await tiendasRepository.ensureMine({ nombreNegocio: negocio, preferredHandle })
      } catch {
        // noop por misma razón.
      }

      navigate('/verifica-email', { replace: true })
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
          <div className="rounded-2xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm font-medium">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">Nombre completo</p>
          <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#1840f5] focus-within:ring-1 focus-within:ring-[#1840f5] transition-all">
            <input
              className="w-full bg-transparent py-3 text-gray-900 outline-none placeholder:text-gray-400"
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
          <p className="text-sm font-bold text-gray-700">Nombre de tu negocio</p>
          <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#1840f5] focus-within:ring-1 focus-within:ring-[#1840f5] transition-all">
            <input
              className="w-full bg-transparent py-3 text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="Nombre de tu negocio"
              type="text"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              required
              minLength={2}
              title="Escribe al menos 2 caracteres."
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">Correo electrónico</p>
          <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#1840f5] focus-within:ring-1 focus-within:ring-[#1840f5] transition-all">
            <input
              className="w-full bg-transparent py-3 text-gray-900 outline-none placeholder:text-gray-400"
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
          <p className="text-sm font-bold text-gray-700">Número de teléfono</p>
          <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#1840f5] focus-within:ring-1 focus-within:ring-[#1840f5] transition-all">
            <input
              className="w-full bg-transparent py-3 text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="+58 412 000 0000"
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onBlur={() => setTelefono((v) => v.trim())}
              autoComplete="tel"
              inputMode="tel"
              required
              minLength={7}
              title="Escribe un número de teléfono válido."
            />
          </div>
          <p className="mt-0.5 text-xs text-gray-500 font-medium">Mínimo 7 dígitos</p>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">Dirección del negocio (opcional)</p>
          <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#1840f5] focus-within:ring-1 focus-within:ring-[#1840f5] transition-all">
            <input
              className="w-full bg-transparent py-3 text-gray-900 outline-none placeholder:text-gray-400"
              placeholder="Av. Principal, Local 3"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              autoComplete="street-address"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-gray-700">Contraseña</p>
          <div className="flex items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 focus-within:border-[#1840f5] focus-within:ring-1 focus-within:ring-[#1840f5] transition-all">
            <input
              className="w-full bg-transparent py-3 text-gray-900 outline-none placeholder:text-gray-400"
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
              className="ml-2 inline-flex items-center justify-center rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500 font-medium">Mínimo 6 caracteres</p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full inline-flex items-center justify-center rounded-2xl bg-[#1840f5] hover:bg-[#1430b8] px-6 py-4 text-base font-bold text-white shadow-lg shadow-[#1840f5]/20 hover:shadow-[#1840f5]/40 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Creando…' : 'Crear cuenta'}
          </button>
        </div>

        <div className="pt-2 text-center">
          <p className="text-sm text-gray-600 font-medium">
            ¿Ya tienes una cuenta?
            <Link className="text-[#1840f5] font-bold ml-1 hover:underline" to="/login">
              Iniciar sesión
            </Link>
          </p>
        </div>

        <div className="mt-10 text-center px-6">
          <p className="text-[11px] text-gray-500 font-bold leading-relaxed uppercase tracking-wider">
            Al registrarte, aceptas nuestros <br />
            <span className="underline hover:text-gray-900 cursor-pointer">Términos del servicio</span> y <span className="underline hover:text-gray-900 cursor-pointer">Política de privacidad</span>
          </p>
        </div>
      </form>
    </AuthShell>
  )
}
