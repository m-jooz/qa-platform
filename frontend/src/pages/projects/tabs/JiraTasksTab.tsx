import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Loader2, RefreshCw, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../../api/client'
import { jiraStatusBadgeClass, QA_STATUS_BADGE } from '../../../lib/badges'
import { formatRelativeTime } from '../../../lib/formatRelativeTime'
import { useDebouncedValue } from '../../../lib/useDebouncedValue'
import type { ApiResponse, JiraTask, PaginatedResult } from '../../../types'
import Pagination from '../../../components/Pagination'
import TableSkeleton from '../components/TableSkeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import JiraTaskPanel from '../components/JiraTaskPanel'

interface JiraTasksTabProps {
  projectId: string
}

const QA_STATUS_KEY: Record<string, string> = {
  NOT_STARTED: 'status.notStarted',
  IN_PROGRESS: 'status.inProgress',
  SUBMITTED: 'status.submitted',
  FAILED: 'status.failed',
}

export default function JiraTasksTab({ projectId }: JiraTasksTabProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedTask, setSelectedTask] = useState<JiraTask | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['jira-tasks', projectId, page, debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<JiraTask>>>(
        `/jira/${projectId}/tasks`,
        { params: { page, limit: 20, search: debouncedSearch || undefined } },
      )
      return data.data
    },
  })
  const tasks = result?.data

  const { mutate: sync, isPending: isSyncing } = useMutation({
    mutationFn: () => api.post(`/jira/${projectId}/sync`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-tasks', projectId] })
      toast.success(t('jira.syncSuccess'))
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('jira.syncFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const { mutate: markSeen } = useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/jira/${projectId}/tasks/${taskId}/seen`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jira-tasks', projectId] })
    },
  })

  const handleRowClick = (task: JiraTask) => {
    setSelectedTask(task)
    if (task.unseen) markSeen(task.id)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('jira.searchPlaceholder')}
            className="w-56 rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={() => sync()}
          disabled={isSyncing}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSyncing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {t('jira.syncFromJira')}
        </button>
      </div>

      {isLoading && <TableSkeleton columns={6} />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && tasks && tasks.length === 0 && debouncedSearch && (
        <EmptyState icon={Search} title={t('jira.noTasksMatch')} />
      )}

      {!isLoading && !isError && tasks && tasks.length === 0 && !debouncedSearch && (
        <EmptyState
          icon={ClipboardList}
          title={t('jira.noTasksYet')}
        />
      )}

      {!isLoading && !isError && tasks && tasks.length > 0 && (
        <>
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="w-2" />
                <th className="px-4 py-3">{t('jira.key')}</th>
                <th className="px-4 py-3">{t('common.title')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3">{t('jira.assignee')}</th>
                <th className="px-4 py-3">{t('jira.sentToQaBy')}</th>
                <th className="px-4 py-3">{t('jira.qaStatus')}</th>
                <th className="px-4 py-3">{t('jira.lastUpdated')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-800">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => handleRowClick(task)}
                  className="cursor-pointer hover:bg-gray-750"
                >
                  <td className="pl-4">
                    {task.unseen && (
                      <span className="block h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30">
                      {task.jiraKey}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white">{task.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${jiraStatusBadgeClass(task.currentStatus)}`}
                    >
                      {task.currentStatus ?? t('common.unknown')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {task.currentAssignee ?? t('common.unassigned')}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {task.qaRequestedByName ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${QA_STATUS_BADGE[task.qaStatus]}`}
                    >
                      {t(QA_STATUS_KEY[task.qaStatus])}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {formatRelativeTime(task.jiraUpdatedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {task.currentStatus === 'Testing' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/jira/${projectId}/tasks/${task.id}/test`)
                        }}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                      >
                        {t('jira.startTesting')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={result!.page}
          totalPages={result!.totalPages}
          onPageChange={setPage}
        />
        </>
      )}

      {selectedTask && (
        <JiraTaskPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
