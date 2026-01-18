import { Link } from 'react-router-dom'
import { Check, Sparkles, PartyPopper, ArrowRight, LayoutGrid } from 'lucide-react'

export default function EmailVerifiedPage() {
  return (
    <div className="min-h-[100dvh] w-full bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-[#fff0f7]/80 pointer-events-none" />

      {/* Shapes Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[250px] h-[250px] bg-[#ee2b8c]/5 rounded-full blur-[60px] pointer-events-none" />
      <div className="absolute bottom-[5%] right-[-5%] w-[200px] h-[200px] bg-[#ee2b8c]/10 rounded-full blur-[50px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[480px] mx-auto min-h-[100dvh] flex flex-col">
        {/* Header */}
        <div className="pt-12 pb-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="size-8 bg-[#ee2b8c] rounded-lg flex items-center justify-center shadow-lg shadow-[#ee2b8c]/20">
              <LayoutGrid size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-[#1b0d14] font-['Manrope']">
              Cataly
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center pb-20">
          
          {/* Hero Icon */}
          <div className="relative mb-10">
            {/* Glow backing */}
            <div className="absolute inset-0 bg-[#ee2b8c]/10 rounded-full blur-[40px] scale-150" />
            
            <div className="relative size-32 rounded-full bg-white shadow-2xl shadow-[#ee2b8c]/20 flex items-center justify-center border-4 border-[#fff0f7]">
              <div className="size-24 rounded-full bg-[#ee2b8c] flex items-center justify-center shadow-inner">
                <Check size={56} className="text-white" strokeWidth={4} />
              </div>

              {/* Particles */}
              <div className="absolute top-0 -right-4 size-3 rounded-full bg-[#ee2b8c]/40 blur-[1px] animate-pulse" />
              <div className="absolute bottom-4 -left-6 size-2 rounded-full bg-[#ee2b8c]/30 blur-[1px]" />
              <div className="absolute -top-8 left-4 size-4 rounded-full bg-[#ee2b8c]/20 blur-[1px]" />
              
              {/* Floating Icons */}
              <Sparkles 
                size={28} 
                className="absolute -top-4 -right-8 text-[#ee2b8c]/40 animate-bounce duration-[3000ms]" 
              />
              <PartyPopper 
                size={24} 
                className="absolute bottom-0 -left-10 text-[#ee2b8c]/30 -rotate-12" 
              />
            </div>
          </div>

          <h1 className="text-[#1b0d14] tracking-tight text-3xl font-extrabold leading-tight mb-4 font-['Manrope']">
            ¡Tu correo ha sido verificado!
          </h1>
          
          <p className="text-[#1b0d14]/60 text-lg font-medium leading-relaxed mb-12 max-w-[320px] font-['Manrope']">
            ¡Todo listo! Ahora es momento de hacer crecer tu negocio. Crea tu primer catálogo en segundos.
          </p>

          <Link 
            to="/login"
            className="w-full max-w-[320px] bg-[#ee2b8c] text-white py-5 px-8 rounded-2xl font-bold text-lg shadow-2xl shadow-[#ee2b8c]/30 active:scale-[0.97] hover:scale-[1.02] transition-all flex items-center justify-center gap-3 font-['Manrope']"
          >
            <span>¡Crear mi catálogo!</span>
            <ArrowRight size={24} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    </div>
  )
}
