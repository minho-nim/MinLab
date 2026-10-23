import React from 'react';
import { NavigationTab } from '../types';
import { ArrowUpRight, Download, Plus, Search, X } from 'lucide-react';

interface NavbarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenNewProjectModal: () => void;
  onOpenBackupModal: () => void;
  onNavigateHome: () => void;
  totalProjectsCount?: number;
  totalLogsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab, onSelectTab, searchQuery, onSearchChange,
  onOpenNewProjectModal, onOpenBackupModal, onNavigateHome,
  totalProjectsCount = 0, totalLogsCount = 0,
}) => {
  const items: { id: NavigationTab; label: string; count: number }[] = [
    { id: 'projects', label: '아카이브', count: totalProjectsCount },
    { id: 'development-log', label: '개발일지', count: totalLogsCount },
  ];

  const search = (mobile: boolean) => (
    <div className={mobile ? 'relative w-full md:hidden' : 'relative ml-auto hidden w-56 md:block lg:w-64'}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="프로젝트, 기술 검색"
        aria-label="프로젝트와 기술 검색"
        className="h-9 w-full rounded-lg border border-line bg-canvas pl-9 pr-9 text-xs text-ink placeholder:text-muted transition focus:border-accent focus:bg-surface focus:outline-none"
      />
      {searchQuery && (
        <button type="button" onClick={() => onSearchChange('')} aria-label="검색 지우기" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink">
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center gap-6 px-4 sm:px-6 lg:gap-10 lg:px-8">
        <button
          type="button"
          aria-label="MinLab 홈으로 이동"
          onClick={() => { onNavigateHome(); onSelectTab('projects'); }}
          className="group flex shrink-0 items-center gap-2.5"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-white transition group-hover:bg-accent-hover">
            <ArrowUpRight className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="text-xl font-bold tracking-[-0.055em] text-ink">MinLab<span className="text-accent">.</span></span>
        </button>

        <nav aria-label="메인 메뉴" className="hidden h-full shrink-0 gap-6 md:flex">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={currentTab === item.id ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={'flex items-center gap-2 border-b-2 px-0.5 pt-0.5 text-sm font-medium transition ' + (currentTab === item.id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink')}
            >
              {item.label}
              <span className="text-[10px] tabular-nums text-muted">{item.count}</span>
            </button>
          ))}
        </nav>

        {search(false)}

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
          <button type="button" onClick={onOpenBackupModal} title="JSON 백업·복원" className="flex h-9 items-center gap-1.5 rounded-lg border border-line px-2.5 text-xs font-medium text-ink-secondary transition hover:border-line-strong hover:bg-canvas">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">백업·복원</span>
          </button>
          <button type="button" onClick={onOpenNewProjectModal} className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white transition hover:bg-accent-hover">
            <Plus className="h-3.5 w-3.5" />
            <span>새 프로젝트</span>
          </button>
        </div>
      </div>

      <div className="space-y-3 border-t border-line px-4 pb-3 md:hidden">
        <nav aria-label="모바일 메뉴" className="flex gap-5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={currentTab === item.id ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={'flex items-center gap-2 border-b-2 py-3 text-xs font-medium ' + (currentTab === item.id ? 'border-accent text-ink' : 'border-transparent text-muted')}
            >
              {item.label}<span className="text-[10px] text-muted">{item.count}</span>
            </button>
          ))}
        </nav>
        {search(true)}
      </div>
    </header>
  );
};
