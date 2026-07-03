import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ListOrdered, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import api from '../../../api/client'
import type {
  ApiResponse,
  JiraTask,
  PaginatedResult,
  TestCase,
} from '../../../types'

function buildTestCaseSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t('testCases.titleRequired')),
    steps: z.string().min(1, t('testCases.stepsRequired')),
    expectedResult: z.string().min(1, t('testCases.expectedResultRequired')),
    platform: z.enum(['WEB', 'ANDROID', 'IOS'], {
      message: t('testCases.selectAPlatform'),
    }),
    type: z.enum(['MANUAL', 'E2E', 'API', 'UNIT', 'PERFORMANCE'], {
      message: t('testCases.selectAType'),
    }),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
      message: t('testCases.selectAPriority'),
    }),
    jiraTaskId: z.string().optional(),
  })
}

type TestCaseFormValues = z.infer<ReturnType<typeof buildTestCaseSchema>>

interface NewTestCaseModalProps {
  projectId: string
  onClose: () => void
}

export default function NewTestCaseModal({
  projectId,
  onClose,
}: NewTestCaseModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data: jiraTasks } = useQuery({
    queryKey: ['jira-tasks', projectId, 'all'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<JiraTask>>>(
        `/jira/${projectId}/tasks`,
        { params: { limit: 100 } },
      )
      return data.data.data
    },
  })

  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<TestCaseFormValues>({
    resolver: zodResolver(buildTestCaseSchema(t)),
    defaultValues: { priority: 'MEDIUM' },
  })

  const handleFormatSteps = () => {
    const lines = getValues('steps')
      .split('\n')
      .map((line) => line.replace(/^\s*\d+[.)]\s*/, '').trim())
      .filter((line) => line.length > 0)
    setValue(
      'steps',
      lines.map((line, index) => `${index + 1}. ${line}`).join('\n'),
      { shouldValidate: true },
    )
  }

  const { mutate, isPending } = useMutation({
    mutationFn: (values: TestCaseFormValues) =>
      api.post<ApiResponse<TestCase>>('/test-cases', {
        ...values,
        projectId,
        jiraTaskId: values.jiraTaskId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] })
      toast.success(t('testCases.testCaseCreated'))
      onClose()
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('testCases.createFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: TestCaseFormValues) => mutate(values)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t('testCases.newTestCase')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testCases.testCaseTitle')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              {...register('title')}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">
                {t('testCases.steps')}
              </label>
              <button
                type="button"
                onClick={handleFormatSteps}
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <ListOrdered size={12} />
                {t('testCases.formatNumbered')}
              </button>
            </div>
            <textarea
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={t('testCases.stepsPlaceholder')}
              {...register('steps')}
            />
            {errors.steps && (
              <p className="mt-1 text-xs text-red-400">
                {errors.steps.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testCases.expectedResult')}
            </label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              {...register('expectedResult')}
            />
            {errors.expectedResult && (
              <p className="mt-1 text-xs text-red-400">
                {errors.expectedResult.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                {t('testCases.platform')}
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                defaultValue=""
                {...register('platform')}
              >
                <option value="" disabled>
                  {t('common.select')}
                </option>
                <option value="WEB">{t('common.platforms.web')}</option>
                <option value="ANDROID">{t('common.platforms.android')}</option>
                <option value="IOS">{t('common.platforms.ios')}</option>
              </select>
              {errors.platform && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.platform.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                {t('projects.type')}
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                defaultValue=""
                {...register('type')}
              >
                <option value="" disabled>
                  {t('common.select')}
                </option>
                <option value="MANUAL">{t('testCases.methods.manual')}</option>
                <option value="E2E">{t('testCases.methods.e2e')}</option>
                <option value="API">{t('testCases.methods.api')}</option>
                <option value="UNIT">{t('testCases.methods.unit')}</option>
                <option value="PERFORMANCE">{t('testCases.methods.performance')}</option>
              </select>
              {errors.type && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.type.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testCases.priority')}
            </label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              {...register('priority')}
            >
              <option value="LOW">{t('common.priorities.low')}</option>
              <option value="MEDIUM">{t('common.priorities.medium')}</option>
              <option value="HIGH">{t('common.priorities.high')}</option>
              <option value="CRITICAL">{t('common.priorities.critical')}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testCases.linkToJiraTask')}
            </label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              defaultValue=""
              {...register('jiraTaskId')}
            >
              <option value="">{t('common.none')}</option>
              {jiraTasks?.map((task) => (
                <option key={task.id} value={task.id}>
                  {t('testCases.jiraTaskOption', { key: task.jiraKey, title: task.title })}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('common.creating') : t('testCases.createTestCase')}
          </button>
        </form>
      </div>
    </div>
  )
}
