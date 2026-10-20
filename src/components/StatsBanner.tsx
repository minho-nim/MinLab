import React from 'react';
import { Project } from '../types';

interface StatsBannerProps {
  projects: Project[];
  activeFilter: string;
  onSelectFilter: (filter: string) => void;
  categories: string[];
}

export const StatsBanner: React.FC<StatsBannerProps> = ({
  projects,
  activeFilter,
  onSelectFilter,
  categories,
}) => {
  const totalProjects = projects.length;
  const inDevCount = projects.filter((p) => p.status === '개발 중').length;
  const totalLogs = projects.reduce((acc, p) => acc + (p.workLogs?.length || 0), 0);

  return (
    <div className="space-y-6 pt-2 pb-2">
      {/* Editorial Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F0F6FC]">
          프로젝트 아카이브
        </h1>
        <p className="text-sm text-[#8B949E] leading-relaxed max-w-2xl">
          실무 자동화와 엔지니어링 프로젝트의 기획, 구현, 문제 해결 과정을 기록하고 보관하는 개발 아카이브입니다.
        </p>
      </div>

      {/* Filter and Stats Bar with Thin Divider */}
      <div className="pt-4 border-t border-[#21262D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => onSelectFilter('전체')}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
              activeFilter === '전체'
                ? 'bg-[#21262D] text-[#F0F6FC] font-medium border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]'
            }`}
          >
            전체 <span className="text-[#6E7681] ml-0.5">{totalProjects}</span>
          </button>

          <button
            onClick={() => onSelectFilter('개발 중')}
            className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
              activeFilter === '개발 중'
                ? 'bg-[#21262D] text-[#F0F6FC] font-medium border border-[#30363D]'
                : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]'
            }`}
          >
            개발 중 <span className="text-[#6E7681] ml-0.5">{inDevCount}</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectFilter(cat)}
              className={`px-2.5 py-1 rounded-md text-xs transition-colors whitespace-nowrap ${
                activeFilter === cat
                  ? 'bg-[#21262D] text-[#F0F6FC] font-medium border border-[#30363D]'
                  : 'text-[#8B949E] hover:text-[#F0F6FC] hover:bg-[#161B22]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Small Meta Count */}
        <div className="text-xs text-[#8B949E] font-mono shrink-0 hidden sm:block">
          {totalProjects}개 프로젝트 · {totalLogs}건의 개발 기록
        </div>
      </div>
    </div>
  );
};
