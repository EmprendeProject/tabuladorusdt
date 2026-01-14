import { Link } from 'react-router-dom'

export default function AuthShell({ title, subtitle, backTo = '/', children }) {
  return (
    <div className="dark">
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex flex-col">
        <div className="flex items-center p-4 pb-2 justify-between">
          <Link
            to={backTo}
            className="flex size-12 shrink-0 items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Volver"
            title="Volver"
          >
            <span className="text-slate-900 dark:text-white text-2xl leading-none">‹</span>
          </Link>
          <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12">
            {title}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-12">
          <div className="pt-6 pb-2">
            <h1 className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight text-center">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal pt-2 text-center">
                {subtitle}
              </p>
            ) : null}
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
