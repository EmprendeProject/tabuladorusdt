import { useState } from 'react';
import { ArrowLeft, LogIn, Shield, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { authRepository } from '../data/authRepository';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authRepository.signInWithPassword({ email, password });
    } catch (err) {
      console.error('Error login:', err);
      setError(err?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light text-[#1c0d16]">
      <div className="relative min-h-screen w-full overflow-x-hidden">
        <div className="organic-shape-1" aria-hidden="true" />
        <div className="organic-shape-2" aria-hidden="true" />

        <nav className="sticky top-0 z-50 border-b border-black/5 bg-background-light/80 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles size={20} />
              </span>
              <div className="leading-tight">
                <div className="text-base font-bold tracking-tight font-display">Cataly</div>
                <div className="text-xs text-[#1c0d16]/60 font-sans">Tu catálogo en 1 link</div>
              </div>
            </Link>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm font-semibold hover:bg-white"
              aria-label="Volver"
              title="Volver"
            >
              <ArrowLeft size={16} />
              Volver
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-6 py-10 md:py-14">
          <div className="max-w-xl mx-auto">
            <div className="glass-card rounded-2xl p-6 md:p-8 shadow-sm border border-white/40">
              <div className="flex items-center justify-center gap-2">
                <Shield className="text-primary" />
                <h1 className="font-display text-3xl font-bold tracking-tight">Acceso Admin</h1>
              </div>

              <p className="mt-3 text-center font-sans text-sm text-[#1c0d16]/70">
                Esta sección es solo para ti. El catálogo público está en <span className="font-semibold">/</span>.
              </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 text-red-700 p-3 text-sm font-sans">
            {error}
          </div>
        ) : null}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold font-sans text-[#1c0d16]/80">Correo electrónico</label>
                  <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
                      placeholder="tu@correo.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold font-sans text-[#1c0d16]/80">Contraseña</label>
                  <div className="flex items-center rounded-2xl border border-black/10 bg-white/70 px-4">
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent py-3 text-[#1c0d16] outline-none font-sans placeholder:text-[#1c0d16]/50"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-base font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                >
                  <LogIn size={18} />
                  {loading ? 'Ingresando…' : 'Entrar'}
                </button>
              </form>

              <p className="mt-4 text-center font-sans text-xs text-[#1c0d16]/60">
                Consejo: crea tu usuario en Supabase (Auth → Users) y usa esas credenciales aquí.
              </p>
            </div>
          </div>
        </div>
    </div>
  );
};

export default AdminLogin;
