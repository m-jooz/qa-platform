import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, Plus, Search } from 'lucide-react'
import api from '../../../api/client'
import { PLATFORM_BADGE, PRIORITY_BADGE } from '../../../lib/badges'
import { useDebouncedValue } from '../../../lib/useDebouncedValue'
import type { ApiResponse, PaginatedResult, TestCase } from '../../../types'
import Pagination from '../../../components/Pagination'
import TableSkeleton from '../components/TableSkeleton'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ErrorState'
import NewTestCaseModal from '../modals/NewTestCaseModal'
import RunTestModal from '../modals/RunTestModal'

interface TestCasesTabProps {
  projectId: string
}

export default function TestCasesTab({ projectId }: TestCasesTabProps) {
  const navigate = useNavigate()
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [runTestCaseId, setRunTestCaseId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, platform, priority, type])

  const {
    data: result,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [
      'test-cases',
      projectId,
      page,
      debouncedSearch,
      platform,
      priority,
      type,
    ],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<TestCase>>>(
        '/test-cases',
        {
          params: {
            projectId,
            page,
            limit: 10,
            search: debouncedSearch || undefined,
            platform: platform || undefined,
            priority: priority || undefined,
            type: type || undefined,
          },
        },
      )
      return data.data
    },
  })
  const testCases = result?.data
  const hasActiveFilters = Boolean(
    debouncedSearch || platform || priority || type,
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search test cases…"
              className="w-52 rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Platforms</option>
            <option value="WEB">Web</option>
            <option value="ANDROID">Android</option>
            <option value="IOS">iOS</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Types</option>
            <option value="MANUAL">Manual</option>
            <option value="E2E">E2E</option>
            <option value="API">API</option>
            <option value="UNIT">Unit</option>
            <option value="PERFORMANCE">Performance</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={18} />
          New Test Case
        </button>
      </div>

      {isLoading && <TableSkeleton columns={6} />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && testCases && testCases.length === 0 && hasActiveFilters && (
        <EmptyState icon={Search} title="No test cases match your filters" />
      )}

      {!isLoading && !isError && testCases && testCases.length === 0 && !hasActiveFilters && (
        <EmptyState
          icon={ClipboardList}
          title="No test cases yet"
          action={
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Create your first test case
            </button>
          }
        />
      )}

      {!isLoading && !isError && testCases && testCases.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Jira Task</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {testCases.map((testCase) => (
                  <tr key={testCase.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-white">{testCase.title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_BADGE[testCase.platform]}`}
                      >
                        {testCase.platform}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {testCase.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[testCase.priority]}`}
                      >
                        {testCase.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {testCase.jiraTask?.jiraKey ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRunTestCaseId(testCase.id)}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-500"
                        >
                          Run
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/test-cases/${testCase.id}`)
                          }
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={result!.page}
            totalPages={result!.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {isNewModalOpen && (
        <NewTestCaseModal
          projectId={projectId}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}

      {runTestCaseId && (
        <RunTestModal
          testCaseId={runTestCaseId}
          onClose={() => setRunTestCaseId(null)}
        />
      )}
    </div>
  )
}
