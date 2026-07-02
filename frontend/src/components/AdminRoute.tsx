import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store'

export default function AdminRoute() {
  const role = useAuthStore((state) => state.user?.role)

  if (role !== 'ADMIN') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
