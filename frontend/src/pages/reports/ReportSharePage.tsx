import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Printer } from 'lucide-react'
import api from '../../api/client'
import { PLATFORM_BADGE, PRIORITY_BADGE, TEST_RUN_STATUS_BADGE } from '../../lib/badges'
import type { ApiResponse } from '../../types'

interface ReportTestCase {
  id: string
  title: string
  platform: 'WEB' | 'ANDROID' | 'IOS'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  type: string
  latestRun: {
    id: string
    status: 'PASS' | 'FAIL' | 'BLOCKED' | 'SKIPPED'
    executedAt: string
    executedByName: string
  } | null
}

interface ReportBug {
  id: string
  severity: string | null
  bugStatus: string | null
  bugDetails: string | null
  rejectReason: string | null
  executedAt: string
  testCase: { title: string }
  executor: { name: string }
}

interface ReportPayload {
  project: { id: string; name: string; type: string }
  summary: {
    totalTestCases: number
    totalTestRuns: number
    passRate: number
    failRate: number
    totalBugs: number
    pendingBugs: number
  }
  testCases: ReportTestCase[]
  bugs: ReportBug[]
  generatedBy: string | null
  generatedAt: string
}

interface ReportResponse {
  id: string
  title: string
  createdAt: string
  data: ReportPayload
}

export default function ReportSharePage() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()

  useEffect(() => {
    document.title = t('reports.sharedReportTitle')
  }, [t])

  const { data: report, isLoading, isError } = useQuery({
    queryKey: ['report-share', token],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<ReportResponse>>(
        `/reports/share/${token}`,
      )
      return data.data
    },
    enabled: Boolean(token),
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-gray-400">
        {t('reports.loadingReport')}
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-center text-gray-400">
        <p className="mb-2 text-lg text-white">{t('reports.reportNotFound')}</p>
        <p className="text-sm">{t('reports.shareLinkInvalid')}</p>
      </div>
    )
  }

  const { data } = report

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 text-white print:bg-white print:text-black">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{report.title}</h1>
            <p className="mt-1 text-sm text-gray-400 print:text-gray-600">
              {t('reports.generatedByLine', {
                project: data.project.name,
                generatedBy: data.generatedBy ?? t('common.unknown'),
                date: new Date(data.generatedAt).toLocaleString(),
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 print:hidden"
          >
            <Printer size={16} />
            {t('reports.printExport')}
          </button>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: t('reports.testCasesStat'), value: data.summary.totalTestCases },
            { label: t('reports.testRunsStat'), value: data.summary.totalTestRuns },
            { label: t('reports.passRateStat'), value: `${data.summary.passRate}%` },
            { label: t('reports.failRateStat'), value: `${data.summary.failRate}%` },
            { label: t('reports.bugsStat'), value: data.summary.totalBugs },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-gray-800 p-4 text-center print:border print:border-gray-300"
            >
              <p className="text-xl font-semibold">{stat.value}</p>
              <p className="mt-1 text-xs text-gray-400 print:text-gray-600">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{t('testCases.title')}</h2>
          {data.testCases.length === 0 ? (
            <p className="text-sm text-gray-500">{t('reports.noTestCases')}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-700 print:border-gray-300">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 text-xs uppercase text-gray-500 print:bg-gray-100 print:text-gray-600">
                  <tr>
                    <th className="px-4 py-3">{t('reports.titleCol')}</th>
                    <th className="px-4 py-3">{t('reports.platformCol')}</th>
                    <th className="px-4 py-3">{t('reports.priorityCol')}</th>
                    <th className="px-4 py-3">{t('reports.latestResult')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800 print:divide-gray-300 print:bg-white">
                  {data.testCases.map((testCase) => (
                    <tr key={testCase.id}>
                      <td className="px-4 py-3">{testCase.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_BADGE[testCase.platform]}`}
                        >
                          {t(`common.platforms.${testCase.platform.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[testCase.priority]}`}
                        >
                          {t(`common.priorities.${testCase.priority.toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {testCase.latestRun ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${TEST_RUN_STATUS_BADGE[testCase.latestRun.status]}`}
                          >
                            {t(`status.${testCase.latestRun.status.toLowerCase()}`)}
                          </span>
                        ) : (
                          <span className="text-gray-500">{t('reports.notRun')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">{t('reports.bugsSection')}</h2>
          {data.bugs.length === 0 ? (
            <p className="text-sm text-gray-500">{t('reports.noBugsReported')}</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-700 print:border-gray-300">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-900 text-xs uppercase text-gray-500 print:bg-gray-100 print:text-gray-600">
                  <tr>
                    <th className="px-4 py-3">{t('reports.testCaseCol')}</th>
                    <th className="px-4 py-3">{t('reports.severityCol')}</th>
                    <th className="px-4 py-3">{t('reports.statusCol')}</th>
                    <th className="px-4 py-3">{t('reports.reportedBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700 bg-gray-800 print:divide-gray-300 print:bg-white">
                  {data.bugs.map((bug) => (
                    <tr key={bug.id}>
                      <td className="px-4 py-3">{bug.testCase.title}</td>
                      <td className="px-4 py-3 text-gray-400 print:text-gray-600">
                        {bug.severity ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 print:text-gray-600">
                        {bug.bugStatus ? t(`status.${bug.bugStatus.toLowerCase()}`) : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 print:text-gray-600">
                        {bug.executor.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="mt-12 border-t border-gray-800 pt-6 text-center text-xs text-gray-600 print:border-gray-300">
          {t('reports.poweredByFooter')}
        </footer>
      </div>
    </div>
  )
}
