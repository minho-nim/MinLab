import React from 'react';
import { Project } from '../types';
import { normalizeProjectStatus } from '../utils/storage';

interface StatsBannerProps {
  projects: Project[];
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  categories: string[];
}

export const StatsBanner: React.FC<StatsBannerProps> = ({ projects, activeFilter, onSelectFilter, categories }) => {
  const totalLogs = projects.reduce((count, project) => count + (project.workLogs?.length || 0), 0);
  const filters = ['전체', '개발 중', '완성', '구상 중', '보류'].map((name) => ({
    name,
    count: name === '전체' ? projects.length : projects.filter((project) => normalizeProjectStatus(project.status) === name).length,
  }));

  return (
    <section className="space-y-7">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-8 sm:px-9 sm:py-10">
        <div aria-hidden="true" className="archive-hero absolute inset-y-0 right-0 w-1/3 opacity-60 [mask-image:linear-gradient(to_right,transparent,black)]" />
        <div className="relative">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">MinLab / Personal archive</p>
          <h1 className="text-[30px] font-bold leading-tight tracking-[-0.055em] text-ink sm:text-[42px]">
            <span className="text-accent">AI 활용</span><span className="text-line-strong">,</span> 개발일지.
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted">
            <span>프로젝트 <strong className="ml-1 font-semibold tabular-nums text-ink">{projects.length}</strong></span>
            <span>개발 기록 <strong className="ml-1 font-semibold tabular-nums text-ink">{totalLogs}</strong></span>
            <span>프롬프트 <strong className="ml-1 font-semibold tabular-nums text-ink">{projects.reduce((count, project) => count + (project.promptHistory?.length || 0), 0)}</strong></span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight text-ink">프로젝트 <span className="ml-1.5 text-xs font-normal text-muted">{projects.length}</span></h2>
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1 scrollbar-none" aria-label="프로젝트 상태">
            {filters.map(({ name, count }) => (
              <button
                key={name}
                type="button"
                aria-pressed={activeFilter === name}
                onClick={() => onSelectFilter(name)}
                className={'shrink-0 rounded-md px-3 py-1.5 text-xs transition ' + (activeFilter === name ? 'bg-accent-soft font-semibold text-accent' : 'text-muted hover:bg-canvas hover:text-ink')}
              >
                {name}<span className="ml-1.5 text-[10px] font-normal tabular-nums opacity-75">{count}</span>
              </button>
            ))}
          </div>
        </div>
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" aria-label="프로젝트 분야">
            <button type="button" aria-pressed={activeFilter === '전체'} onClick={() => onSelectFilter('전체')} className={'rounded-full border px-3 py-1.5 text-[11px] transition ' + (activeFilter === '전체' ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-muted hover:border-line-strong')}>
              모든 분야
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                aria-pressed={activeFilter === category}
                onClick={() => onSelectFilter(category)}
                className={'rounded-full border px-3 py-1.5 text-[11px] transition ' + (activeFilter === category ? 'border-accent-line bg-accent-soft text-accent' : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink')}
              >
                {category}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};