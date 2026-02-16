import { Link, useNavigate } from 'react-router-dom'
import { Check, Star, ArrowRight, Zap, Globe, ShieldCheck, Rocket, RefreshCw, Palette } from 'lucide-react'
import logoNegro from '../assets/cataly logo negro.png' // Assuming there is a dark logo, otherwise use text or filter
import banner from '../assets/banner para webs.png'

// Using the requested green #dbec69
const ACCENT_GREEN = '#dbec69'

export default function SalesPage2() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white text-gray-900 font-[Manrope] selection:bg-[#dbec69] selection:text-black">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#dbec69]/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#dbec69]/20 rounded-full blur-[100px]" />
      </div>

      {/* Navbar Minimalista */}
      <nav className="fixed top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {/* If logoNegro doesn't exist, we might need a fallback. 
                For now I'll assume the logoBlanco can be inverted or just use text if image fails 
                But best to try to use a dark logo if available. 
                I'll stick to logoBlanco with a filter or just 'Cataly' text if I'm unsure. 
                The user's file structure showed `cataly logo blanco.png` and `cataly rosa.png`. 
                Maybe `cataly rosa.png` works on white? Or I can use CSS filter on logoBlanco.
            */}
             <h2 className="text-2xl font-black tracking-tighter">Cattaly</h2>
          </Link>
          <button
            onClick={() => navigate('/register')}
            className="bg-[#dbec69] hover:bg-[#d0e060] text-black text-sm font-bold px-5 py-2 rounded-full transition-all shadow-lg shadow-[#dbec69]/20 hover:shadow-[#dbec69]/40 active:scale-95"
          >
            Comenzar Gratis
          </button>
        </div>
      </nav>

      <main className="relative pt-24 pb-20 px-6">
        {/* Hero Section */}
        <section className="max-w-4xl mx-auto text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbec69]/20 border border-[#dbec69]/40 text-xs font-bold text-gray-800 mb-6 animate-fade-in-up">
            <Star size={12} className="fill-current" />
            <span>App #1 para Emprendedores Venezolanos</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] mb-8 text-gray-900">
            Multiplica tus ventas <span className="relative inline-block">
              <span className="relative z-10">con un catalogo web</span>
              <span className="absolute bottom-2 left-0 w-full h-3 bg-[#dbec69] -z-0 -rotate-1"></span>
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Crea un catálogo profesional en segundos, automatiza tus precios en dólares y el Bolívares,mientras recibes pedidos organizados directamente a tu WhatsApp.
          </p>

          <div className="w-full max-w-3xl mx-auto mb-16 overflow-hidden rounded-2xl border border-gray-200 shadow-2xl bg-gray-50">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src="https://fast.wistia.net/embed/iframe/jg8h3azu9y?seo=false&videoFoam=true"
                title="Wistia Video Player"
                allow="autoplay; fullscreen"
                allowTransparency="true"
                frameBorder="0"
                scrolling="no"
                className="absolute top-0 left-0 w-full h-full"
                name="wistia_embed"
              ></iframe>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto h-16 px-12 rounded-2xl bg-[#dbec69] text-black text-xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-[#dbec69]/20 hover:shadow-[#dbec69]/40 hover:-translate-y-1 transition-all active:translate-y-0"
            >
              Crear mi catálogo gratis
              <ArrowRight size={24} />
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Social Proof / Trust Badges (Placeholders) */}
             <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">Confían en nosotros</div>
             <div className="flex -space-x-3">
                {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] text-gray-600 font-bold">
                        {/* Placeholder generic avatar */}
                        U{i}
                    </div>
                ))}
             </div>
             <div className="text-sm font-semibold text-gray-700">+500 Emprendedores</div>
          </div>
        </section>


        {/* Benefits Grid */}
        <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-32">
            <BenefitCard
                icon={<Rocket size={24} />}
                title="Crea tu tienda en segundos"
                description="Aplicacion facil e intuitiva, Crea tu tienda en segundos y empieza a vender de inmediato."
            />
            <BenefitCard
                icon={<RefreshCw size={24} />}
                title="Tasas USDT Y BCV"
                description="El catalogo de Cattaly se actualiza automaticamente con las tasas del BCV y USDT"
            />
            <BenefitCard
                icon={<Palette size={24} />}
                title="Estilo unico"
                description="Elige entre una variedad de estilos para crear un catálogo único que se adapta a tu negocio."
            />
        </section>

        {/* Feature Highlight */}
        <section className="max-w-6xl mx-auto mb-32">
            <div className="bg-gray-50 rounded-3xl border border-gray-100 p-8 md:p-12 lg:p-16 overflow-hidden relative">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="z-10">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                          El problema de vender por WhatsApp... <span className="bg-[#dbec69] px-1">solucionado.</span>
                        </h2>
                        <ul className="space-y-4">
                            <FeatureItem text="Olvídate de enviar 50 fotos por chat." />
                            <FeatureItem text="Precios siempre actualizados a la tasa del día." />
                            <FeatureItem text="Pedidos claros, sin 'cuánto cuesta este'." />
                            <FeatureItem text="Tus clientes compran solos, tú solo despachas." />
                        </ul>
                        <div className="mt-8">
                             <button
                                onClick={() => navigate('/register')}
                                className="text-black font-bold hover:opacity-70 transition-opacity inline-flex items-center gap-1 decoration-[#dbec69] underline decoration-4 underline-offset-4"
                             >
                                Pruébalo ahora mismo <ArrowRight size={16} />
                             </button>
                        </div>
                    </div>
                    
                    {/* Visual representation of the app */}
                    <div className="relative">
                         <div className="absolute inset-0 bg-[#dbec69]/30 blur-[80px] rounded-full" />
                         <div className="relative bg-white border border-gray-100 rounded-2xl p-4 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                             {/* Mock UI */}
                             <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-2">
                                 <div className="w-20 h-4 bg-gray-100 rounded" />
                                 <div className="w-8 h-8 bg-[#dbec69] rounded-full flex items-center justify-center text-black text-xs font-bold">IV</div>
                             </div>
                             <div className="space-y-3">
                                <div className="h-16 bg-gray-50 rounded-lg flex items-center p-2 gap-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-3/4 h-3 bg-gray-200 rounded" />
                                        <div className="w-1/2 h-2 bg-gray-100 rounded" />
                                    </div>
                                </div>
                                 <div className="h-16 bg-gray-50 rounded-lg flex items-center p-2 gap-3">
                                    <div className="w-12 h-12 bg-gray-200 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <div className="w-3/4 h-3 bg-gray-200 rounded" />
                                        <div className="w-1/2 h-2 bg-gray-100 rounded" />
                                    </div>
                                </div>
                             </div>
                             <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs text-gray-400">Total estimado</span>
                                <span className="font-bold text-black">$45.00</span>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </section>

        {/* CTA Final */}
        <section className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">¿Listo para vender más?</h2>
            <p className="text-gray-600 mb-8">Únete a cientos de emprendedores que ya están digitalizando su negocio con Cataly.</p>
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto h-14 px-12 rounded-2xl bg-black text-white text-lg font-bold shadow-lg hover:bg-gray-800 transform hover:-translate-y-1 transition-all active:translate-y-0"
            >
              Comenzar prueba gratis
            </button>
             <p className="mt-4 text-xs text-gray-400">No se requiere tarjeta de crédito • Cancelas cuando quieras</p>
        </section>

        {/* Banner Final */}
        <div className="w-full max-w-6xl mx-auto mt-20 mb-[-5rem] relative z-10 select-none pointer-events-none">
            <img src={banner} alt="Banner Promocional" className="w-full h-auto drop-shadow-xl" />
        </div>

      </main>

      {/* Footer Minimal */}
      <footer className="py-8 border-t border-gray-100 text-center text-sm text-gray-400">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© {new Date().getFullYear()} Cataly. Todos los derechos reservados.</p>
            <div className="flex gap-4">
                <Link to="/privacidad" className="hover:text-black transition-colors">Privacidad</Link>
                <Link to="/terminos" className="hover:text-black transition-colors">Términos</Link>
            </div>
        </div>
      </footer>
    </div>
  )
}

function BenefitCard({ icon, title, description }) {
    return (
        <div className="bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-2xl p-8 transition-colors group">
            <div className="w-12 h-12 rounded-xl bg-[#dbec69] text-black flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">{title}</h3>
            <p className="text-gray-600 leading-relaxed text-sm">
                {description}
            </p>
        </div>
    )
}

function FeatureItem({ text }) {
    return (
        <li className="flex items-start gap-3">
             <div className="mt-1 w-5 h-5 rounded-full bg-[#dbec69]/30 flex items-center justify-center shrink-0">
                <Check size={12} className="text-black" strokeWidth={3} />
             </div>
             <span className="text-gray-700">{text}</span>
        </li>
    )
}
