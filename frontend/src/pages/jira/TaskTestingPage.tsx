import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, Pencil, PlayCircle, RotateCw, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import {
  jiraStatusBadgeClass,
  PLATFORM_BADGE,
  PRIORITY_BADGE,
} from '../../lib/badges'
import { invalidateQaData } from '../../lib/invalidateQaData'
import { useAuthStore } from '../../store/auth.store'
import type {
  ApiResponse,
  JiraTask,
  PaginatedResult,
  Project,
  QaSubmission,
  QaSubmissionSummary,
  TestCase,
  TestRun,
} from '../../types'
import ConfirmDialog from '../../components/ConfirmDialog'
import TableSkeleton from '../projects/components/TableSkeleton'
import ErrorState from '../projects/components/ErrorState'
import SubmitFailModal from './modals/SubmitFailModal'
import ConfirmPassModal from './modals/ConfirmPassModal'
import InlineAddTestCase from './components/InlineAddTestCase'
import EditTestCaseModal from './modals/EditTestCaseModal'

type DraftStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED'

interface DraftResult {
  status?: DraftStatus
  actualResult: string
  notes: string
}

const STATUS_OPTIONS: {
  value: DraftStatus
  labelKey: string
  emoji: string
  activeClassName: string
}[] = [
  {
    value: 'PASS',
    labelKey: 'status.pass',
    emoji: '✅',
    activeClassName: 'bg-green-600 text-white border-green-600',
  },
  {
    value: 'FAIL',
    labelKey: 'status.fail',
    emoji: '❌',
    activeClassName: 'bg-red-600 text-white border-red-600',
  },
  {
    value: 'BLOCKED',
    labelKey: 'status.blocked',
    emoji: '⚠',
    activeClassName: 'bg-yellow-600 text-white border-yellow-600',
  },
  {
    value: 'SKIPPED',
    labelKey: 'status.skipped',
    emoji: '⏭',
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

const PRIORITY_EMOJI: Record<TestCase['priority'], string> = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🔵',
}

function requiresActualResult(status?: DraftStatus) {
  return status === 'FAIL' || status === 'BLOCKED'
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function countSteps(steps: string) {
  return steps.split('\n').filter((line) => line.trim().length > 0).length
}

export default function TaskTestingPage() {
  const { projectId, taskId } = useParams<{
    projectId: string
    taskId: string
  }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)

  const [drafts, setDrafts] = useState<Record<string, DraftResult>>({})
  const [preparedRunIds, setPreparedRunIds] = useState<string[] | null>(null)
  const [previewComment, setPreviewComment] = useState('')
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [showFailModal, setShowFailModal] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<QaSubmission | null>(
    null,
  )
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null)
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null)

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

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Project>>(
        `/projects/${projectId}`,
      )
      return data.data
    },
    enabled: Boolean(projectId),
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

  const rows = testCases ?? []

  const previousRunQueries = useQueries({
    queries: rows.map((testCase) => ({
      queryKey: ['test-runs', testCase.id, 'latest'],
      queryFn: async () => {
        const { data } = await api.get<ApiResponse<PaginatedResult<TestRun>>>(
          '/test-runs',
          { params: { testCaseId: testCase.id, limit: 1, page: 1 } },
        )
        return data.data
      },
    })),
  })

  const { data: taskSubmissions } = useQuery({
    queryKey: ['reports-submissions', 'task-history', projectId, taskId],
    queryFn: async () => {
      const { data } = await api.get<
        ApiResponse<PaginatedResult<QaSubmissionSummary>>
      >('/reports/submissions', {
        params: { projectId, jiraTaskId: taskId, limit: 100 },
      })
      return data.data
    },
    enabled: Boolean(projectId && taskId),
  })

  const previousSubmissionsCount = taskSubmissions?.total ?? 0
  const submissionHistory = [...(taskSubmissions?.data ?? [])].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  )
  const latestSubmission = submissionHistory[submissionHistory.length - 1] ?? null
  const currentRunNumber = previousSubmissionsCount + 1

  const isLoading = isLoadingTask || isLoadingTestCases
  const isError = isErrorTask || isErrorTestCases

  const getDraft = (testCaseId: string): DraftResult =>
    drafts[testCaseId] ?? { actualResult: '', notes: '' }

  const updateDraft = (testCaseId: string, patch: Partial<DraftResult>) => {
    setDrafts((prev) => ({
      ...prev,
      [testCaseId]: { ...getDraft(testCaseId), ...patch },
    }))
    setPreparedRunIds(null)
  }

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
  const overallStatus: 'PASS' | 'FAIL' = anyFail ? 'FAIL' : 'PASS'

  const getPreviousRunInfo = (index: number) => {
    const result = previousRunQueries[index]?.data
    const total = result?.total ?? 0
    const latestRun = result?.data[0] ?? null
    return { total, latestRun }
  }

  const canModifyTestCase = (testCase: TestCase) =>
    user?.role === 'ADMIN' ||
    user?.role === 'LEAD' ||
    testCase.createdBy === user?.id

  const prepareMutation = useMutation({
    mutationFn: async () => {
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
      const testRunIds = createdRuns.map((run) => run.id)

      const { data } = await api.post<
        ApiResponse<{ comment: string; passCount: number; failCount: number; totalCount: number }>
      >(`/jira/${projectId}/tasks/${taskId}/submit/preview`, {
        overallStatus,
        testRunIds,
      })

      return { testRunIds, comment: data.data.comment }
    },
    onSuccess: ({ testRunIds, comment }) => {
      setPreparedRunIds(testRunIds)
      setPreviewComment(comment)
      if (anyFail) {
        setShowFailModal(true)
      } else {
        setShowConfirmPass(true)
      }
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('jira.submissionFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const handleOpenSubmit = () => {
    if (preparedRunIds) {
      if (anyFail) setShowFailModal(true)
      else setShowConfirmPass(true)
      return
    }
    prepareMutation.mutate()
  }

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      jiraAssigneeId?: string
      transitionId?: string
      commentOverride?: string
    }) => {
      const { data } = await api.post<ApiResponse<QaSubmission>>(
        `/jira/${projectId}/tasks/${taskId}/submit`,
        {
          overallStatus,
          testRunIds: preparedRunIds ?? [],
          jiraAssigneeId: payload.jiraAssigneeId,
          transitionId: payload.transitionId,
          commentOverride: payload.commentOverride,
        },
      )
      return data.data
    },
    onSuccess: (submission) => {
      invalidateQaData(queryClient)
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/test-cases/${id}`),
    onSuccess: () => {
      invalidateQaData(queryClient)
      toast.success(t('testCases.testCaseDeleted'))
      setDeletingTestCase(null)
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('testCases.deleteFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
      setDeletingTestCase(null)
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
        <>
          {previousSubmissionsCount > 0 && latestSubmission?.overallStatus === 'FAIL' && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-300">
              <RotateCw size={16} className="mt-0.5 flex-shrink-0" />
              <p>
                {t('jira.retestBanner', {
                  n: previousSubmissionsCount,
                  date: new Date(latestSubmission.submittedAt).toLocaleDateString(),
                  tester: latestSubmission.user.name,
                  count: latestSubmission.failCount,
                })}
              </p>
            </div>
          )}

          <div className="mb-6 rounded-xl border border-gray-700 bg-gray-800 p-5">
            <div className="mb-1 text-xs font-medium text-gray-500">
              {t('jira.testingRunLabel', { n: currentRunNumber, key: task.jiraKey })}
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full bg-indigo-500/10 px-2 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/30">
                {task.jiraKey}
              </span>
              <h1 className="text-lg font-semibold text-white">{task.title}</h1>
              <span
                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${jiraStatusBadgeClass(task.currentStatus)}`}
              >
                {task.currentStatus ?? t('common.unknown')}
              </span>
              {task.jiraUrl && (
                <a
                  href={task.jiraUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('jira.viewInJira')}
                  className="text-indigo-400 hover:text-indigo-300"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
            {rows.length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-gray-700">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {t('jira.completedCount', {
                    completed: completedCount,
                    total: rows.length,
                  })}
                </span>
              </div>
            )}

            {submissionHistory.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-700 pt-3 text-xs">
                <span className="mr-1 text-gray-500">{t('jira.roundHistory')}:</span>
                {submissionHistory.map((submission, index) => (
                  <span
                    key={submission.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${
                      submission.overallStatus === 'PASS'
                        ? 'border-green-500/30 bg-green-500/10 text-green-400'
                        : 'border-red-500/30 bg-red-500/10 text-red-400'
                    }`}
                  >
                    {t('jira.roundLabel', { n: index + 1 })} —{' '}
                    {submission.overallStatus === 'PASS' ? '✅' : '❌'}{' '}
                    {t(`status.${submission.overallStatus.toLowerCase()}`)} —{' '}
                    {new Date(submission.submittedAt).toLocaleDateString()} —{' '}
                    {t('jira.roundBy', { tester: submission.user.name })}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-indigo-400">
                  {t('jira.roundLabel', { n: submissionHistory.length + 1 })} —{' '}
                  {t('jira.roundInProgress')}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-6 lg:flex-row">
            <div className="lg:w-[30%]">
              <div className="sticky top-4 rounded-xl border border-gray-700 bg-gray-800 p-5">
                {task.description && (
                  <p className="mb-4 whitespace-pre-wrap text-sm text-gray-400">
                    {task.description}
                  </p>
                )}
                {task.priority && (
                  <span className="mb-3 inline-flex rounded-full bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400 border border-orange-500/30">
                    {task.priority}
                  </span>
                )}
                <div className="space-y-1 text-sm text-gray-400">
                  <p>
                    {t('jira.assignee')}: {task.currentAssignee ?? t('common.unassigned')}
                  </p>
                  <p>
                    {t('jira.reporter')}: {task.currentReporter ?? t('common.unassigned')}
                  </p>
                  {task.qaRequestedByName && (
                    <p>
                      {t('jira.sentToQaBy')}: {task.qaRequestedByName}
                    </p>
                  )}
                </div>

                {taskId && projectId && (
                  <InlineAddTestCase
                    projectId={projectId}
                    jiraTaskId={taskId}
                    platform={project?.type ?? 'WEB'}
                    nextSequence={rows.length + 1}
                  />
                )}
              </div>
            </div>

            <div className="lg:w-[70%]">
              {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-20 text-center">
                  <PlayCircle size={36} className="mb-4 text-gray-600" />
                  <p className="text-gray-400">{t('jira.noTestCasesLinked')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rows.map((testCase, index) => {
                    const draft = getDraft(testCase.id)
                    const needsActual = requiresActualResult(draft.status)
                    const { total: previousRunsTotal, latestRun } = getPreviousRunInfo(index)
                    const canModify = canModifyTestCase(testCase)
                    return (
                      <div
                        key={testCase.id}
                        className="rounded-xl border border-gray-700 bg-gray-800 p-3"
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="inline-flex flex-shrink-0 rounded-full bg-gray-700 px-2 py-0.5 font-mono font-semibold text-gray-300">
                              {`TC-${String(index + 1).padStart(3, '0')}`}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-400">
                              {t(TYPE_LABEL_KEY[testCase.type])}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 font-medium ${PLATFORM_BADGE[testCase.platform]}`}
                            >
                              {testCase.platform}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${PRIORITY_BADGE[testCase.priority]}`}
                            >
                              {PRIORITY_EMOJI[testCase.priority]} {testCase.priority}
                            </span>
                          </div>
                          {canModify && (
                            <div className="flex flex-shrink-0 items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setEditingTestCase(testCase)}
                                aria-label={t('common.edit')}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingTestCase(testCase)}
                                aria-label={t('common.delete')}
                                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>

                        <p className="mb-2 text-sm font-medium text-white">
                          {testCase.title}
                        </p>

                        <div className="mb-2 border-t border-gray-700" />

                        <div className="mb-2 flex items-start justify-between gap-3 text-xs">
                          <details className="group flex-1 text-gray-400">
                            <summary className="cursor-pointer select-none text-gray-500 transition-colors hover:text-gray-300">
                              <span className="inline-block transition-transform group-open:rotate-90">
                                ▶
                              </span>{' '}
                              {t('jira.stepsCount', { count: countSteps(testCase.steps) })}
                            </summary>
                            <p className="mt-1.5 whitespace-pre-wrap transition-all">
                              {testCase.steps}
                            </p>
                          </details>
                          <details className="group flex-1 text-right text-gray-400">
                            <summary className="cursor-pointer select-none text-gray-500 transition-colors hover:text-gray-300">
                              {t('jira.expectedResultLabel')}{' '}
                              <span className="inline-block transition-transform group-open:rotate-90">
                                ▶
                              </span>
                            </summary>
                            <p className="mt-1.5 whitespace-pre-wrap text-left transition-all">
                              {testCase.expectedResult}
                            </p>
                          </details>
                        </div>

                        {previousRunsTotal > 0 && latestRun ? (
                          <p className="mb-2 truncate text-xs text-gray-500">
                            {t('jira.previousResult', {
                              status: `${latestRun.status === 'PASS' ? '✅' : latestRun.status === 'FAIL' ? '❌' : latestRun.status === 'BLOCKED' ? '⚠️' : '⏭️'} ${t(`status.${latestRun.status.toLowerCase()}`)}`,
                              result: truncate(latestRun.actualResult ?? t('common.none'), 40),
                            })}
                          </p>
                        ) : (
                          <p className="mb-2 text-xs text-gray-600">
                            {t('jira.noPreviousResults')}
                          </p>
                        )}

                        <div className="mb-2 grid grid-cols-4 gap-2">
                          {STATUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                updateDraft(testCase.id, { status: option.value })
                              }
                              className={`flex h-8 items-center justify-center gap-1 rounded-lg border text-sm font-semibold transition-colors ${
                                draft.status === option.value
                                  ? option.activeClassName
                                  : 'border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300'
                              }`}
                            >
                              <span>{option.emoji}</span>
                              {t(option.labelKey)}
                            </button>
                          ))}
                        </div>

                        {needsActual && (
                          <div className="space-y-2 transition-all">
                            <div>
                              <label className="mb-1 block text-xs font-medium text-gray-400">
                                {t('testCases.actualResult')}
                                <span className="text-red-400"> *</span>
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
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
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
                  className={`h-full rounded-full transition-all ${allComplete ? (anyFail ? 'bg-red-500' : 'bg-green-500') : 'bg-indigo-500'}`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!allComplete || prepareMutation.isPending}
              onClick={handleOpenSubmit}
              className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                allComplete && anyFail
                  ? 'bg-red-600 hover:bg-red-500'
                  : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {prepareMutation.isPending
                ? t('common.pleaseWait')
                : t('jira.submitQaResult')}
            </button>
          </div>
        </div>
      )}

      {showConfirmPass && (
        <ConfirmPassModal
          testCount={rows.length}
          comment={previewComment}
          isPending={submitMutation.isPending}
          onConfirm={() => submitMutation.mutate({})}
          onCancel={() => setShowConfirmPass(false)}
        />
      )}

      {showFailModal && projectId && taskId && (
        <SubmitFailModal
          projectId={projectId}
          taskId={taskId}
          previousAssigneeId={task?.previousAssigneeId ?? null}
          previousAssigneeName={task?.previousAssigneeName ?? null}
          failedTestTitles={rows
            .filter((tc) => getDraft(tc.id).status === 'FAIL')
            .map((tc) => tc.title)}
          initialComment={previewComment}
          isPending={submitMutation.isPending}
          onClose={() => setShowFailModal(false)}
          onSubmit={({ jiraAssigneeId, transitionId, commentOverride }) =>
            submitMutation.mutate({
              jiraAssigneeId,
              transitionId,
              commentOverride,
            })
          }
        />
      )}

      {editingTestCase && (
        <EditTestCaseModal
          testCase={editingTestCase}
          onClose={() => setEditingTestCase(null)}
        />
      )}

      {deletingTestCase && (
        <ConfirmDialog
          title={t('testCases.deleteConfirmTitle')}
          message={t('testCases.deleteConfirmMessage')}
          confirmLabel={t('common.delete')}
          isDanger
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deletingTestCase.id)}
          onCancel={() => setDeletingTestCase(null)}
        />
      )}
    </div>
  )
}
