import { useNavigate } from 'react-router-dom'

export default function EmailVerificationSent() {
  const navigate = useNavigate()

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto bg-white dark:bg-background-da shadow-xl overflow-hidden">
      <div className="flex items-center p-4 justify-between sticky top-0 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md z-10">
        <div className="text-[#1b0d14] dark:text-white flex size-12 shrink-0 items-center justify-start cursor-pointer" onClick={() => navigate(-1)}>
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </div>
        <div className="flex-1"></div>
        <div className="w-12"></div>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-20">
        <div className="relative mb-10">
          <div className="w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-[64px] text-primary" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>
              mail
            </span>
          </div>
          <div className="absolute -top-1 -right-1">
            {/* <span className="material-symbols-outlined text-primary/40 text-2xl">colors_spark</span> */}
          </div>
        </div>
        <h1 className="text-[#1b0d14] dark:text-white tracking-tight text-[28px] font-extrabold leading-tight text-center mb-4">
          ¡Te enviamos un correo de verificación!
        </h1>
        <p className="text-[#1b0d14]/70 dark:text-white/70 text-base font-normal leading-relaxed text-center max-w-[280px]">
          Revisa tu bandeja de entrada o tu carpeta de Spam para confirmar tu cuenta.
        </p>
        <div className="mt-8">
          <p className="text-sm text-[#1b0d14]/50 dark:text-white/50">
            ¿No recibiste nada?{' '}
            <button className="text-primary font-bold hover:underline" type="button">
              Reenviar
            </button>
          </p>
        </div>
      </div>
      <div className="px-6 pb-12 pt-4">
        <button
          className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-14 px-4 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
          onClick={() => navigate('/login')}
        >
          <span className="truncate">Iniciar Sesión</span>
        </button>
      </div>
      <div className="fixed top-[-10%] left-[-20%] w-[80%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-[-5%] right-[-10%] w-[60%] h-[30%] bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
    </div>
  )
}
