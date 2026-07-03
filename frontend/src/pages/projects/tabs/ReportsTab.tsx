import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Copy, FileText, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../api/client'
import type { ApiResponse, Report } from '../../../types'
import TableSkeleton from '../components/TableSkeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'

interface ReportsTabProps {
  projectId: string
}

export default function ReportsTab({ projectId }: ReportsTabProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const {
    data: reports,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Report[]>>('/reports', {
        params: { projectId },
      })
      return data.data
    },
  })

  const { mutate: generate, isPending: isGenerating } = useMutation({
    mutationFn: () =>
      api.post('/reports/generate', {
        projectId,
        title: t('reports.reportTitleWithDate', {
          date: new Date().toLocaleString(),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports', projectId] })
      toast.success(t('reports.reportGenerated'))
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('reports.generateFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const handleCopyLink = async (shareToken: string) => {
    const url = `${window.location.origin}/reports/share/${shareToken}`
    await navigator.clipboard.writeText(url)
    toast.success(t('common.copied'))
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => generate()}
          disabled={isGenerating}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plus size={16} />
          )}
          {t('reports.generateReport')}
        </button>
      </div>

      {isLoading && <TableSkeleton columns={4} />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && reports && reports.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t('reports.noReportsYet')}
        />
      )}

      {!isLoading && !isError && reports && reports.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('common.title')}</th>
                <th className="px-4 py-3">{t('reports.generatedBy')}</th>
                <th className="px-4 py-3">{t('common.date')}</th>
                <th className="px-4 py-3">{t('reports.shareLink')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-800">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-white">{report.title}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {report.creator.name}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(report.shareToken)}
                      aria-label={t('reports.copyShareLink')}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700 hover:text-white"
                    >
                      <Copy size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
