import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { KeyRound, Mail, User as UserIcon } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/auth.store'

const ROLE_BADGE: Record<string, string> = {
  ADMIN: 'bg-red-500/10 text-red-400 border border-red-500/30',
  LEAD: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30',
  TESTER: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  VIEWER: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
}

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    document.title = 'Profile — QA Platform'
  }, [])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (values: PasswordFormValues) =>
      api.patch('/users/me/password', {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      toast.success('Password changed successfully')
      reset()
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? 'Failed to change password'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  if (!user) return null

  return (
    <div className="px-8 py-8">
      <h1 className="mb-8 text-2xl font-semibold text-white">Profile</h1>

      <div className="mx-auto max-w-lg space-y-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase text-gray-500">
            Account Info
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <UserIcon size={16} className="text-gray-500" />
              <span className="text-sm text-white">{user.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-gray-500" />
              <span className="text-sm text-white">{user.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <KeyRound size={16} className="text-gray-500" />
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}
              >
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase text-gray-500">
            Change Password
          </h2>
          <form
            onSubmit={handleSubmit((values) => mutate(values))}
            className="space-y-4"
            noValidate
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Current Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                {...register('oldPassword')}
              />
              {errors.oldPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.oldPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                New Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                {...register('newPassword')}
              />
              {errors.newPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-300">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Changing…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
