import type { Project } from '../types';
import { ArrowLeft, ArrowUpRight, FileText, Settings } from 'lucide-react';
import { ProjectPreview } from './ProjectPreview';
import { routeHash } from '../utils/navigation';
import { normalizeProjectStatus } from '../utils/storage';

export function ProjectPage({ project }: { project: Project }) {
  const appUrl = project.previewUrl?.trim() || project.liveUrl?.trim();
  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <a href={routeHash({ view: 'archive' })} className="inline-flex items-center gap-1.5 text-muted hover:text-accent"><ArrowLeft className="h-3.5 w-3.5" />아카이브로 돌아가기</a>
        <div className="flex items-center gap-2">
          <a href={routeHash({ view: 'records', projectId: project.id })} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-ink-secondary hover:border-accent-line hover:text-accent"><FileText className="h-3.5 w-3.5" />개발일지</a>
          <a href={routeHash({ view: 'manage', projectId: project.id })} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-muted hover:text-ink"><Settings className="h-3.5 w-3.5" />프로젝트 관리</a>
        </div>
      </div>
      <header className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted"><span className="text-accent">{project.category}</span><span>·</span><span>{normalizeProjectStatus(project.status)}</span></div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{project.name}</h1>
        {project.description && <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-ink-secondary">{project.description}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {project.techStack.map(tech => <span key={tech} className="rounded-md bg-surface-alt px-2.5 py-1 text-[11px] text-muted">{tech}</span>)}
          {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-accent">GitHub 저장소<ArrowUpRight className="h-3.5 w-3.5" /></a>}
        </div>
      </header>
      {appUrl ? <ProjectPreview key={project.id + appUrl} name={project.name} url={appUrl} autoOpen /> : (
        <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-14 text-center text-sm text-muted">아직 실행 사이트가 연결되지 않았습니다.</div>
      )}
      {project.keyFeatures.length > 0 && <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="text-sm font-semibold text-ink">주요 기능</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">{project.keyFeatures.map((feature, index) => <li key={typeof feature === 'string' ? index : feature.id} className="rounded-lg bg-canvas p-3 text-xs leading-6 text-ink-secondary">{typeof feature === 'string' ? feature : feature.name}{typeof feature !== 'string' && feature.description && <p className="mt-1 text-muted">{feature.description}</p>}</li>)}</ul>
      </section>}
    </div>
  );
}
