import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ExternalLink, Play } from 'lucide-react'
import api from '../../api/client'
import { PLATFORM_BADGE, PRIORITY_BADGE, TEST_RUN_STATUS_BADGE } from '../../lib/badges'
import type {
  ApiResponse,
  PaginatedResult,
  TestCaseDetail,
  TestRun,
} from '../../types'
import ErrorState from '../projects/components/ErrorState'
import EmptyState from '../projects/components/EmptyState'
import TableSkeleton from '../projects/components/TableSkeleton'
import Pagination from '../../components/Pagination'
import RunTestModal from '../projects/modals/RunTestModal'

const TYPE_BADGE: Record<TestCaseDetail['type'], string> = {
  MANUAL: 'bg-gray-500/10 text-gray-300 border border-gray-500/30',
  E2E: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30',
  API: 'bg-teal-500/10 text-teal-400 border border-teal-500/30',
  UNIT: 'bg-pink-500/10 text-pink-400 border border-pink-500/30',
  PERFORMANCE: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="mb-1 text-xs uppercase text-gray-500">{label}</p>
      <p className="text-sm font-medium text-white">{value}</p>
    </div>
  )
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

function truncate(text: string | null, length: number): string {
  if (!text) return '-'
  return text.length > length ? `${text.slice(0, length)}…` : text
}

export default function TestCaseDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [isRunModalOpen, setIsRunModalOpen] = useState(false)
  const [runsPage, setRunsPage] = useState(1)

  useEffect(() => {
    if (id) document.title = `${t('testCases.detailTitle')} — QA Platform`
  }, [id, t])

  const {
    data: testCase,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['test-case', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TestCaseDetail>>(
        `/test-cases/${id}`,
      )
      return data.data
    },
    enabled: Boolean(id),
  })

  const {
    data: runsResult,
    isLoading: isLoadingRuns,
    isError: isErrorRuns,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ['test-runs', id, runsPage],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<TestRun>>>(
        '/test-runs',
        { params: { testCaseId: id, page: runsPage, limit: 10 } },
      )
      return data.data
    },
    enabled: Boolean(id),
  })
  const testRuns = runsResult?.data

  if (!id) return null

  const steps = testCase
    ? testCase.steps.split('\n').filter((step) => step.trim().length > 0)
    : []

  const latestFailRun = testRuns?.find((run) => run.status === 'FAIL')
  const attachments =
    latestFailRun?.attachments.filter((a) => a.type === 'IMAGE') ?? []

  return (
    <div className="px-8 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        {t('testCases.back')}
      </button>

      {isLoading && (
        <div className="animate-pulse">
          <div className="h-8 w-64 rounded bg-gray-800" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && testCase && (
        <>
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="mb-3 text-2xl font-semibold text-white">
                {testCase.title}
              </h1>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_BADGE[testCase.platform]}`}
                >
                  {t(`common.platforms.${testCase.platform.toLowerCase()}`)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[testCase.type]}`}
                >
                  {t(`testCases.methods.${testCase.type.toLowerCase()}`)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[testCase.priority]}`}
                >
                  {t(`common.priorities.${testCase.priority.toLowerCase()}`)}
                </span>
              </div>
              {testCase.jiraTask ? (
                <a
                  href={testCase.jiraTask.jiraUrl ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20"
                >
                  {testCase.jiraTask.jiraKey}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <span className="text-sm text-gray-500">
                  {t('testCases.noJiraTaskLinked')}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsRunModalOpen(true)}
              className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
            >
              <Play size={18} />
              {t('testCases.run')}
            </button>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <InfoCard label={t('testCases.createdBy')} value={testCase.creator.name} />
            <InfoCard
              label={t('testCases.createdAt')}
              value={new Date(testCase.createdAt).toLocaleDateString()}
            />
            <InfoCard label={t('testCases.project')} value={testCase.project.name} />
          </div>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">
              {t('testCases.testSteps')}
            </h2>
            <ol className="space-y-2">
              {steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-lg bg-gray-800 p-3"
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-300">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">
              {t('testCases.expectedResult')}
            </h2>
            <div className="rounded-lg border-l-4 border-green-500 bg-gray-800 p-4 text-sm text-white">
              {testCase.expectedResult}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-white">
              {t('testCases.testRunHistory')}
            </h2>

            {isLoadingRuns && <TableSkeleton columns={6} />}

            {isErrorRuns && <ErrorState onRetry={() => refetchRuns()} />}

            {!isLoadingRuns && !isErrorRuns && testRuns && testRuns.length === 0 && (
              <EmptyState
                icon={Play}
                title={t('testCases.noTestRunsClickRunTest')}
              />
            )}

            {!isLoadingRuns && !isErrorRuns && testRuns && testRuns.length > 0 && (
              <>
              <div className="overflow-hidden rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">{t('common.status')}</th>
                      <th className="px-4 py-3">{t('testCases.actualResult')}</th>
                      <th className="px-4 py-3">{t('testRuns.severity')}</th>
                      <th className="px-4 py-3">{t('testRuns.bug')}</th>
                      <th className="px-4 py-3">{t('testRuns.executedBy')}</th>
                      <th className="px-4 py-3">{t('common.date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800">
                    {testRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TEST_RUN_STATUS_BADGE[run.status]}`}
                          >
                            {t(`status.${run.status.toLowerCase()}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {truncate(run.actualResult, 50)}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={runsResult!.page}
                totalPages={runsResult!.totalPages}
                onPageChange={setRunsPage}
              />
              </>
            )}
          </section>

          {attachments.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">
                {t('testCases.attachments')}
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {attachments.map((attachment) => {
                  const url = `${import.meta.env.VITE_API_URL}${attachment.fileUrl}`
                  return (
                    <a
                      key={attachment.id}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-lg border border-gray-700 transition-colors hover:border-indigo-500"
                    >
                      <img
                        src={url}
                        alt={t('testCases.attachmentAlt')}
                        className="h-32 w-full object-cover"
                      />
                    </a>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {isRunModalOpen && (
        <RunTestModal testCaseId={id} onClose={() => setIsRunModalOpen(false)} />
      )}
    </div>
  )
}
