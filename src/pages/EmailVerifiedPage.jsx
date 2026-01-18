import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, ArrowRight } from 'lucide-react'

export default function EmailVerifiedPage() {
  const containerRef = useRef(null)

  return (
    <div className="min-h-[100dvh] w-full bg-[#f8f6f7] flex items-center justify-center p-4">
      <div 
        ref={containerRef}
        className="w-full max-w-[420px] bg-white rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-500"
      >
        <div className="relative pt-12 pb-8 px-8 flex flex-col items-center text-center">
          {/* Decorative background blur */}
          <div className="absolute top-[-20%] right-[-20%] w-[200px] h-[200px] bg-[#ee2b8c]/5 rounded-full blur-[60px] pointer-events-none"></div>
          
          <div className="relative mb-8">
            <div className="size-20 rounded-full bg-[#ee2b8c]/10 flex items-center justify-center animate-bounce duration-[2000ms]">
              <CheckCircle2 size={40} className="text-[#ee2b8c]" />
            </div>
            {/* Ring ripple effect */}
            <div className="absolute inset-0 rounded-full border border-[#ee2b8c]/20 animate-ping duration-[3000ms]"></div>
          </div>

          <h1 className="text-[#1b0d14] font-['Manrope'] text-2xl font-extrabold tracking-tight mb-3">
            ¡Correo verificado!
          </h1>
          
          <p className="text-[#1b0d14]/60 font-medium text-sm leading-relaxed max-w-[280px] mb-10">
            Tu cuenta ha sido activada correctamente. Ya puedes comenzar a crear y gestionar tu catálogo digital.
          </p>

          <Link 
            to="/login" 
            className="w-full bg-[#ee2b8c] text-white font-bold text-center py-4 rounded-xl shadow-lg shadow-[#ee2b8c]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            Continuar a Iniciar Sesión
            <ArrowRight size={18} />
          </Link>
          
          <div className="mt-8 pt-6 border-t border-gray-100 w-full">
            <p className="text-xs text-[#1b0d14]/40">
              Equipo Cataly
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
