import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import api from '../../api/client'
import { PLATFORM_BADGE } from '../../lib/badges'
import type { ApiResponse, Project } from '../../types'
import ErrorState from './components/ErrorState'
import JiraTasksTab from './tabs/JiraTasksTab'
import TestCasesTab from './tabs/TestCasesTab'
import TestRunsTab from './tabs/TestRunsTab'
import ReportsTab from './tabs/ReportsTab'

const TABS = [
  { key: 'jira', labelKey: 'jira.tasks' },
  { key: 'testcases', labelKey: 'testCases.title' },
  { key: 'testruns', labelKey: 'testRuns.title' },
  { key: 'reports', labelKey: 'reports.title' },
] as const

type TabKey = (typeof TABS)[number]['key']

export default function ProjectDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('jira')

  const {
    data: project,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Project>>(`/projects/${id}`)
      return data.data
    },
    enabled: Boolean(id),
  })

  if (!id) return null

  return (
    <div className="px-8 py-8">
      <button
        type="button"
        onClick={() => navigate('/projects')}
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft size={16} />
        {t('nav.projects')}
      </button>

      {isLoading && (
        <div className="mb-8 animate-pulse">
          <div className="h-8 w-64 rounded bg-gray-800" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => refetch()} />}

      {!isLoading && !isError && project && (
        <>
          <div className="mb-8 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">
              {project.name}
            </h1>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_BADGE[project.type]}`}
            >
              {project.type}
            </span>
          </div>

          <div className="mb-6 flex gap-6 border-b border-gray-800">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>

          {activeTab === 'jira' && <JiraTasksTab projectId={id} />}
          {activeTab === 'testcases' && <TestCasesTab projectId={id} />}
          {activeTab === 'testruns' && <TestRunsTab projectId={id} />}
          {activeTab === 'reports' && <ReportsTab projectId={id} />}
        </>
      )}
    </div>
  )
}
