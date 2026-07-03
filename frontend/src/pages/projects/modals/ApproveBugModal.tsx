import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import api from '../../../api/client'

function buildApproveBugSchema(t: (key: string) => string) {
  return z.object({
    jiraReassignTo: z.string().min(1, t('testRuns.jiraAssigneeIdRequired')),
    jiraNewStatus: z.string().min(1, t('testRuns.jiraTransitionIdRequired')),
  })
}

type ApproveBugFormValues = z.infer<ReturnType<typeof buildApproveBugSchema>>

interface ApproveBugModalProps {
  testRunId: string
  onClose: () => void
}

export default function ApproveBugModal({
  testRunId,
  onClose,
}: ApproveBugModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApproveBugFormValues>({
    resolver: zodResolver(buildApproveBugSchema(t)),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (values: ApproveBugFormValues) =>
      api.patch(`/test-runs/${testRunId}/bug/approve`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('testRuns.bugApprovedSynced'))
      onClose()
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('testRuns.approveFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: ApproveBugFormValues) => mutate(values)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('testRuns.approveBug')}</h2>
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
              {t('testRuns.jiraAssigneeId')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="5b10ac8d-82e9-4710-98b8-8f3209bdb5a1"
              {...register('jiraReassignTo')}
            />
            {errors.jiraReassignTo && (
              <p className="mt-1 text-xs text-red-400">
                {errors.jiraReassignTo.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testRuns.jiraTransitionId')}
            </label>
            <input
              type="text"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="31"
              {...register('jiraNewStatus')}
            />
            {errors.jiraNewStatus && (
              <p className="mt-1 text-xs text-red-400">
                {errors.jiraNewStatus.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('testRuns.approving') : t('common.approve')}
          </button>
        </form>
      </div>
    </div>
  )
}
