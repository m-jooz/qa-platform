import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, FileText, Loader2, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import type { ApiResponse, PaginatedResult, Project, Report } from '../../types'
import TableSkeleton from '../projects/components/TableSkeleton'
import EmptyState from '../projects/components/EmptyState'
import ErrorState from '../projects/components/ErrorState'

export default function ReportsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )

  useEffect(() => {
    document.title = `${t('reports.title')} — QA Platform`
  }, [t])

  const { data: projects } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Project>>>(
        '/projects',
        { params: { limit: 100 } },
      )
      return data.data.data
    },
  })

  const {
    data: reports,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['reports', selectedProjectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Report[]>>('/reports', {
        params: { projectId: selectedProjectId },
      })
      return data.data
    },
    enabled: Boolean(selectedProjectId),
  })

  const { mutate: generate, isPending: isGenerating } = useMutation({
    mutationFn: () =>
      api.post('/reports/generate', {
        projectId: selectedProjectId,
        title: t('reports.reportTitleWithDate', { date: new Date().toLocaleString() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['reports', selectedProjectId],
      })
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
    <div className="px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t('reports.title')}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {t('reports.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId ?? ''}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">{t('common.selectAProject')}</option>
            {projects?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          {selectedProjectId && (
            <button
              type="button"
              onClick={() => generate()}
              disabled={isGenerating}
              className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              {t('reports.generateReport')}
            </button>
          )}
        </div>
      </div>

      {!selectedProjectId && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-24 text-center">
          <p className="text-gray-400">
            {t('reports.selectProjectPrompt')}
          </p>
        </div>
      )}

      {selectedProjectId && isLoading && <TableSkeleton columns={4} />}

      {selectedProjectId && isError && <ErrorState onRetry={() => refetch()} />}

      {selectedProjectId && !isLoading && !isError && reports && reports.length === 0 && (
        <EmptyState
          icon={FileText}
          title={t('reports.noReportsYet')}
        />
      )}

      {selectedProjectId && !isLoading && !isError && reports && reports.length > 0 && (
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
