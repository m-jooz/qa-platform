import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bug,
  CheckCircle2,
  Clock,
  ClipboardList,
  FolderPlus,
  FolderOpen,
  Pencil,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import api from '../../api/client'
import { PRIORITY_BADGE } from '../../lib/badges'
import { formatRelativeTime } from '../../lib/formatRelativeTime'
import { useAuthStore } from '../../store/auth.store'
import type {
  ApiResponse,
  DashboardData,
  PaginatedResult,
  Project,
} from '../../types'
import ApproveBugModal from '../projects/modals/ApproveBugModal'
import RejectBugModal from '../projects/modals/RejectBugModal'

const STATUS_COLORS: Record<string, string> = {
  PASS: '#22c55e',
  FAIL: '#ef4444',
  BLOCKED: '#eab308',
  SKIPPED: '#6b7280',
}

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: typeof ClipboardList
  label: string
  value: string | number
  colorClass: string
}) {
  return (
    <div className="rounded-xl bg-gray-800 p-6">
      <div className={`mb-3 inline-flex rounded-lg p-2 ${colorClass}`}>
        <Icon size={20} />
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-gray-400">{label}</p>
    </div>
  )
}

function activityIcon(action: string) {
  switch (action) {
    case 'CREATE':
      return FolderPlus
    case 'UPDATE':
      return Pencil
    case 'DELETE':
      return Trash2
    case 'SYNC':
      return RefreshCw
    default:
      return ClipboardList
  }
}

function activityDescription(action: string, entityType: string): string {
  const entity = entityType.replace('_', ' ').toLowerCase()
  switch (action) {
    case 'CREATE':
      return `Created a ${entity}`
    case 'UPDATE':
      return `Updated a ${entity}`
    case 'DELETE':
      return `Deleted a ${entity}`
    case 'SYNC':
      return `Synced ${entity}`
    default:
      return `${action} ${entity}`
  }
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user)
  const canReview = user?.role === 'ADMIN' || user?.role === 'LEAD'

  useEffect(() => {
    document.title = 'Dashboard — QA Platform'
  }, [])

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )
  const [approveTestRunId, setApproveTestRunId] = useState<string | null>(
    null,
  )
  const [rejectTestRunId, setRejectTestRunId] = useState<string | null>(null)

  const { data: projects } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Project>>>(
        '/projects',
        { params: { limit: 100 } },
      )
      return data.data.data
    },
  })

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', selectedProjectId],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<DashboardData>>(
        '/reports/dashboard',
        { params: { projectId: selectedProjectId } },
      )
      return data.data
    },
    enabled: Boolean(selectedProjectId),
  })

  const statusChartData = dashboard
    ? [
        { name: 'PASS', value: dashboard.overview.passCount },
        { name: 'FAIL', value: dashboard.overview.failCount },
        { name: 'BLOCKED', value: dashboard.overview.blockedCount },
        { name: 'SKIPPED', value: dashboard.overview.skippedCount },
      ].filter((entry) => entry.value > 0)
    : []

  const platformChartData =
    dashboard?.byPlatform.map((p) => ({
      platform: p.platform,
      Pass: p.pass,
      Fail: p.fail,
    })) ?? []

  return (
    <div className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
        <select
          value={selectedProjectId ?? ''}
          onChange={(e) => setSelectedProjectId(e.target.value || null)}
          className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">Select a project</option>
          {projects?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedProjectId && (
        <div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-16 text-center">
            <p className="text-gray-400">Select a project to view dashboard</p>
          </div>

          {projects && projects.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-4 text-sm font-medium uppercase text-gray-500">
                Quick access
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-left transition-colors hover:border-indigo-500"
                  >
                    <div className="mb-1 flex items-center gap-2 text-white">
                      <FolderOpen size={16} className="text-gray-400" />
                      {project.name}
                    </div>
                    <p className="text-xs text-gray-500">{project.type}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedProjectId && isLoading && (
        <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-800" />
          ))}
        </div>
      )}

      {selectedProjectId && !isLoading && dashboard && (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            <StatCard
              icon={ClipboardList}
              label="Total Test Cases"
              value={dashboard.overview.totalTestCases}
              colorClass="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              icon={CheckCircle2}
              label="Pass Rate"
              value={`${dashboard.overview.passRate}%`}
              colorClass="bg-green-500/10 text-green-400"
            />
            <StatCard
              icon={XCircle}
              label="Fail Rate"
              value={`${dashboard.overview.failRate}%`}
              colorClass="bg-red-500/10 text-red-400"
            />
            <StatCard
              icon={Bug}
              label="Total Bugs"
              value={dashboard.overview.totalBugs}
              colorClass="bg-orange-500/10 text-orange-400"
            />
            <StatCard
              icon={Clock}
              label="Pending Reviews"
              value={dashboard.overview.pendingBugs}
              colorClass="bg-yellow-500/10 text-yellow-400"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-gray-800 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase text-gray-500">
                Test Run Status
              </h2>
              {statusChartData.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">
                  No test runs yet
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ percent }) =>
                        `${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {statusChartData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={STATUS_COLORS[entry.name]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        borderRadius: 8,
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-xl bg-gray-800 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase text-gray-500">
                Results by Platform
              </h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={platformChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="platform" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="Pass" fill="#22c55e" />
                  <Bar dataKey="Fail" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <section className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Pending Bug Reviews
            </h2>
            {dashboard.pendingBugReviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 py-10 text-center text-sm text-gray-500">
                No pending bug reviews
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-900 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Test Case</th>
                      <th className="px-4 py-3">Severity</th>
                      <th className="px-4 py-3">Executed By</th>
                      <th className="px-4 py-3">Date</th>
                      {canReview && <th className="px-4 py-3">Review</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700 bg-gray-800">
                    {dashboard.pendingBugReviews.map((review) => (
                      <tr key={review.id} className="hover:bg-gray-750">
                        <td className="px-4 py-3 text-white">
                          {review.testCaseTitle}
                        </td>
                        <td className="px-4 py-3">
                          {review.severity ? (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[review.severity]}`}
                            >
                              {review.severity}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {review.executedByName}
                        </td>
                        <td className="px-4 py-3 text-gray-400">
                          {new Date(review.executedAt).toLocaleDateString()}
                        </td>
                        {canReview && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setApproveTestRunId(review.id)}
                                className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-500"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectTestRunId(review.id)}
                                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500"
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold text-white">
              Recent Activity
            </h2>
            {dashboard.recentActivity.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 py-10 text-center text-sm text-gray-500">
                No recent activity
              </div>
            ) : (
              <div className="divide-y divide-gray-800 rounded-xl border border-gray-800">
                {dashboard.recentActivity.map((activity) => {
                  const Icon = activityIcon(activity.action)
                  return (
                    <div
                      key={activity.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-800 text-gray-400">
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-white">
                          {activityDescription(
                            activity.action,
                            activity.entityType,
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.userName} ·{' '}
                          {formatRelativeTime(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}

      {approveTestRunId && (
        <ApproveBugModal
          testRunId={approveTestRunId}
          onClose={() => setApproveTestRunId(null)}
        />
      )}

      {rejectTestRunId && (
        <RejectBugModal
          testRunId={rejectTestRunId}
          onClose={() => setRejectTestRunId(null)}
        />
      )}
    </div>
  )
}
