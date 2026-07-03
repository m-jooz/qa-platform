import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import api from '../../../api/client'

function buildRejectBugSchema(t: (key: string) => string) {
  return z.object({
    rejectReason: z.string().min(1, t('testRuns.rejectReasonRequired')),
  })
}

type RejectBugFormValues = z.infer<ReturnType<typeof buildRejectBugSchema>>

interface RejectBugModalProps {
  testRunId: string
  onClose: () => void
}

export default function RejectBugModal({
  testRunId,
  onClose,
}: RejectBugModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectBugFormValues>({
    resolver: zodResolver(buildRejectBugSchema(t)),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (values: RejectBugFormValues) =>
      api.patch(`/test-runs/${testRunId}/bug/reject`, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success(t('testRuns.bugRejectedToast'))
      onClose()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? t('testRuns.rejectFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: RejectBugFormValues) => mutate(values)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('testRuns.rejectBug')}</h2>
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
              {t('testRuns.rejectReason')}
            </label>
            <textarea
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              {...register('rejectReason')}
            />
            {errors.rejectReason && (
              <p className="mt-1 text-xs text-red-400">
                {errors.rejectReason.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('testRuns.rejecting') : t('common.reject')}
          </button>
        </form>
      </div>
    </div>
  )
}
