import { Link, useNavigate } from 'react-router-dom'
import { Check, Star, ArrowRight, Zap, Globe, ShieldCheck } from 'lucide-react'
import logoBlanco from '../assets/cataly logo blanco.png'

export default function SalesPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0f050a] text-white font-[Manrope] selection:bg-primary/30 selection:text-white">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
      </div>

      {/* Navbar Minimalista */}
      <nav className="fixed top-0 z-50 w-full bg-[#0f050a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src={logoBlanco} alt="Cataly" className="h-6 w-auto object-contain" />
          </Link>
          <button
            onClick={() => navigate('/register')}
            className="bg-primary hover:bg-primary/90 text-white text-sm font-bold px-5 py-2 rounded-full transition-all shadow-[0_0_15px_rgba(255,51,153,0.3)] hover:shadow-[0_0_25px_rgba(255,51,153,0.5)] active:scale-95"
          >
            Comenzar Gratis
          </button>
        </div>
      </nav>

      <main className="relative pt-24 pb-20 px-6">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary mb-6 animate-fade-in-up">
            <Star size={12} className="fill-current" />
            <span>La solución #1 para ventas en WhatsApp</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-8 bg-clip-text text-transparent bg-gradient-to-br from-white via-white to-white/60">
            Convierte tus chats en <span className="text-primary">ventas reales</span>
          </h1>

          <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crea un catálogo profesional en segundos, automatiza tus precios en dólares y recibe pedidos organizados directamente a tu WhatsApp. Sin comisiones por venta.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-primary text-white text-lg font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(255,51,153,0.4)] hover:shadow-[0_6px_30px_rgba(255,51,153,0.6)] hover:-translate-y-1 transition-all active:translate-y-0"
            >
              Crear mi catálogo gratis
              <ArrowRight size={20} />
            </button>
            <button
               onClick={() => navigate('/precios')}
              className="w-full sm:w-auto h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-semibold transition-colors flex items-center justify-center"
            >
              Ver planes
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Social Proof / Trust Badges (Placeholders) */}
             <div className="text-xs font-medium text-white/40 uppercase tracking-widest">Confían en nosotros</div>
             <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-[#0f050a] flex items-center justify-center text-[10px] text-white/50">
                        {/* Placeholder generic avatar */}
                        U{i}
                    </div>
                ))}
             </div>
             <div className="text-sm font-semibold">+500 Emprendedores</div>
          </div>
        </section>


        {/* Benefits Grid */}
        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
            <BenefitCard
                icon={<Zap size={24} />}
                title="Súper Rápido"
                description="Tu tienda carga al instante. Tus clientes no esperan, tus ventas tampoco."
            />
            <BenefitCard
                icon={<Globe size={24} />}
                title="Dominio Propio"
                description="Proyecta profesionalismo con un enlace personalizado para tu negocio."
            />
            <BenefitCard
                icon={<ShieldCheck size={24} />}
                title="Inventario Real"
                description="Controla tu stock automáticamente. Si se acaba, no se vende."
            />
        </section>

        {/* Feature Highlight */}
        <section className="max-w-6xl mx-auto mb-32">
            <div className="bg-gradient-to-b from-[#1a0b14] to-[#0f050a] rounded-3xl border border-white/5 p-8 md:p-12 lg:p-16 overflow-hidden relative">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="z-10">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">El problema de vender por WhatsApp... <span className="text-primary">solucionado.</span></h2>
                        <ul className="space-y-4">
                            <FeatureItem text="Olvídate de enviar 50 fotos por chat." />
                            <FeatureItem text="Precios siempre actualizados a la tasa del día." />
                            <FeatureItem text="Pedidos claros, sin 'cuánto cuesta este'." />
                            <FeatureItem text="Tus clientes compran solos, tú solo despachas." />
                        </ul>
                        <div className="mt-8">
                             <button
                                onClick={() => navigate('/register')}
                                className="text-primary font-bold hover:text-white transition-colors inline-flex items-center gap-1"
                             >
                                Pruébalo ahora mismo <ArrowRight size={16} />
                             </button>
                        </div>
                    </div>
                    
                    {/* Visual representation of the app */}
                    <div className="relative">
                         <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full" />
                         <div className="relative bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                             {/* Mock UI */}
                             <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                                 <div className="w-20 h-4 bg-white/10 rounded" />
                                 <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-xs">IV</div>
                             </div>
                             <div className="space-y-3">
                                <div className="h-16 bg-white/5 rounded-lg flex items-center p-2 gap-3">
                                    <div className="w-12 h-12 bg-white/10 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-3/4 h-3 bg-white/10 rounded" />
                                        <div className="w-1/2 h-2 bg-white/5 rounded" />
                                    </div>
                                </div>
                                 <div className="h-16 bg-white/5 rounded-lg flex items-center p-2 gap-3">
                                    <div className="w-12 h-12 bg-white/10 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-3/4 h-3 bg-white/10 rounded" />
                                        <div className="w-1/2 h-2 bg-white/5 rounded" />
                                    </div>
                                </div>
                             </div>
                             <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-xs text-white/40">Total estimado</span>
                                <span className="font-bold text-primary">$45.00</span>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Final */}
        <section className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">¿Listo para vender más?</h2>
            <p className="text-white/60 mb-8">Únete a cientos de emprendedores que ya están digitalizando su negocio con Cataly.</p>
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto h-14 px-12 rounded-2xl bg-white text-black text-lg font-bold shadow-lg hover:bg-gray-100 transform hover:-translate-y-1 transition-all active:translate-y-0"
            >
              Comenzar prueba gratis
            </button>
             <p className="mt-4 text-xs text-white/30">No se requiere tarjeta de crédito • Cancelas cuando quieras</p>
        </section>

      </main>

      {/* Footer Minimal */}
      <footer className="py-8 border-t border-white/5 text-center text-sm text-white/30">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} Cataly. Todos los derechos reservados.</p>
            <div className="flex gap-4">
                <Link to="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
                <Link to="/terminos" className="hover:text-white transition-colors">Términos</Link>
            </div>
        </div>
      </footer>
    </div>
  )
}

function BenefitCard({ icon, title, description }) {
    return (
        <div className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-8 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
            <p className="text-white/60 leading-relaxed text-sm">
                {description}
            </p>
        </div>
    )
}

function FeatureItem({ text }) {
    return (
        <li className="flex items-start gap-3">
             <div className="mt-1 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                <Check size={12} className="text-green-500" strokeWidth={3} />
             </div>
             <span className="text-white/80">{text}</span>
        </li>
    )
}
