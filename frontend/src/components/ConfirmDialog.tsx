import { useTranslation } from 'react-i18next'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  isDanger?: boolean
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  isDanger = true,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-gray-800 p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
        <p className="mb-6 text-sm text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-indigo-600 hover:bg-indigo-500'
            }`}
          >
            {isPending ? t('common.pleaseWait') : confirmLabel ?? t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
