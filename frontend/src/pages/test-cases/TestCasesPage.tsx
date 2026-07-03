import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Search } from 'lucide-react'
import api from '../../api/client'
import { PLATFORM_BADGE, PRIORITY_BADGE } from '../../lib/badges'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import type { ApiResponse, PaginatedResult, TestCase } from '../../types'
import Pagination from '../../components/Pagination'
import TableSkeleton from '../projects/components/TableSkeleton'
import EmptyState from '../projects/components/EmptyState'
import ErrorState from '../projects/components/ErrorState'
import RunTestModal from '../projects/modals/RunTestModal'

export default function TestCasesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [runTestCaseId, setRunTestCaseId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [platform, setPlatform] = useState('')
  const [priority, setPriority] = useState('')
  const [type, setType] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    document.title = `${t('testCases.title')} — QA Platform`
  }, [t])

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
      'global',
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
            page,
            limit: 15,
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
    <div className="px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">{t('testCases.title')}</h1>
        <p className="mt-1 text-sm text-gray-400">
          {t('testCases.subtitle')}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
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
            className="w-56 rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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

      {isLoading && <TableSkeleton columns={7} />}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && testCases && testCases.length === 0 && hasActiveFilters && (
        <EmptyState icon={Search} title={t('testCases.noTestCasesMatch')} />
      )}

      {!isLoading && !isError && testCases && testCases.length === 0 && !hasActiveFilters && (
        <EmptyState
          icon={ClipboardList}
          title={t('testCases.noTestCasesYet')}
        />
      )}

      {!isLoading && !isError && testCases && testCases.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t('testCases.testCaseTitle')}</th>
                  <th className="px-4 py-3">{t('testCases.project')}</th>
                  <th className="px-4 py-3">{t('testCases.platform')}</th>
                  <th className="px-4 py-3">{t('testCases.type')}</th>
                  <th className="px-4 py-3">{t('testCases.priority')}</th>
                  <th className="px-4 py-3">{t('testCases.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700 bg-gray-800">
                {testCases.map((testCase) => (
                  <tr key={testCase.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3 text-white">{testCase.title}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {testCase.project.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_BADGE[testCase.platform]}`}
                      >
                        {t(`common.platforms.${testCase.platform.toLowerCase()}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {t(`testCases.methods.${testCase.type.toLowerCase()}`)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[testCase.priority]}`}
                      >
                        {t(`common.priorities.${testCase.priority.toLowerCase()}`)}
                      </span>
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

      {runTestCaseId && (
        <RunTestModal
          testCaseId={runTestCaseId}
          onClose={() => setRunTestCaseId(null)}
        />
      )}
    </div>
  )
}
