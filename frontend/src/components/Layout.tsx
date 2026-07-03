import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  BarChart2,
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  PlayCircle,
  User as UserIcon,
  Users,
} from 'lucide-react'
import api from '../api/client'
import { formatRelativeTime } from '../lib/formatRelativeTime'
import { useAuthStore } from '../store/auth.store'
import type { ApiResponse, Notification } from '../types'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/projects', icon: FolderOpen, labelKey: 'nav.projects' },
  { to: '/test-cases', icon: ClipboardList, labelKey: 'nav.testCases' },
  { to: '/test-runs', icon: PlayCircle, labelKey: 'nav.testRuns' },
  { to: '/reports', icon: BarChart2, labelKey: 'nav.reports' },
]

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

export default function Layout() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')
  }

  const { data: notificationsData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<NotificationsResponse>>(
        '/notifications',
      )
      return data.data
    },
    refetchInterval: 30000,
  })

  const unreadCount = notificationsData?.unreadCount ?? 0
  const notifications = notificationsData?.notifications ?? []

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification.id}/read`)
        queryClient.invalidateQueries({ queryKey: ['notifications'] })
      } catch {
        // Non-critical; the notification stays visible either way.
      }
    }
    setIsNotifOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-gray-950 rtl:flex-row-reverse">
      <aside className="flex w-64 flex-shrink-0 flex-col border-e border-gray-800 bg-gray-900">
        <div className="px-6 py-5">
          <span className="text-lg font-semibold text-indigo-400">
            QA Platform
          </span>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-gray-800 px-3 py-3">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <UserIcon size={18} />
            {t('nav.profile')}
          </NavLink>
          {user?.role === 'ADMIN' && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Users size={18} />
              {t('nav.users')}
            </NavLink>
          )}
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          {user && (
            <div className="mb-3">
              <p className="truncate text-sm font-medium text-white">
                {user.name}
              </p>
              <p className="text-xs text-gray-500">{user.role}</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
          >
            <LogOut size={18} />
            {t('common.logout')}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 flex-shrink-0 items-center justify-end gap-2 border-b border-gray-800 bg-gray-900 px-6">
          <button
            type="button"
            onClick={toggleLanguage}
            aria-label="Toggle language"
            className="rounded-lg border border-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            {i18n.language === 'ar' ? 'EN' : 'AR'}
          </button>
          <div className="relative" ref={notifRef}>
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => setIsNotifOpen((open) => !open)}
            className="relative rounded-full p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute end-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute end-0 top-12 z-50 w-80 rounded-xl border border-gray-800 bg-gray-900 shadow-xl">
              <div className="border-b border-gray-800 px-4 py-3">
                <p className="text-sm font-semibold text-white">
                  {t('nav.notifications')}
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-500">
                    {t('nav.noNotifications')}
                  </p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex w-full flex-col gap-1 border-b border-gray-800 px-4 py-3 text-start last:border-b-0 hover:bg-gray-800 ${
                        notification.isRead ? '' : 'bg-indigo-500/5'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!notification.isRead && (
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" />
                        )}
                        <p className="text-sm text-gray-200">
                          {notification.message}
                        </p>
                      </div>
                      <p className="ps-3.5 text-xs text-gray-500">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-950">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
