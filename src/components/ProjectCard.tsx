import React from 'react';
import { Project } from '../types';
import { ArrowUpRight, Edit2, Link2Off } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onAddLog: (project: Project) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onEdit,
}) => {
  const isDev = project.status === '개발 중';
  const logCount = project.workLogs ? project.workLogs.length : 0;
  const latestLog = project.workLogs && project.workLogs.length > 0
    ? [...project.workLogs].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  return (
    <div
      onClick={() => onSelect(project)}
      className="group relative flex flex-col justify-between bg-[#111620] hover:bg-[#161B26] border border-[#21262D] hover:border-[#3B4455] rounded-xl p-5 sm:p-6 transition-all cursor-pointer"
    >
      <div>
        {/* Header: Title and Quick Edit */}
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-semibold text-[#F0F6FC] group-hover:text-purple-300 transition-colors leading-snug">
              {project.name}
            </h3>
            {project.englishName && (
              <p className="text-xs font-mono text-[#8B949E]">
                {project.englishName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(project);
              }}
              title="정보 수정"
              className="p-1.5 rounded-md text-[#6E7681] hover:text-[#C9D1D9] hover:bg-[#21262D] transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <span className="p-1.5 text-[#6E7681] group-hover:text-[#F0F6FC] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Description: 1-2 lines */}
        <p className="mt-3 text-xs sm:text-sm text-[#8B949E] leading-relaxed line-clamp-2">
          {project.description}
        </p>

        {/* Tech Stack subtle inline tags */}
        {project.techStack && project.techStack.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {project.techStack.map((tech) => (
              <span
                key={tech}
                className="px-2 py-0.5 rounded text-[11px] font-mono text-[#8B949E] bg-[#161B22] border border-[#21262D]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Meta Row */}
      <div className="mt-5 pt-4 border-t border-[#21262D] flex items-center justify-between text-xs text-[#8B949E] flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {/* Status Dot + Text */}
          <span className="inline-flex items-center gap-1.5 font-medium text-[#C9D1D9]">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isDev ? 'bg-purple-400' : 'bg-emerald-400'
              }`}
            />
            {project.status}
          </span>

          <span className="text-[#30363D]">·</span>
          <span>{project.category}</span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-[#6E7681]">
          <span>기록 {logCount}건</span>
          {latestLog && (
            <>
              <span className="text-[#30363D]">·</span>
              <span>최근 {latestLog.date}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
