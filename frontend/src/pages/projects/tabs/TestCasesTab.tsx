import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
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

const PLATFORM_KEY: Record<string, string> = {
  WEB: 'common.platforms.web',
  ANDROID: 'common.platforms.android',
  IOS: 'common.platforms.ios',
}

const TYPE_KEY: Record<string, string> = {
  MANUAL: 'testCases.methods.manual',
  E2E: 'testCases.methods.e2e',
  API: 'testCases.methods.api',
  UNIT: 'testCases.methods.unit',
  PERFORMANCE: 'testCases.methods.performance',
}

const PRIORITY_KEY: Record<string, string> = {
  LOW: 'common.priorities.low',
  MEDIUM: 'common.priorities.medium',
  HIGH: 'common.priorities.high',
  CRITICAL: 'common.priorities.critical',
}

export default function TestCasesTab({ projectId }: TestCasesTabProps) {
  const { t } = useTranslation()
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
              placeholder={t('testCases.searchPlaceholder')}
              className="w-52 rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">{t('common.platforms.allPlatforms')}</option>
            <option value="WEB">{t('common.platforms.web')}</option>
            <option value="ANDROID">{t('common.platforms.android')}</option>
            <option value="IOS">{t('common.platforms.ios')}</option>
          </select>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">{t('common.priorities.allPriorities')}</option>
            <option value="LOW">{t('common.priorities.low')}</option>
            <option value="MEDIUM">{t('common.priorities.medium')}</option>
            <option value="HIGH">{t('common.priorities.high')}</option>
            <option value="CRITICAL">{t('common.priorities.critical')}</option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">{t('testCases.allTypes')}</option>
            <option value="MANUAL">{t('testCases.methods.manual')}</option>
            <option value="E2E">{t('testCases.methods.e2e')}</option>
            <option value="API">{t('testCases.methods.api')}</option>
            <option value="UNIT">{t('testCases.methods.unit')}</option>
            <option value="PERFORMANCE">{t('testCases.methods.performance')}</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={18} />
          {t('testCases.newTestCaseButton')}
        </button>
      </div>

      {isLoading && <TableSkeleton columns={6} />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && testCases && testCases.length === 0 && hasActiveFilters && (
        <EmptyState icon={Search} title={t('testCases.noTestCasesMatch')} />
      )}

      {!isLoading && !isError && testCases && testCases.length === 0 && !hasActiveFilters && (
        <EmptyState
          icon={ClipboardList}
          title={t('testCases.noTestCasesYet')}
          action={
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              {t('testCases.createFirst')}
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
                  <th className="px-4 py-3">{t('testCases.testCaseTitle')}</th>
                  <th className="px-4 py-3">{t('testCases.platform')}</th>
                  <th className="px-4 py-3">{t('projects.type')}</th>
                  <th className="px-4 py-3">{t('testCases.priority')}</th>
                  <th className="px-4 py-3">{t('jira.tasks')}</th>
                  <th className="px-4 py-3">{t('common.actions')}</th>
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
                        {t(PLATFORM_KEY[testCase.platform])}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {t(TYPE_KEY[testCase.type])}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[testCase.priority]}`}
                      >
                        {t(PRIORITY_KEY[testCase.priority])}
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
                          {t('testCases.run')}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/test-cases/${testCase.id}`)
                          }
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                        >
                          {t('common.view')}
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
