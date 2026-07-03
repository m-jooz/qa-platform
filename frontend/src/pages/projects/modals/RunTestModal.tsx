import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Paperclip, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import api from '../../../api/client'
import type { ApiResponse, TestRun } from '../../../types'

const STATUS_OPTIONS = [
  { value: 'PASS', labelKey: 'status.pass', className: 'border-green-500 bg-green-500/10 text-green-400' },
  { value: 'FAIL', labelKey: 'status.fail', className: 'border-red-500 bg-red-500/10 text-red-400' },
  { value: 'BLOCKED', labelKey: 'status.blocked', className: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
  { value: 'SKIPPED', labelKey: 'status.skipped', className: 'border-gray-500 bg-gray-500/10 text-gray-400' },
] as const

function buildRunTestSchema(t: (key: string) => string) {
  return z
    .object({
      status: z.enum(['PASS', 'FAIL', 'BLOCKED', 'SKIPPED'], {
        message: t('testRuns.selectAStatus'),
      }),
      actualResult: z.string().min(1, t('testRuns.actualResultRequired')),
      notes: z.string().optional(),
      severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
        message: t('testRuns.selectASeverity'),
      }),
      isBug: z.boolean(),
      bugDetails: z.string().optional(),
    })
    .refine(
      (data) => !data.isBug || Boolean(data.bugDetails?.trim()),
      {
        message: t('testRuns.bugDetailsRequired'),
        path: ['bugDetails'],
      },
    )
}

type RunTestSchemaType = ReturnType<typeof buildRunTestSchema>

type RunTestFormValues = z.infer<RunTestSchemaType>

interface RunTestModalProps {
  testCaseId: string
  onClose: () => void
}

export default function RunTestModal({
  testCaseId,
  onClose,
}: RunTestModalProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [files, setFiles] = useState<File[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RunTestFormValues>({
    resolver: zodResolver(buildRunTestSchema(t)),
    defaultValues: { isBug: false },
  })

  const status = watch('status')
  const isBug = watch('isBug')

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: RunTestFormValues) => {
      const { data } = await api.post<ApiResponse<TestRun>>('/test-runs', {
        testCaseId,
        ...values,
      })
      const testRun = data.data

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        await api.post(`/attachments/${testRun.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      return testRun
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-runs'] })
      queryClient.invalidateQueries({ queryKey: ['test-cases'] })
      toast.success(t('testRuns.testRunRecorded'))
      onClose()
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('testRuns.recordFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: RunTestFormValues) => mutate(values)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFiles(Array.from(e.target.files))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-gray-800 p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{t('testRuns.runTest')}</h2>
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
            <label className="mb-2 block text-sm font-medium text-gray-300">
              {t('common.status')}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setValue('status', option.value)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold transition-colors ${
                    status === option.value
                      ? option.className
                      : 'border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {t(option.labelKey)}
                </button>
              ))}
            </div>
            {errors.status && (
              <p className="mt-1 text-xs text-red-400">
                {errors.status.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testRuns.actualResult')}
            </label>
            <textarea
              rows={3}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              {...register('actualResult')}
            />
            {errors.actualResult && (
              <p className="mt-1 text-xs text-red-400">
                {errors.actualResult.message}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testRuns.notes')}
            </label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder={t('common.optional')}
              {...register('notes')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testRuns.severity')}
            </label>
            <select
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              defaultValue=""
              {...register('severity')}
            >
              <option value="" disabled>
                {t('testRuns.selectASeverity')}
              </option>
              <option value="LOW">{t('common.priorities.low')}</option>
              <option value="MEDIUM">{t('common.priorities.medium')}</option>
              <option value="HIGH">{t('common.priorities.high')}</option>
              <option value="CRITICAL">{t('common.priorities.critical')}</option>
            </select>
            {errors.severity && (
              <p className="mt-1 text-xs text-red-400">
                {errors.severity.message}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
              {...register('isBug')}
            />
            {t('testRuns.thisIsABug')}
          </label>

          {isBug && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                {t('testRuns.bugDetails')}
              </label>
              <textarea
                rows={3}
                className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                {...register('bugDetails')}
              />
              {errors.bugDetails && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.bugDetails.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              {t('testRuns.attachments')}
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-400 hover:border-indigo-500 hover:text-gray-300">
              <Paperclip size={16} />
              {files.length > 0
                ? t('testRuns.filesSelected', { count: files.length })
                : t('testRuns.attachFiles')}
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('common.submitting') : t('testRuns.submitTestRun')}
          </button>
        </form>
      </div>
    </div>
  )
}
