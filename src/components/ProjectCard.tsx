import React, { useEffect, useState } from 'react';
import { Project } from '../types';
import { normalizeProjectStatus } from '../utils/storage';
import { ArrowUpRight, Code2, Edit2, Eye, Github, Trash2 } from 'lucide-react';
import { routeHash } from '../utils/navigation';

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onPreview: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onEdit, onDelete, onPreview }) => {
  const [imgError, setImgError] = useState(false);
  useEffect(() => setImgError(false), [project.thumbnailUrl]);
  const status = normalizeProjectStatus(project.status);
  const hasPreviewUrl = Boolean(project.previewUrl?.trim() || project.liveUrl?.trim());
  const projectHref = routeHash({ view: 'project', projectId: project.id });
  const statusStyle = status === '완성'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === '보류'
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : status === '구상 중'
    ? 'border-line bg-surface text-muted'
    : 'border-accent-line bg-accent-soft text-accent';

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface transition duration-200 hover:border-line-strong hover:shadow-[0_8px_24px_-12px_rgba(24,33,49,0.14)]">
      <a
        href={projectHref}
        aria-label={project.name + ' 프로젝트 열기'}
        className="relative block h-44 w-full shrink-0 overflow-hidden border-b border-line text-left"
      >
        {project.thumbnailUrl && !imgError ? (
          <img src={project.thumbnailUrl} alt={project.name} onError={() => setImgError(true)} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="project-cover relative flex h-full flex-col justify-between p-5">
            <div aria-hidden="true" className="project-cover-orbit" />
            <span className="relative z-10 grid h-9 w-9 place-items-center rounded-xl border border-accent-line bg-surface/80 text-accent">
              <Code2 className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <div className="relative z-10 max-w-[85%]">
              <p className="mb-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-accent">MinLab / Project</p>
              <p className="line-clamp-2 text-sm font-semibold tracking-tight text-ink">{project.englishName || project.name}</p>
            </div>
          </div>
        )}
        <span className={'absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-medium ' + statusStyle}>{status}</span>
        <span className="absolute bottom-3 right-3 grid h-7 w-7 place-items-center rounded-full border border-line bg-surface/90 text-ink-secondary transition group-hover:border-accent-line group-hover:text-accent">
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </a>

      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="truncate text-[10px] font-medium text-accent">{project.category || '프로젝트'}</p>
          <div className="flex shrink-0 items-center gap-1">
            {project.isSample && <span className="mr-1 text-[9px] text-muted">샘플</span>}
            <button type="button" onClick={() => onEdit(project)} title="프로젝트 정보 수정" aria-label={project.name + ' 수정'} className="rounded p-1 text-muted transition hover:bg-surface-alt hover:text-ink">
              <Edit2 className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => onDelete(project)} title="프로젝트 삭제" aria-label={project.name + ' 삭제'} className="rounded p-1 text-muted transition hover:bg-rose-50 hover:text-rose-700">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <h3 className="text-[15px] font-semibold leading-6 tracking-[-0.03em] text-ink">
          <a href={projectHref} className="line-clamp-2 text-left transition hover:text-accent">{project.name}</a>
        </h3>
        <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted">{project.description || '프로젝트 소개를 추가해 보세요.'}</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {project.techStack?.length ? project.techStack.map((tech) => (
            <span key={tech} className="rounded bg-surface-alt px-2 py-1 text-[10px] font-medium text-ink-secondary">{tech}</span>
          )) : <span className="py-1 text-[10px] text-muted">기술 스택 미지정</span>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-line bg-canvas/50 px-4 py-3 text-[11px] font-medium">
        <button type="button" disabled={!hasPreviewUrl} onClick={() => onPreview(project)} className="flex items-center justify-center gap-1 rounded-md border border-line bg-surface py-2 text-ink-secondary transition hover:border-accent-line hover:text-accent disabled:cursor-not-allowed disabled:opacity-40">
          <Eye className="h-3 w-3" />미리보기
        </button>
        <a href={projectHref} className="flex items-center justify-center gap-1 rounded-md bg-accent py-2 text-white transition hover:bg-accent-hover">프로젝트 열기<ArrowUpRight className="h-3 w-3" /></a>
        {project.githubUrl ? <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-md border border-line bg-surface py-2 text-ink-secondary hover:text-accent"><Github className="h-3 w-3" />저장소</a> : <span className="flex items-center justify-center text-[10px] text-muted">저장소 미연결</span>}
      </div>
    </article>
  );
};
