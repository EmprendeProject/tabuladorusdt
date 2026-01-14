import { X } from 'lucide-react'

const typeStyles = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

export default function ToastStack({ toasts, onDismiss }) {
  if (!toasts?.length) return null

  return (
    <div className="fixed top-4 right-4 z-[90] w-[min(92vw,380px)] space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rounded-2xl border shadow-lg backdrop-blur px-4 py-3 ${typeStyles[t.type] || typeStyles.info}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {t.title ? (
                <div className="text-sm font-semibold leading-5">{t.title}</div>
              ) : null}
              {t.message ? (
                <div className="text-sm leading-5 opacity-90 break-words">{t.message}</div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss?.(t.id)}
              className="p-1 -mr-1 rounded-xl hover:bg-black/5"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
