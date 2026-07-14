import ProjectCard from './ProjectCard'
import type { PortfolioProject } from '../../types/portfolio'

interface Props {
  projects: PortfolioProject[]
  onUpdate: (id: string, patch: Partial<Omit<PortfolioProject, 'id'>>) => void
  onDelete: (id: string) => void
  onAdd: () => void
}

export default function ProjectCards({ projects, onUpdate, onDelete, onAdd }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          project={p}
          onUpdate={(patch) => onUpdate(p.id, patch)}
          onDelete={() => onDelete(p.id)}
        />
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="flex min-h-40 items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 text-sm font-semibold text-ink-400 transition hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600"
      >
        ＋ Add project
      </button>
    </div>
  )
}
