import React, { useState } from 'react';
import { Project } from '../types';
import {
  ExternalLink,
  Edit2,
  Trash2,
  FileCode2,
  Layers,
  ArrowRight,
  Code2,
  Info,
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onViewLogs: (projectId: string) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onSelect,
  onEdit,
  onDelete,
  onViewLogs,
}) => {
  const [imgError, setImgError] = useState(false);
  const isDev = project.status === '개발 중';
  const hasLiveUrl = Boolean(project.liveUrl && project.liveUrl.trim().length > 0);
  const logCount = project.workLogs ? project.workLogs.length : 0;

  return (
    <div className="group relative flex flex-col justify-between bg-[#111620] hover:bg-[#141A26] border border-[#21262D] hover:border-[#384152] rounded-xl overflow-hidden transition-all shadow-xs">
      <div>
        {/* Representative Image or Minimal Graphic Header */}
        <div className="relative w-full h-36 bg-[#0D1117] border-b border-[#21262D] overflow-hidden">
          {project.thumbnailUrl && !imgError ? (
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300 opacity-90 group-hover:opacity-100"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#161B22] via-[#0E131F] to-[#1A1829] flex flex-col justify-between p-3.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/40">
                  <Code2 className="w-3 h-3 text-purple-400" />
                  {project.category || '개발 프로젝트'}
                </span>
                <span className="text-[10px] font-mono text-[#6E7681]">MinLab Archive</span>
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-mono font-medium text-[#C9D1D9] truncate">
                  {project.englishName || project.name}
                </div>
                <div className="text-[10px] text-[#6E7681] font-mono">
                  {project.techStack?.slice(0, 3).join(' • ') || 'Tech Stack'}
                </div>
              </div>
            </div>
          )}

          {/* Sample Data Badge vs User Data Badge */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
            {project.isSample ? (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-950/80 text-amber-300 border border-amber-800/60 shadow-xs backdrop-blur-xs"
                title="MinLab 기본 제공 샘플 프로젝트"
              >
                <Info className="w-2.5 h-2.5" />
                샘플 데이터
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#161B22]/80 text-[#8B949E] border border-[#30363D] backdrop-blur-xs">
                사용자 프로젝트
              </span>
            )}
          </div>

          {/* Status Indicator Badge */}
          <div className="absolute top-2.5 right-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-xs border shadow-xs ${
                project.status === '완성' || project.status === '완료'
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                  : project.status === '구상 중'
                  ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                  : project.status === '보류'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  project.status === '완성' || project.status === '완료'
                    ? 'bg-emerald-400'
                    : project.status === '구상 중'
                    ? 'bg-sky-400'
                    : project.status === '보류'
                    ? 'bg-amber-400'
                    : 'bg-purple-400 animate-pulse'
                }`}
              />
              {project.status === '완료' ? '완성' : project.status}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-4 sm:p-5 space-y-3">
          {/* Header & Quick Action Icons */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5 min-w-0">
              <h3
                onClick={() => onSelect(project)}
                className="text-base font-semibold text-[#F0F6FC] hover:text-purple-300 transition-colors cursor-pointer truncate"
              >
                {project.name}
              </h3>
              {project.englishName && (
                <p className="text-xs font-mono text-[#8B949E] truncate">
                  {project.englishName}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(project)}
                title="프로젝트 정보 수정"
                className="p-1 rounded text-[#6E7681] hover:text-[#C9D1D9] hover:bg-[#1C2128] transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(project)}
                title="프로젝트 삭제"
                className="p-1 rounded text-[#6E7681] hover:text-rose-400 hover:bg-[#1C2128] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-[#8B949E] leading-relaxed line-clamp-2 min-h-[2rem]">
            {project.description || '등록된 프로젝트 소개가 없습니다.'}
          </p>

          {/* Tech Stack Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {project.techStack && project.techStack.length > 0 ? (
              project.techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded text-[11px] font-mono text-[#8B949E] bg-[#161B22] border border-[#21262D]"
                >
                  {tech}
                </span>
              ))
            ) : (
              <span className="text-[11px] text-[#6E7681] italic">기술 스택 미지정</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer: Metadata and the 3 Required Action Buttons */}
      <div className="px-4 sm:px-5 pb-4 pt-2 border-t border-[#1C2128] space-y-3 bg-[#0E121A]/40">
        {/* Quick Meta Row */}
        <div className="flex items-center justify-between text-[11px] text-[#6E7681] font-mono">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#6E7681]" />
            <span>기능 {project.keyFeatures?.length || 0}개</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileCode2 className="w-3 h-3 text-[#6E7681]" />
            <span>기록 {logCount}건</span>
          </div>
        </div>

        {/* The 3 Required Action Buttons */}
        <div className="grid grid-cols-3 gap-1.5 pt-1 text-xs font-medium">
          {/* 1. 프로젝트 상세 보기 */}
          <button
            onClick={() => onSelect(project)}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[#E6EDF3] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] hover:border-purple-500/50 transition-colors"
          >
            <span>상세 보기</span>
            <ArrowRight className="w-3 h-3 text-[#8B949E]" />
          </button>

          {/* 2. 프로젝트 실행 (실제 배포 URL이 없는 프로젝트는 비활성화/준비 중으로 표시) */}
          {hasLiveUrl ? (
            <a
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-white bg-purple-600 hover:bg-purple-500 transition-colors text-center truncate shadow-xs"
              title={`새 탭에서 실행: ${project.liveUrl}`}
            >
              <span>실행</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[#6E7681] bg-[#161B22]/60 border border-[#21262D] cursor-not-allowed text-center truncate"
              title="실제 프로그램 실행 URL이 등록되지 않은 상태입니다 (준비 중)"
            >
              <span>준비 중</span>
            </button>
          )}

          {/* 3. 개발 기록 보기 (해당 프로젝트의 개발 기록 페이지로 이동) */}
          <button
            onClick={() => onViewLogs(project.id)}
            className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] hover:border-purple-500/50 transition-colors"
            title="이 프로젝트의 개발 기록 및 변경 이력 보기"
          >
            <FileCode2 className="w-3 h-3 text-purple-400 shrink-0" />
            <span className="truncate">개발 기록 보기</span>
          </button>
        </div>
      </div>
    </div>
  );
};
