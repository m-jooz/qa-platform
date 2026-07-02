import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../../api/client'
import type {
  ApiResponse,
  JiraTask,
  PaginatedResult,
  TestCase,
} from '../../../types'

const testCaseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  steps: z.string().min(1, 'Steps are required'),
  expectedResult: z.string().min(1, 'Expected result is required'),
  platform: z.enum(['WEB', 'ANDROID', 'IOS'], {
    message: 'Select a platform',
  }),
  type: z.enum(['MANUAL', 'E2E', 'API', 'UNIT', 'PERFORMANCE'], {
    message: 'Select a type',
  }),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    message: 'Select a priority',
  }),
  jiraTaskId: z.string().optional(),
})

type TestCaseFormValues = z.infer<typeof testCaseSchema>

interface NewTestCaseModalProps {
  projectId: string
  onClose: () => void
}

export default function NewTestCaseModal({
  projectId,
  onClose,
}: NewTestCaseModalProps) {
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
    formState: { errors },
  } = useForm<TestCaseFormValues>({
    resolver: zodResolver(testCaseSchema),
    defaultValues: { priority: 'MEDIUM' },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (values: TestCaseFormValues) =>
      api.post<ApiResponse<TestCase>>('/test-cases', {
        ...values,
        projectId,
        jiraTaskId: values.jiraTaskId || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] })
      toast.success('Test case created')
      onClose()
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? 'Failed to create test case'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: TestCaseFormValues) => mutate(values)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            New Test Case
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
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
              Title
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
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Steps
            </label>
            <textarea
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={'1. Go to...\n2. Click...'}
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
              Expected Result
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
                Platform
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                defaultValue=""
                {...register('platform')}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="WEB">Web</option>
                <option value="ANDROID">Android</option>
                <option value="IOS">iOS</option>
              </select>
              {errors.platform && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.platform.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Type
              </label>
              <select
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                defaultValue=""
                {...register('type')}
              >
                <option value="" disabled>
                  Select
                </option>
                <option value="MANUAL">Manual</option>
                <option value="E2E">E2E</option>
                <option value="API">API</option>
                <option value="UNIT">Unit</option>
                <option value="PERFORMANCE">Performance</option>
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
              Priority
            </label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              {...register('priority')}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Link to Jira Task
            </label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              defaultValue=""
              {...register('jiraTaskId')}
            >
              <option value="">None</option>
              {jiraTasks?.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.jiraKey} — {task.title}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Creating…' : 'Create Test Case'}
          </button>
        </form>
      </div>
    </div>
  )
}
