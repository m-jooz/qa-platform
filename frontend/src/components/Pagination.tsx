import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  return (
    <div className="mt-4 flex items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={t('common.previousPage')}
        className="rounded-lg border border-gray-700 p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm text-gray-400">
        {t('common.pageOf', { page, totalPages })}
      </span>
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={t('common.nextPage')}
        className="rounded-lg border border-gray-700 p-1.5 text-gray-400 hover:bg-gray-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
