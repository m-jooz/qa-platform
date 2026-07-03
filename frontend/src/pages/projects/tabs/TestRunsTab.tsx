import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PlayCircle } from 'lucide-react'
import api from '../../../api/client'
import { TEST_RUN_STATUS_BADGE } from '../../../lib/badges'
import { useAuthStore } from '../../../store/auth.store'
import type {
  ApiResponse,
  PaginatedResult,
  TestCase,
  TestRun,
} from '../../../types'
import TableSkeleton from '../components/TableSkeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import ApproveBugModal from '../modals/ApproveBugModal'
import RejectBugModal from '../modals/RejectBugModal'

interface TestRunsTabProps {
  projectId: string
}

function BugCell({ testRun }: { testRun: TestRun }) {
  const { t } = useTranslation()
  if (!testRun.isBug) return <span className="text-gray-500">-</span>
  if (testRun.bugStatus === 'PENDING') {
    return <span className="text-orange-400">🐛 {t('testRuns.bugPending')}</span>
  }
  if (testRun.bugStatus === 'APPROVED') {
    return <span className="text-green-400">✅ {t('testRuns.bugApproved')}</span>
  }
  if (testRun.bugStatus === 'REJECTED') {
    return <span className="text-red-400">❌ {t('testRuns.bugRejected')}</span>
  }
  return <span className="text-gray-500">-</span>
}

export default function TestRunsTab({ projectId }: TestRunsTabProps) {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const canReview = user?.role === 'ADMIN' || user?.role === 'LEAD'
  const [approveTestRunId, setApproveTestRunId] = useState<string | null>(
    null,
  )
  const [rejectTestRunId, setRejectTestRunId] = useState<string | null>(null)

  const {
    data: testCases,
    isLoading: isLoadingTestCases,
    isError: isErrorTestCases,
    refetch: refetchTestCases,
  } = useQuery({
    queryKey: ['test-cases', projectId, 'all'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<TestCase>>>(
        '/test-cases',
        { params: { projectId, limit: 100 } },
      )
      return data.data.data
    },
  })

  const testRunQueries = useQueries({
    queries: (testCases ?? []).map((testCase) => ({
      queryKey: ['test-runs', testCase.id, 'all'],
      queryFn: async () => {
        const { data } = await api.get<ApiResponse<PaginatedResult<TestRun>>>(
          '/test-runs',
          { params: { testCaseId: testCase.id, limit: 100 } },
        )
        return data.data.data
      },
      enabled: Boolean(testCases),
    })),
  })

  const isLoading =
    isLoadingTestCases || testRunQueries.some((q) => q.isLoading)
  const isError = isErrorTestCases || testRunQueries.some((q) => q.isError)

  const allRuns = testRunQueries
    .flatMap((q) => q.data ?? [])
    .sort(
      (a, b) =>
        new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
    )

  const handleRetry = () => {
    refetchTestCases()
    testRunQueries.forEach((q) => q.refetch())
  }

  return (
    <div>
      {isLoading && <TableSkeleton columns={6} />}

      {isError && <ErrorState onRetry={handleRetry} />}

      {!isLoading && !isError && allRuns.length === 0 && (
        <EmptyState
          icon={PlayCircle}
          title={t('testRuns.noTestRunsYet')}
        />
      )}

      {!isLoading && !isError && allRuns.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('testRuns.testCase')}</th>
                <th className="px-4 py-3">{t('common.status')}</th>
                <th className="px-4 py-3">{t('testRuns.severity')}</th>
                <th className="px-4 py-3">{t('testRuns.bug')}</th>
                <th className="px-4 py-3">{t('testRuns.executedBy')}</th>
                <th className="px-4 py-3">{t('common.date')}</th>
                {canReview && <th className="px-4 py-3">{t('testRuns.review')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-800">
              {allRuns.map((run) => (
                <tr key={run.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-white">
                    {run.testCase.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TEST_RUN_STATUS_BADGE[run.status]}`}
                    >
                      {t(`status.${run.status.toLowerCase()}`)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {run.severity ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <BugCell testRun={run} />
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {run.executor.name}
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(run.executedAt).toLocaleDateString()}
                  </td>
                  {canReview && (
                    <td className="px-4 py-3">
                      {run.isBug && run.bugStatus === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setApproveTestRunId(run.id)}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-500"
                          >
                            {t('common.approve')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectTestRunId(run.id)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                          >
                            {t('common.reject')}
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {approveTestRunId && (
        <ApproveBugModal
          testRunId={approveTestRunId}
          onClose={() => setApproveTestRunId(null)}
        />
      )}

      {rejectTestRunId && (
        <RejectBugModal
          testRunId={rejectTestRunId}
          onClose={() => setRejectTestRunId(null)}
        />
      )}
    </div>
  )
}
