import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/client'
import type { ApiResponse, Project } from '../../types'

function buildProjectSchema(isEditMode: boolean) {
  return z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    type: z.enum(['WEB', 'ANDROID', 'IOS'], {
      message: 'Select a project type',
    }),
    description: z.string().optional(),
    jiraProjectKey: z.string().min(1, 'Jira project key is required'),
    jiraBaseUrl: z
      .string()
      .min(1, 'Jira base URL is required')
      .url('Enter a valid URL'),
    jiraEmail: z.email('Enter a valid email'),
    jiraApiToken: isEditMode
      ? z.string().optional()
      : z.string().min(1, 'Jira API token is required'),
  })
}

type ProjectFormValues = z.infer<ReturnType<typeof buildProjectSchema>>

interface NewProjectModalProps {
  project?: Project
  onClose: () => void
}

export default function NewProjectModal({
  project,
  onClose,
}: NewProjectModalProps) {
  const queryClient = useQueryClient()
  const isEditMode = Boolean(project)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(buildProjectSchema(isEditMode)),
    defaultValues: project
      ? {
          name: project.name,
          type: project.type,
          description: project.description ?? '',
          jiraProjectKey: project.jiraProjectKey ?? '',
          jiraBaseUrl: project.jiraBaseUrl ?? '',
          jiraEmail: project.jiraEmail ?? '',
          jiraApiToken: '',
        }
      : undefined,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (values: ProjectFormValues) => {
      const payload = { ...values }
      if (isEditMode && !payload.jiraApiToken) {
        delete payload.jiraApiToken
      }
      return isEditMode
        ? api.patch<ApiResponse<Project>>(`/projects/${project!.id}`, payload)
        : api.post<ApiResponse<Project>>('/projects', payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['project', project!.id] })
      }
      toast.success(
        isEditMode ? 'Project updated successfully' : 'Project created successfully',
      )
      onClose()
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ??
        `Failed to ${isEditMode ? 'update' : 'create'} project`
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: ProjectFormValues) => mutate(values)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEditMode ? 'Edit Project' : 'New Project'}
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
              Name
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Mobile Banking App"
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">
                {errors.name.message}
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
                Select a type
              </option>
              <option value="WEB">Web</option>
              <option value="ANDROID">Android</option>
              <option value="IOS">iOS</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-xs text-red-400">
                {errors.type.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Optional description"
              {...register('description')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Jira Project Key
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="PROJ"
              {...register('jiraProjectKey')}
            />
            {errors.jiraProjectKey && (
              <p className="mt-1 text-xs text-red-400">
                {errors.jiraProjectKey.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Jira Base URL
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="https://company.atlassian.net"
              {...register('jiraBaseUrl')}
            />
            {errors.jiraBaseUrl && (
              <p className="mt-1 text-xs text-red-400">
                {errors.jiraBaseUrl.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Jira Account Email
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="you@company.com"
              {...register('jiraEmail')}
            />
            {errors.jiraEmail && (
              <p className="mt-1 text-xs text-red-400">
                {errors.jiraEmail.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Jira API Token
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={
                isEditMode ? 'Leave blank to keep existing' : '••••••••••••'
              }
              {...register('jiraApiToken')}
            />
            {errors.jiraApiToken && (
              <p className="mt-1 text-xs text-red-400">
                {errors.jiraApiToken.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? isEditMode
                ? 'Saving…'
                : 'Creating…'
              : isEditMode
                ? 'Save Changes'
                : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  )
}
