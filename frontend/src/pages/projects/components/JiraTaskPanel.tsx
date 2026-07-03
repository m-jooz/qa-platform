import { useTranslation } from 'react-i18next'
import { ExternalLink, X } from 'lucide-react'
import { jiraStatusBadgeClass } from '../../../lib/badges'
import { formatRelativeTime } from '../../../lib/formatRelativeTime'
import type { JiraTask } from '../../../types'

interface JiraTaskPanelProps {
  task: JiraTask
  onClose: () => void
}

export default function JiraTaskPanel({ task, onClose }: JiraTaskPanelProps) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-gray-700 bg-gray-800 p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/30">
            {task.jiraKey}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <h2 className="mb-6 text-lg font-semibold text-white">
          {task.title}
        </h2>

        <dl className="space-y-4 text-sm">
          <div>
            <dt className="mb-1 text-gray-500">{t('common.status')}</dt>
            <dd>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${jiraStatusBadgeClass(task.currentStatus)}`}
              >
                {task.currentStatus ?? t('common.unknown')}
              </span>
            </dd>
          </div>

          <div>
            <dt className="mb-1 text-gray-500">{t('jira.assignee')}</dt>
            <dd className="text-gray-300">
              {task.currentAssignee ?? t('common.unassigned')}
            </dd>
          </div>

          <div>
            <dt className="mb-1 text-gray-500">{t('jira.lastUpdated')}</dt>
            <dd className="text-gray-300">
              {formatRelativeTime(task.jiraUpdatedAt)}
            </dd>
          </div>

          {task.jiraUrl && (
            <div>
              <dt className="mb-1 text-gray-500">{t('jira.jiraLink')}</dt>
              <dd>
                <a
                  href={task.jiraUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                >
                  {t('jira.openInJira')}
                  <ExternalLink size={14} />
                </a>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  )
}
