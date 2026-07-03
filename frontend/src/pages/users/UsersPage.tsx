import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import ConfirmDialog from '../../components/ConfirmDialog'
import TableSkeleton from '../projects/components/TableSkeleton'
import type { ApiResponse, User } from '../../types'

const ROLES = ['ADMIN', 'LEAD', 'TESTER', 'VIEWER'] as const

export default function UsersPage() {
  const { t } = useTranslation()
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  useEffect(() => {
    document.title = `${t('users.title')} — QA Platform`
  }, [t])

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<User[]>>('/users')
      return data.data
    },
  })

  const { mutate: updateRole } = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/users/${id}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(t('users.roleUpdated'))
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? t('users.updateRoleFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(t('users.userDeleted'))
      setDeletingUser(null)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? t('users.deleteUserFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
      setDeletingUser(null)
    },
  })

  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-white">{t('users.title')}</h1>
      <p className="mb-8 text-sm text-gray-400">{t('users.subtitle')}</p>

      {isLoading && <TableSkeleton columns={4} />}

      {!isLoading && users && (
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">{t('users.name')}</th>
                <th className="px-4 py-3">{t('users.email')}</th>
                <th className="px-4 py-3">{t('users.role')}</th>
                <th className="px-4 py-3">{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700 bg-gray-800">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3 text-white">{user.name}</td>
                  <td className="px-4 py-3 text-gray-400">{user.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateRole({ id: user.id, role: e.target.value })
                      }
                      disabled={user.id === currentUser?.id}
                      className="rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`users.roles.${role.toLowerCase()}`)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDeletingUser(user)}
                      disabled={user.id === currentUser?.id}
                      aria-label={t('users.deleteUserAria')}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deletingUser && (
        <ConfirmDialog
          title={t('users.deleteUserTitle')}
          message={t('users.deleteUserMessage', { name: deletingUser.name })}
          confirmLabel={t('common.delete')}
          isPending={isDeleting}
          onConfirm={() => deleteUser(deletingUser.id)}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </div>
  )
}
