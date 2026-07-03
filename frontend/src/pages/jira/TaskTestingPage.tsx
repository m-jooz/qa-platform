import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, PlayCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { jiraStatusBadgeClass } from '../../lib/badges'
import type {
  ApiResponse,
  JiraTask,
  PaginatedResult,
  QaSubmission,
  TestCase,
  TestRun,
} from '../../types'
import ConfirmDialog from '../../components/ConfirmDialog'
import TableSkeleton from '../projects/components/TableSkeleton'
import ErrorState from '../projects/components/ErrorState'
import SubmitFailModal from './modals/SubmitFailModal'

type DraftStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED'

interface DraftResult {
  status?: DraftStatus
  actualResult: string
  notes: string
}

const STATUS_OPTIONS: {
  value: DraftStatus
  labelKey: string
  activeClassName: string
}[] = [
  {
    value: 'PASS',
    labelKey: 'status.pass',
    activeClassName: 'bg-green-600 text-white border-green-600',
  },
  {
    value: 'FAIL',
    labelKey: 'status.fail',
    activeClassName: 'bg-red-600 text-white border-red-600',
  },
  {
    value: 'BLOCKED',
    labelKey: 'status.blocked',
    activeClassName: 'bg-yellow-600 text-white border-yellow-600',
  },
  {
    value: 'SKIPPED',
    labelKey: 'status.skipped',
    activeClassName: 'bg-gray-600 text-white border-gray-600',
  },
]

const TYPE_LABEL_KEY: Record<TestCase['type'], string> = {
  MANUAL: 'testCases.methods.manual',
  E2E: 'testCases.methods.e2e',
  API: 'testCases.methods.api',
  UNIT: 'testCases.methods.unit',
  PERFORMANCE: 'testCases.methods.performance',
}

function requiresActualResult(status?: DraftStatus) {
  return status === 'FAIL' || status === 'BLOCKED'
}

export default function TaskTestingPage() {
  const { projectId, taskId } = useParams<{
    projectId: string
    taskId: string
  }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()

  const [drafts, setDrafts] = useState<Record<string, DraftResult>>({})
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<QaSubmission | null>(
    null,
  )

  const {
    data: task,
    isLoading: isLoadingTask,
    isError: isErrorTask,
    refetch: refetchTask,
  } = useQuery({
    queryKey: ['jira-task', projectId, taskId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<JiraTask>>(
        `/jira/${projectId}/tasks/${taskId}`,
      )
      return data.data
    },
    enabled: Boolean(projectId && taskId),
  })

  const {
    data: testCases,
    isLoading: isLoadingTestCases,
    isError: isErrorTestCases,
    refetch: refetchTestCases,
  } = useQuery({
    queryKey: ['test-cases', 'jira-task', taskId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<TestCase>>>(
        '/test-cases',
        { params: { jiraTaskId: taskId, limit: 100 } },
      )
      return data.data.data
    },
    enabled: Boolean(taskId),
  })

  const isLoading = isLoadingTask || isLoadingTestCases
  const isError = isErrorTask || isErrorTestCases

  const getDraft = (testCaseId: string): DraftResult =>
    drafts[testCaseId] ?? { actualResult: '', notes: '' }

  const updateDraft = (testCaseId: string, patch: Partial<DraftResult>) => {
    setDrafts((prev) => ({
      ...prev,
      [testCaseId]: { ...getDraft(testCaseId), ...patch },
    }))
  }

  const rows = testCases ?? []
  const isRowComplete = (testCase: TestCase) => {
    const draft = getDraft(testCase.id)
    if (!draft.status) return false
    if (requiresActualResult(draft.status) && !draft.actualResult.trim()) {
      return false
    }
    return true
  }

  const completedCount = rows.filter(isRowComplete).length
  const allComplete = rows.length > 0 && completedCount === rows.length
  const anyFail = rows.some((tc) => getDraft(tc.id).status === 'FAIL')
  const progressPct = rows.length
    ? Math.round((completedCount / rows.length) * 100)
    : 0

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      overallStatus: 'PASS' | 'FAIL'
      jiraAssigneeId?: string
      transitionId?: string
    }) => {
      const createdRuns = await Promise.all(
        rows.map(async (testCase) => {
          const draft = getDraft(testCase.id)
          const { data } = await api.post<ApiResponse<TestRun>>(
            '/test-runs',
            {
              testCaseId: testCase.id,
              status: draft.status,
              actualResult: draft.actualResult || undefined,
              notes: draft.notes || undefined,
            },
          )
          return data.data
        }),
      )

      const { data } = await api.post<ApiResponse<QaSubmission>>(
        `/jira/${projectId}/tasks/${taskId}/submit`,
        {
          overallStatus: payload.overallStatus,
          testRunIds: createdRuns.map((run) => run.id),
          jiraAssigneeId: payload.jiraAssigneeId,
          transitionId: payload.transitionId,
        },
      )
      return data.data
    },
    onSuccess: (submission) => {
      queryClient.invalidateQueries({ queryKey: ['qa-overview'] })
      queryClient.invalidateQueries({ queryKey: ['jira-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
      setSubmissionResult(submission)
      setShowConfirmPass(false)
      setShowFailModal(false)
      toast.success(t('jira.submissionSuccess'))
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('jira.submissionFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  if (submissionResult) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-8 py-8">
        <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-8 text-center">
          <h1 className="mb-2 text-xl font-semibold text-white">
            {submissionResult.overallStatus === 'PASS'
              ? `✅ ${t('jira.qaApprovedTitle')}`
              : `❌ ${t('jira.qaFailedTitle')}`}
          </h1>
          <p className="mb-6 text-sm text-gray-400">
            {t('jira.passCountLine', {
              passCount: submissionResult.passCount,
              totalCount: submissionResult.totalCount,
            })}
            {submissionResult.labelAdded &&
              t('jira.labelAddedSuffix', { label: submissionResult.labelAdded })}
            {submissionResult.jiraStatusAfter &&
              t('jira.jiraStatusSuffix', {
                status: submissionResult.jiraStatusAfter,
              })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {t('jira.backToDashboard')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col px-8 py-8 pb-32">
      {isLoading && <TableSkeleton columns={5} />}
      {isError && (
        <ErrorState
          onRetry={() => {
            refetchTask()
            refetchTestCases()
          }}
        />
      )}

      {!isLoading && !isError && task && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-2/5">
            <div className="sticky top-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30">
                  {task.jiraKey}
                </span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${jiraStatusBadgeClass(task.currentStatus)}`}
                >
                  {task.currentStatus ?? t('common.unknown')}
                </span>
              </div>
              <h1 className="mb-3 text-lg font-semibold text-white">
                {task.title}
              </h1>
              {task.description && (
                <p className="mb-4 whitespace-pre-wrap text-sm text-gray-400">
                  {task.description}
                </p>
              )}
              <div className="space-y-1 text-sm text-gray-400">
                <p>
                  {t('jira.assignee')}: {task.currentAssignee ?? t('common.unassigned')}
                </p>
                {task.qaRequestedByName && (
                  <p>
                    {t('jira.sentToQaBy')}: {task.qaRequestedByName}
                  </p>
                )}
              </div>
              {task.jiraUrl && (
                <a
                  href={task.jiraUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  {t('jira.viewInJira')} <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>

          <div className="lg:w-3/5">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-20 text-center">
                <PlayCircle size={36} className="mb-4 text-gray-600" />
                <p className="text-gray-400">
                  {t('jira.noTestCasesLinked')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((testCase) => {
                  const draft = getDraft(testCase.id)
                  const needsActual = requiresActualResult(draft.status)
                  return (
                    <div
                      key={testCase.id}
                      className="rounded-xl border border-gray-700 bg-gray-800 p-4"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">
                          {testCase.title}
                        </p>
                        <span className="inline-flex flex-shrink-0 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30">
                          {t(TYPE_LABEL_KEY[testCase.type])}
                        </span>
                      </div>
                      <details className="mb-2 text-xs text-gray-400">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                          {t('jira.steps')}
                        </summary>
                        <p className="mt-1 whitespace-pre-wrap">
                          {testCase.steps}
                        </p>
                      </details>
                      <p className="mb-3 text-xs text-gray-500">
                        {t('jira.expectedPrefix', { expected: testCase.expectedResult })}
                      </p>

                      <div className="mb-3 grid grid-cols-4 gap-2">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              updateDraft(testCase.id, { status: option.value })
                            }
                            className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                              draft.status === option.value
                                ? option.activeClassName
                                : 'border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300'
                            }`}
                          >
                            {t(option.labelKey)}
                          </button>
                        ))}
                      </div>

                      <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-gray-400">
                          {t('testCases.actualResult')}
                          {needsActual && (
                            <span className="text-red-400"> *</span>
                          )}
                        </label>
                        <textarea
                          rows={2}
                          value={draft.actualResult}
                          onChange={(e) =>
                            updateDraft(testCase.id, {
                              actualResult: e.target.value,
                            })
                          }
                          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">
                          {t('testCases.notes')}
                        </label>
                        <textarea
                          rows={1}
                          value={draft.notes}
                          onChange={(e) =>
                            updateDraft(testCase.id, { notes: e.target.value })
                          }
                          placeholder={t('common.optional')}
                          className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {!isLoading && !isError && task && rows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-700 bg-gray-900 px-8 py-4">
          <div className="mx-auto flex max-w-6xl items-center gap-6">
            <div className="flex-1">
              <p className="mb-1.5 text-sm text-gray-400">
                {t('jira.completedCount', {
                  completed: completedCount,
                  total: rows.length,
                })}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!allComplete}
              onClick={() =>
                anyFail ? setShowFailModal(true) : setShowConfirmPass(true)
              }
              className="flex-shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('common.submit')}
            </button>
          </div>
        </div>
      )}

      {showConfirmPass && (
        <ConfirmDialog
          title={t('jira.allPassedTitle')}
          message={t('jira.allPassedMessage')}
          confirmLabel={t('jira.submitToJira')}
          isDanger={false}
          isPending={submitMutation.isPending}
          onConfirm={() => submitMutation.mutate({ overallStatus: 'PASS' })}
          onCancel={() => setShowConfirmPass(false)}
        />
      )}

      {showFailModal && projectId && taskId && (
        <SubmitFailModal
          projectId={projectId}
          taskId={taskId}
          previousAssigneeId={task?.previousAssigneeId ?? null}
          previousAssigneeName={task?.previousAssigneeName ?? null}
          isPending={submitMutation.isPending}
          onClose={() => setShowFailModal(false)}
          onSubmit={({ jiraAssigneeId, transitionId }) =>
            submitMutation.mutate({
              overallStatus: 'FAIL',
              jiraAssigneeId,
              transitionId,
            })
          }
        />
      )}
    </div>
  )
}
