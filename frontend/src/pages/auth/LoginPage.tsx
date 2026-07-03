import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import api from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import type { ApiResponse, User } from '../../types'

function buildLoginSchema(t: (key: string) => string) {
  return z.object({
    email: z.string().min(1, t('auth.emailRequired')).email(t('auth.enterValidEmail')),
    password: z.string().min(1, t('auth.passwordRequired')),
  })
}

type LoginFormValues = z.infer<ReturnType<typeof buildLoginSchema>>

interface LoginResult {
  accessToken: string
  user: User
}

export default function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(buildLoginSchema(t)),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    setIsSubmitting(true)
    try {
      const { data } = await api.post<ApiResponse<LoginResult>>(
        '/auth/login',
        values,
      )
      login(data.data.user, data.data.accessToken)
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      const message =
        error.response?.data?.message ?? t('auth.loginFailed')
      setServerError(Array.isArray(message) ? message[0] : message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            QA Platform
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl"
          noValidate
        >
          {serverError && (
            <div className="mb-4 rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-400">
              {serverError}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="you@company.com"
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? t('auth.loggingIn') : t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  )
}
