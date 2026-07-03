import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ClipboardList,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../api/client'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { useAuthStore } from '../../store/auth.store'
import type { ApiResponse, PaginatedResult, Project } from '../../types'
import Pagination from '../../components/Pagination'
import ConfirmDialog from '../../components/ConfirmDialog'
import NewProjectModal from './NewProjectModal'

const TYPE_BADGE_STYLES: Record<Project['type'], string> = {
  WEB: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  ANDROID: 'bg-green-500/10 text-green-400 border border-green-500/30',
  IOS: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
}

function ProjectCard({
  project,
  onEdit,
  onDelete,
  canDelete,
}: {
  project: Project
  onEdit: (project: Project) => void
  onDelete: (project: Project) => void
  canDelete: boolean
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/projects/${project.id}`)}
      className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 p-6 transition-colors hover:border-indigo-500"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{project.name}</h3>
        <div className="flex flex-shrink-0 items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_BADGE_STYLES[project.type]}`}
          >
            {t(`common.platforms.${project.type.toLowerCase()}`)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(project)
            }}
            aria-label={t('projects.editProjectAria')}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <Pencil size={14} />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(project)
              }}
              aria-label={t('projects.deleteProjectAria')}
              className="rounded-lg p-1 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <p className="mb-6 line-clamp-2 text-sm text-gray-400">
        {project.description || t('projects.noDescription')}
      </p>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <FolderOpen size={16} />
          {project.stats.jiraTasksCount} {t('projects.jiraTasks')}
        </span>
        <span className="flex items-center gap-1.5">
          <ClipboardList size={16} />
          {project.stats.testCasesCount} {t('projects.testCases')}
        </span>
      </div>
    </div>
  )
}

function ProjectCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-700 bg-gray-800 p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="h-5 w-2/3 rounded bg-gray-700" />
        <div className="h-5 w-14 rounded-full bg-gray-700" />
      </div>
      <div className="mb-2 h-3 w-full rounded bg-gray-700" />
      <div className="mb-6 h-3 w-3/4 rounded bg-gray-700" />
      <div className="flex gap-4">
        <div className="h-3 w-20 rounded bg-gray-700" />
        <div className="h-3 w-24 rounded bg-gray-700" />
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  useEffect(() => {
    document.title = `${t('projects.title')} — QA Platform`
  }, [t])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const { data: result, isLoading } = useQuery({
    queryKey: ['projects', page, debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<PaginatedResult<Project>>>(
        '/projects',
        { params: { page, limit: 12, search: debouncedSearch || undefined } },
      )
      return data.data
    },
  })
  const projects = result?.data

  const { mutate: deleteProject, isPending: isDeleting } = useMutation({
    mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success(t('projects.projectDeleted'))
      setDeletingProject(null)
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ?? t('projects.deleteFailed')
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })

  return (
    <div className="px-8 py-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">{t('projects.title')}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {t('projects.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('projects.searchPlaceholder')}
              className="w-56 rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex flex-shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            <Plus size={18} />
            {t('projects.newProject')}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )}

      {!isLoading && projects && projects.length === 0 && debouncedSearch && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-24 text-center">
          <Search size={40} className="mb-4 text-gray-600" />
          <p className="text-gray-400">
            {t('projects.noProjectsMatch', { search: debouncedSearch })}
          </p>
        </div>
      )}

      {!isLoading && projects && projects.length === 0 && !debouncedSearch && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-24 text-center">
          <FolderOpen size={40} className="mb-4 text-gray-600" />
          <p className="mb-4 text-gray-400">{t('projects.noProjectsYet')}</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {t('projects.createFirst')}
          </button>
        </div>
      )}

      {!isLoading && projects && projects.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={setEditingProject}
                onDelete={setDeletingProject}
                canDelete={user?.role === 'ADMIN'}
              />
            ))}
          </div>
          <Pagination
            page={result!.page}
            totalPages={result!.totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      {isModalOpen && (
        <NewProjectModal onClose={() => setIsModalOpen(false)} />
      )}

      {editingProject && (
        <NewProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
        />
      )}

      {deletingProject && (
        <ConfirmDialog
          title={t('projects.deleteProjectTitle', { name: deletingProject.name })}
          message={t('projects.deleteProjectMessage')}
          confirmLabel={t('common.delete')}
          isDanger
          isPending={isDeleting}
          onConfirm={() => deleteProject(deletingProject.id)}
          onCancel={() => setDeletingProject(null)}
        />
      )}
    </div>
  )
}
