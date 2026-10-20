import React, { useState, useMemo } from 'react';
import { Project, WorkLog } from '../types';
import {
  FileCode2,
  Plus,
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ArrowRight,
  GitBranch,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

interface DevelopmentLogViewProps {
  projects: Project[];
  selectedProjectIdFilter?: string | null;
  onSelectProjectIdFilter: (projectId: string | null) => void;
  onOpenAddLogModal: (defaultProjectId?: string | null, existingLog?: WorkLog | null) => void;
  onRequestDeleteLog: (log: WorkLog, targetProjectId: string) => void;
  onNavigateToProject: (projectId: string) => void;
}

export const DevelopmentLogView: React.FC<DevelopmentLogViewProps> = ({
  projects,
  selectedProjectIdFilter = null,
  onSelectProjectIdFilter,
  onOpenAddLogModal,
  onRequestDeleteLog,
  onNavigateToProject,
}) => {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>({});

  // Flatten all work logs from all projects
  const allLogs = useMemo(() => {
    const list: (WorkLog & { projectObj?: Project })[] = [];
    projects.forEach((proj) => {
      (proj.workLogs || []).forEach((log) => {
        list.push({
          ...log,
          projectId: log.projectId || proj.id,
          projectName: log.projectName || proj.name,
          projectObj: proj,
        });
      });
    });
    return list;
  }, [projects]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return allLogs
      .filter((log) => {
        // Project filter
        if (selectedProjectIdFilter && log.projectId !== selectedProjectIdFilter) {
          return false;
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const inTitle = (log.title || log.task || '').toLowerCase().includes(q);
          const inContent = (log.content || log.task || '').toLowerCase().includes(q);
          const inReason = (log.reason || log.issues || '').toLowerCase().includes(q);
          const inTest = (log.testResult || '').toLowerCase().includes(q);
          const inNext = (log.nextSteps || '').toLowerCase().includes(q);
          const inVer = (log.version || '').toLowerCase().includes(q);
          const inProj = (log.projectName || '').toLowerCase().includes(q);
          const inDate = (log.date || '').toLowerCase().includes(q);
          return inTitle || inContent || inReason || inTest || inNext || inVer || inProj || inDate;
        }

        return true;
      })
      .sort((a, b) => {
        const dateDiff = b.date.localeCompare(a.date);
        const finalDiff = sortOrder === 'desc' ? dateDiff : -dateDiff;
        if (finalDiff !== 0) return finalDiff;
        const aCreated = a.createdAt || a.id || '';
        const bCreated = b.createdAt || b.id || '';
        return sortOrder === 'desc'
          ? bCreated.localeCompare(aCreated)
          : aCreated.localeCompare(bCreated);
      });
  }, [allLogs, selectedProjectIdFilter, search, sortOrder]);

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#21262D]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#F0F6FC]">
              Development Log
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono text-purple-300 bg-purple-950/60 border border-purple-800/40">
              총 {filteredLogs.length}건
            </span>
          </div>
          <p className="text-xs text-[#8B949E] mt-1">
            프로젝트별 날짜, 버전, 변경 사항, 수정 이유, 테스트 결과, 다음 작업을 통합 관리합니다.
          </p>
        </div>

        <button
          onClick={() => onOpenAddLogModal(selectedProjectIdFilter || (projects[0]?.id ?? null), null)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ 새 개발 기록 등록</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-[#111620] border border-[#21262D] rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Project Selector Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Filter className="w-3.5 h-3.5 text-[#8B949E] shrink-0" />
          <span className="text-xs text-[#8B949E] shrink-0">프로젝트:</span>
          <select
            value={selectedProjectIdFilter || 'ALL'}
            onChange={(e) =>
              onSelectProjectIdFilter(e.target.value === 'ALL' ? null : e.target.value)
            }
            className="w-full px-2.5 py-1 bg-[#161B22] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none focus:border-purple-500 font-medium truncate"
          >
            <option value="ALL">전체 프로젝트 ({projects.length}개)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.workLogs?.length || 0}건)
              </option>
            ))}
          </select>
        </div>

        {/* Search & Sort */}
        <div className="flex items-center gap-2">
          {/* Keyword Search */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3 h-3 text-[#6E7681] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="내용, 이유, 버전 검색..."
              className="w-full pl-8 pr-3 py-1 bg-[#161B22] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Sort order toggle */}
          <button
            onClick={() => setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
            className="px-2.5 py-1 rounded-md text-xs font-mono text-[#8B949E] hover:text-[#F0F6FC] bg-[#161B22] border border-[#30363D] transition-colors shrink-0"
            title="정렬 변경"
          >
            {sortOrder === 'desc' ? '최신순 ↓' : '과거순 ↑'}
          </button>
        </div>
      </div>

      {/* Logs Timeline / List */}
      {filteredLogs.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#8B949E] border border-dashed border-[#21262D] rounded-xl space-y-3">
          <FileCode2 className="w-8 h-8 mx-auto text-[#6E7681]" />
          <p>등록된 개발 기록이 없거나 검색 결과가 없습니다.</p>
          <button
            onClick={() =>
              onOpenAddLogModal(selectedProjectIdFilter || (projects[0]?.id ?? null), null)
            }
            className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500"
          >
            + 첫 개발 기록 등록
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((log) => {
            const isExpanded = expandedLogIds[log.id] !== false; // 기본 펼침
            const logTitle = log.title || log.task || '작업 기록';
            const logContent = log.content || log.task || '';
            const logReason = log.reason || log.issues || '';
            const testResult = log.testResult || '';
            const nextSteps = log.nextSteps || '';

            return (
              <article
                key={log.id}
                className="p-4 sm:p-5 bg-[#111620] hover:bg-[#141A26] border border-[#21262D] hover:border-[#384152] rounded-xl transition-all space-y-3 shadow-xs"
              >
                {/* Header row: Project badge, Date, Version, Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1C2128]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Project link badge */}
                    <button
                      onClick={() => onNavigateToProject(log.projectId || '')}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium text-purple-300 bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/40 transition-colors"
                      title="해당 프로젝트 상세 페이지로 이동"
                    >
                      <span>{log.projectName || '프로젝트'}</span>
                      <ArrowUpRight className="w-3 h-3 text-purple-400" />
                    </button>

                    {/* Date */}
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-[#8B949E]">
                      <Calendar className="w-3 h-3 text-[#6E7681]" />
                      {log.date}
                    </span>

                    {/* Version */}
                    {log.version && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium text-[#C9D1D9] bg-[#161B22] border border-[#30363D]">
                        {log.version}
                      </span>
                    )}
                  </div>

                  {/* Actions: Edit, Delete */}
                  <div className="flex items-center gap-1.5 text-xs text-[#8B949E]">
                    <button
                      onClick={() => onOpenAddLogModal(log.projectId, log)}
                      className="px-2 py-0.5 rounded hover:bg-[#1C2128] hover:text-[#F0F6FC] transition-colors flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3 text-[#6E7681]" />
                      <span>수정</span>
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => onRequestDeleteLog(log, log.projectId || '')}
                      className="px-2 py-0.5 rounded hover:bg-rose-950/40 hover:text-rose-400 transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>삭제</span>
                    </button>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#F0F6FC]">
                    {logTitle}
                  </h3>
                </div>

                {/* Content / 변경 사항 */}
                {logContent && (
                  <div className="space-y-1">
                    <div className="text-[11px] font-medium text-[#8B949E]">변경 사항 / 수정 내용</div>
                    <p className="text-xs text-[#C9D1D9] leading-relaxed whitespace-pre-wrap bg-[#0D1117]/60 p-2.5 rounded-md border border-[#21262D]/60 font-sans">
                      {logContent}
                    </p>
                  </div>
                )}

                {/* Additional Details Toggle (Reason, Test Result, Next Steps) */}
                {(logReason || testResult || nextSteps) && (
                  <div>
                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-[#8B949E] hover:text-[#C9D1D9] py-0.5"
                    >
                      {isExpanded ? (
                        <>
                          <span>세부 정보 접기 (수정 이유, 테스트 결과, 다음 작업)</span>
                          <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          <span>세부 정보 보기 (수정 이유, 테스트 결과, 다음 작업)</span>
                          <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="mt-2.5 space-y-2.5 pl-3 border-l-2 border-[#21262D] text-xs">
                        {/* 수정 이유 */}
                        {logReason && (
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-medium text-amber-400/90">
                              수정 이유
                            </div>
                            <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                              {logReason}
                            </p>
                          </div>
                        )}

                        {/* 테스트 결과 */}
                        {testResult && (
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-medium text-emerald-400/90">
                              테스트 결과
                            </div>
                            <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                              {testResult}
                            </p>
                          </div>
                        )}

                        {/* 다음 작업 */}
                        {nextSteps && (
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-medium text-purple-400/90">
                              다음 작업 (Next Steps)
                            </div>
                            <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                              {nextSteps}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
