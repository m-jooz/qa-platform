import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Trash2 } from 'lucide-react'
import api from '../../api/client'
import { useAuthStore } from '../../store/auth.store'
import ConfirmDialog from '../../components/ConfirmDialog'
import TableSkeleton from '../projects/components/TableSkeleton'
import type { ApiResponse, User } from '../../types'

const ROLES = ['ADMIN', 'LEAD', 'TESTER', 'VIEWER'] as const

export default function UsersPage() {
  const currentUser = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  useEffect(() => {
    document.title = 'Users — QA Platform'
  }, [])

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
      toast.success('Role updated')
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? 'Failed to update role'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  const { mutate: deleteUser, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
      setDeletingUser(null)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message ?? 'Failed to delete user'
      toast.error(Array.isArray(message) ? message[0] : message)
      setDeletingUser(null)
    },
  })

  return (
    <div className="px-8 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-white">Users</h1>
      <p className="mb-8 text-sm text-gray-400">Manage user roles and access</p>

      {isLoading && <TableSkeleton columns={4} />}

      {!isLoading && users && (
        <div className="overflow-hidden rounded-xl border border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
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
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setDeletingUser(user)}
                      disabled={user.id === currentUser?.id}
                      aria-label="Delete user"
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
          title="Delete user"
          message={`Are you sure you want to delete ${deletingUser.name}? This cannot be undone.`}
          confirmLabel="Delete"
          isPending={isDeleting}
          onConfirm={() => deleteUser(deletingUser.id)}
          onCancel={() => setDeletingUser(null)}
        />
      )}
    </div>
  )
}
