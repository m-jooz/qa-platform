import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import api from '../../api/client'
import type { ApiResponse, Project } from '../../types'

function buildProjectSchema(isEditMode: boolean, t: (key: string) => string) {
  return z.object({
    name: z.string().min(2, t('projects.nameTooShort')),
    type: z.enum(['WEB', 'ANDROID', 'IOS'], {
      message: t('projects.selectAType'),
    }),
    description: z.string().optional(),
    jiraProjectKey: z.string().min(1, t('projects.jiraProjectKeyRequired')),
    jiraBaseUrl: z
      .string()
      .min(1, t('projects.jiraBaseUrlRequired'))
      .url(t('projects.enterValidUrl')),
    jiraEmail: z.email(t('projects.enterValidEmail')),
    jiraApiToken: isEditMode
      ? z.string().optional()
      : z.string().min(1, t('projects.jiraApiTokenRequired')),
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
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEditMode = Boolean(project)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(buildProjectSchema(isEditMode, t)),
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
        isEditMode ? t('projects.projectUpdated') : t('projects.projectCreated'),
      )
      onClose()
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ??
        (isEditMode ? t('projects.updateFailed') : t('projects.createFailed'))
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: ProjectFormValues) => mutate(values)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {isEditMode ? t('projects.editProject') : t('projects.newProject')}
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
              {t('projects.name')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={t('projects.namePlaceholder')}
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
              {t('projects.type')}
            </label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              defaultValue=""
              {...register('type')}
            >
              <option value="" disabled>
                {t('projects.selectAType')}
              </option>
              <option value="WEB">{t('common.platforms.web')}</option>
              <option value="ANDROID">{t('common.platforms.android')}</option>
              <option value="IOS">{t('common.platforms.ios')}</option>
            </select>
            {errors.type && (
              <p className="mt-1 text-xs text-red-400">
                {errors.type.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('projects.description')}
            </label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={t('projects.descriptionPlaceholder')}
              {...register('description')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('projects.jiraProjectKey')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={t('projects.jiraProjectKeyPlaceholder')}
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
              {t('projects.jiraBaseUrl')}
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
              {t('projects.jiraAccountEmail')}
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
              {t('projects.jiraApiToken')}
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={
                isEditMode ? t('projects.jiraApiTokenKeepExisting') : '••••••••••••'
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
                ? t('common.saving')
                : t('common.creating')
              : isEditMode
                ? t('projects.saveChanges')
                : t('projects.createProject')}
          </button>
        </form>
      </div>
    </div>
  )
}
