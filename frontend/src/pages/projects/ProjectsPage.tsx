import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, FolderOpen, Pencil, Plus } from 'lucide-react'
import api from '../../api/client'
import type { ApiResponse, Project } from '../../types'
import NewProjectModal from './NewProjectModal'

const TYPE_BADGE_STYLES: Record<Project['type'], string> = {
  WEB: 'bg-blue-500/10 text-blue-400 border border-blue-500/30',
  ANDROID: 'bg-green-500/10 text-green-400 border border-green-500/30',
  IOS: 'bg-purple-500/10 text-purple-400 border border-purple-500/30',
}

function ProjectCard({
  project,
  onEdit,
}: {
  project: Project
  onEdit: (project: Project) => void
}) {
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
            {project.type}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(project)
            }}
            aria-label="Edit project"
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-700 hover:text-white"
          >
            <Pencil size={14} />
          </button>
        </div>
      </div>

      <p className="mb-6 line-clamp-2 text-sm text-gray-400">
        {project.description || 'No description'}
      </p>

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <FolderOpen size={16} />
          {project.stats.jiraTasksCount} Jira Tasks
        </span>
        <span className="flex items-center gap-1.5">
          <ClipboardList size={16} />
          {project.stats.testCasesCount} Test Cases
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Project[]>>('/projects')
      return data.data
    },
  })

  return (
    <div className="px-8 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Projects</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your testing projects
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          <Plus size={18} />
          New Project
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )}

      {!isLoading && projects && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-700 py-24 text-center">
          <FolderOpen size={40} className="mb-4 text-gray-600" />
          <p className="mb-4 text-gray-400">No projects yet</p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            Create your first project
          </button>
        </div>
      )}

      {!isLoading && projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={setEditingProject}
            />
          ))}
        </div>
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
    </div>
  )
}
