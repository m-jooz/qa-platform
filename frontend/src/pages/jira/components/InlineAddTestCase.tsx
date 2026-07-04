import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Plus, X } from 'lucide-react'
import api from '../../../api/client'
import { invalidateQaData } from '../../../lib/invalidateQaData'
import type { ApiResponse, TestCase } from '../../../types'

const TYPE_OPTIONS: { value: TestCase['type']; labelKey: string; icon: string }[] = [
  { value: 'MANUAL', labelKey: 'testCases.methods.manual', icon: '📋' },
  { value: 'E2E', labelKey: 'testCases.methods.e2e', icon: '🤖' },
  { value: 'API', labelKey: 'testCases.methods.api', icon: '🔌' },
  { value: 'UNIT', labelKey: 'testCases.methods.unit', icon: '🧩' },
  { value: 'PERFORMANCE', labelKey: 'testCases.methods.performance', icon: '⚡' },
]

const PLATFORM_OPTIONS: { value: TestCase['platform']; labelKey: string }[] = [
  { value: 'WEB', labelKey: 'common.platforms.web' },
  { value: 'ANDROID', labelKey: 'common.platforms.android' },
  { value: 'IOS', labelKey: 'common.platforms.ios' },
]

const PRIORITY_OPTIONS: {
  value: TestCase['priority']
  labelKey: string
  activeClassName: string
}[] = [
  { value: 'LOW', labelKey: 'common.priorities.low', activeClassName: 'bg-blue-600 text-white border-blue-600' },
  { value: 'MEDIUM', labelKey: 'common.priorities.medium', activeClassName: 'bg-yellow-600 text-white border-yellow-600' },
  { value: 'HIGH', labelKey: 'common.priorities.high', activeClassName: 'bg-orange-600 text-white border-orange-600' },
  { value: 'CRITICAL', labelKey: 'common.priorities.critical', activeClassName: 'bg-red-600 text-white border-red-600' },
]

function buildSchema(t: (key: string) => string) {
  return z.object({
    title: z.string().min(1, t('testCases.titleRequired')),
    type: z.enum(['MANUAL', 'E2E', 'API', 'UNIT', 'PERFORMANCE']),
    platform: z.enum(['WEB', 'ANDROID', 'IOS']),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    steps: z
      .array(z.object({ text: z.string() }))
      .refine((steps) => steps.some((s) => s.text.trim().length > 0), {
        message: t('testCases.stepsRequired'),
      }),
    expectedResult: z.string().min(1, t('testCases.expectedResultRequired')),
  })
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

interface InlineAddTestCaseProps {
  projectId: string
  jiraTaskId: string
  platform: TestCase['platform']
  nextSequence: number
}

function draftKey(jiraTaskId: string) {
  return `qa-platform:test-case-draft:${jiraTaskId}`
}

export default function InlineAddTestCase({
  projectId,
  jiraTaskId,
  platform,
  nextSequence,
}: InlineAddTestCaseProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)

  const defaultValues: FormValues = {
    title: '',
    type: 'MANUAL',
    platform,
    priority: 'MEDIUM',
    steps: [{ text: '' }],
    expectedResult: '',
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(t)),
    defaultValues,
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'steps' })
  const watchedPlatform = watch('platform')
  const watchedPriority = watch('priority')
  const watchedValues = watch()

  // Hydrate a saved draft once, when the panel is first opened.
  useEffect(() => {
    if (!isOpen) return
    const raw = localStorage.getItem(draftKey(jiraTaskId))
    if (raw) {
      try {
        const draft = JSON.parse(raw) as FormValues
        reset(draft)
      } catch {
        // Corrupt draft; ignore and start fresh.
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Autosave the draft on every change while the panel is open.
  useEffect(() => {
    if (!isOpen) return
    localStorage.setItem(draftKey(jiraTaskId), JSON.stringify(watchedValues))
  }, [isOpen, jiraTaskId, watchedValues])

  const { mutate, isPending } = useMutation({
    mutationFn: (values: FormValues) =>
      api.post<ApiResponse<TestCase>>('/test-cases', {
        projectId,
        jiraTaskId,
        title: values.title,
        type: values.type,
        platform: values.platform,
        priority: values.priority,
        steps: values.steps
          .map((s) => s.text.trim())
          .filter(Boolean)
          .map((text, i) => `${i + 1}. ${text}`)
          .join('\n'),
        expectedResult: values.expectedResult,
      }),
    onSuccess: () => {
      invalidateQaData(queryClient)
      toast.success(t('testCases.testCaseCreated'))
      localStorage.removeItem(draftKey(jiraTaskId))
      reset(defaultValues)
      setIsOpen(false)
      setShowSavedMessage(true)
      setTimeout(() => setShowSavedMessage(false), 2000)
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('testCases.createFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const onSubmit = (values: FormValues) => mutate(values)

  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 px-3 text-sm font-semibold text-gray-300 hover:border-indigo-500 hover:text-white"
        >
          <Plus size={16} />
          {t('jira.addNewTestCase')}
        </button>
        {showSavedMessage && (
          <p className="mt-2 text-center text-xs font-medium text-green-400">
            {t('testCases.testCaseAdded')}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-6">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
          {t('jira.addNewTestCase')}
        </h3>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label={t('common.close')}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        {t('jira.nextIdPreview', {
          id: `TC-${String(nextSequence).padStart(3, '0')}`,
        })}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('testCases.testCaseTitle')}
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            {...register('title')}
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-400">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('testCases.testMethod')}
          </label>
          <select
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            {...register('type')}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400">
            {t('testCases.platform')}
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORM_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('platform', option.value)}
                className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
                  watchedPlatform === option.value
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300'
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400">
            {t('testCases.priority')}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setValue('priority', option.value)}
                className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${
                  watchedPriority === option.value
                    ? option.activeClassName
                    : 'border-gray-700 bg-gray-900 text-gray-500 hover:text-gray-300'
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-gray-400">
            {t('testCases.steps')}
          </label>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <span className="w-14 flex-shrink-0 text-xs text-gray-500">
                  {t('testCases.stepNumber', { number: index + 1 })}
                </span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder={t('testCases.stepPlaceholder')}
                  {...register(`steps.${index}.text` as const)}
                />
                <button
                  type="button"
                  onClick={() => remove(index)}
                  disabled={fields.length === 1}
                  aria-label={t('common.delete')}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          {errors.steps && (
            <p className="mt-1 text-xs text-red-400">
              {errors.steps.message}
            </p>
          )}
          <button
            type="button"
            onClick={() => append({ text: '' })}
            className="mt-2 flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <Plus size={14} />
            {t('testCases.addStep')}
          </button>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-400">
            {t('testCases.expectedResult')}
          </label>
          <textarea
            rows={2}
            className="w-full resize-none rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            {...register('expectedResult')}
          />
          {errors.expectedResult && (
            <p className="mt-1 text-xs text-red-400">
              {errors.expectedResult.message}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="h-10 flex-1 rounded-lg border border-gray-700 text-sm font-semibold text-gray-300 hover:bg-gray-800"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="h-10 flex-1 rounded-lg bg-indigo-600 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t('common.saving') : t('testCases.saveTestCase')}
          </button>
        </div>
      </form>
    </div>
  )
}
