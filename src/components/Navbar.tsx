import React from 'react';
import { NavigationTab } from '../types';
import {
  Download,
  Plus,
  Search,
  Terminal,
  FolderGit2,
  FileCode2,
} from 'lucide-react';

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
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onOpenNewProjectModal,
  onOpenBackupModal,
  onNavigateHome,
  totalProjectsCount = 0,
  totalLogsCount = 0,
}) => {
  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; count?: number }[] = [
    {
      id: 'projects',
      label: 'Projects',
      icon: <FolderGit2 className="w-3.5 h-3.5" />,
      count: totalProjectsCount,
    },
    {
      id: 'development-log',
      label: 'Development Log',
      icon: <FileCode2 className="w-3.5 h-3.5" />,
      count: totalLogsCount,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0B0F17]/95 border-b border-[#21262D]">
      {/* Top Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => {
            onNavigateHome();
            onSelectTab('projects');
          }}
          className="flex items-center gap-2.5 cursor-pointer group shrink-0"
        >
          <div className="w-7 h-7 rounded-md bg-[#161B22] border border-[#30363D] group-hover:border-purple-500/60 flex items-center justify-center transition-colors">
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight text-[#F0F6FC]">
              MinLab
            </span>
            <span className="text-xs text-[#8B949E] font-normal hidden sm:inline">
              연구·개발 아카이브
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-4">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-[#6E7681] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="프로젝트, 기술, 개발 기록 검색..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#161B22] border border-[#30363D] hover:border-[#484F58] focus:border-purple-500 rounded-md text-xs text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-[#8B949E] hover:text-[#F0F6FC]"
              >
                지우기
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenBackupModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] hover:border-[#484F58] transition-colors"
            title="JSON 백업 및 복원 (LocalStorage 데이터 관리)"
          >
            <Download className="w-3.5 h-3.5 text-[#8B949E]" />
            <span className="hidden sm:inline">백업·복원</span>
          </button>

          <button
            onClick={onOpenNewProjectModal}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>새 프로젝트</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Menu Bar: Projects & Development Log */}
      <div className="border-t border-[#1C2128] bg-[#0E121A]/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between overflow-x-auto scrollbar-none">
          <nav className="flex items-center gap-1 py-1.5 min-w-max">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigateHome();
                    onSelectTab(item.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    isActive
                      ? 'text-[#F0F6FC] bg-[#1C2128] border border-[#30363D] shadow-xs'
                      : 'text-[#8B949E] hover:text-[#C9D1D9] hover:bg-[#161B22]/60 border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-purple-400' : 'text-[#6E7681]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                        isActive
                          ? 'bg-purple-950/70 text-purple-300 border border-purple-800/50'
                          : 'bg-[#21262D] text-[#8B949E]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Notice Pill for Storage */}
          <div className="hidden lg:flex items-center text-[11px] text-[#6E7681] font-mono pr-2">
            <span>로컬 저장소 보존 중 (JSON 백업 지원)</span>
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="md:hidden px-4 py-2 border-t border-[#1C2128]">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#6E7681] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="프로젝트, 기록 검색..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#161B22] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>
    </header>
  );
};
