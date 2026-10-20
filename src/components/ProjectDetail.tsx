import React, { useState } from 'react';
import { Project, WorkLog, ChangelogItem, ProjectStatus } from '../types';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  Plus,
  ExternalLink,
  Check,
  X,
  Link2Off,
} from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updated: Project) => void;
  onOpenEditProjectModal: (project: Project) => void;
  onOpenAddWorkLogModal: (project: Project, existingLog?: WorkLog | null) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const STATUS_OPTIONS: ProjectStatus[] = ['기획 중', '개발 중', '테스트 중', '완료', '운영 중'];

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onUpdateProject,
  onOpenEditProjectModal,
  onOpenAddWorkLogModal,
  showToast,
}) => {
  // Features state
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [editFeatureText, setEditFeatureText] = useState('');

  // Tech stack state
  const [isAddingTech, setIsAddingTech] = useState(false);
  const [newTechText, setNewTechText] = useState('');

  // Live URL inline state
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [urlInput, setUrlInput] = useState(project.liveUrl || '');

  // Changelog state
  const [isAddingChangelog, setIsAddingChangelog] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newChangelogDate, setNewChangelogDate] = useState(new Date().toISOString().split('T')[0]);
  const [newChangelogDesc, setNewChangelogDesc] = useState('');

  // Work log expanded state (track which log IDs have details open)
  // By default, open all logs if 3 or fewer
  const [expandedLogIds, setExpandedLogIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    (project.workLogs || []).forEach((l) => {
      initial[l.id] = true;
    });
    return initial;
  });

  const toggleLogExpansion = (id: string) => {
    setExpandedLogIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 1. Feature Handlers
  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    const updatedFeatures = [...(project.keyFeatures || []), newFeatureText.trim()];
    const updated: Project = {
      ...project,
      keyFeatures: updatedFeatures,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setNewFeatureText('');
    setIsAddingFeature(false);
    showToast('기능이 추가되었습니다.', 'success');
  };

  const handleSaveFeatureEdit = (index: number) => {
    if (!editFeatureText.trim()) return;
    const updatedFeatures = [...(project.keyFeatures || [])];
    updatedFeatures[index] = editFeatureText.trim();
    const updated: Project = {
      ...project,
      keyFeatures: updatedFeatures,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setEditingFeatureIndex(null);
    showToast('기능이 수정되었습니다.', 'success');
  };

  const handleDeleteFeature = (index: number) => {
    const updatedFeatures = project.keyFeatures.filter((_, i) => i !== index);
    const updated: Project = {
      ...project,
      keyFeatures: updatedFeatures,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    showToast('기능이 삭제되었습니다.', 'info');
  };

  // 2. Tech Stack Handlers
  const handleAddTech = () => {
    if (!newTechText.trim()) return;
    const trimmed = newTechText.trim();
    if (project.techStack.includes(trimmed)) {
      showToast('이미 등록된 기술입니다.', 'error');
      return;
    }
    const updatedTech = [...(project.techStack || []), trimmed];
    const updated: Project = {
      ...project,
      techStack: updatedTech,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setNewTechText('');
    setIsAddingTech(false);
    showToast(`기술 '${trimmed}'이(가) 추가되었습니다.`, 'success');
  };

  const handleDeleteTech = (tech: string) => {
    const updatedTech = project.techStack.filter((t) => t !== tech);
    const updated: Project = {
      ...project,
      techStack: updatedTech,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    showToast(`기술 '${tech}'이(가) 삭제되었습니다.`, 'info');
  };

  // 3. Live URL Handlers
  const handleSaveUrl = () => {
    const updated: Project = {
      ...project,
      liveUrl: urlInput.trim(),
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setIsEditingUrl(false);
    showToast(urlInput.trim() ? '실행 주소가 등록되었습니다.' : '실행 주소가 미등록으로 변경되었습니다.', 'success');
  };

  // 4. Status Change Handler
  const handleStatusChange = (newStatus: ProjectStatus) => {
    const updated: Project = {
      ...project,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    showToast(`진행 상태가 '${newStatus}'(으)로 변경되었습니다.`, 'success');
  };

  // 5. Changelog Handlers
  const handleAddChangelog = () => {
    if (!newVersion.trim() || !newChangelogDesc.trim()) {
      showToast('버전과 변경 내용을 입력해 주세요.', 'error');
      return;
    }
    const newItem: ChangelogItem = {
      id: `cl-${Date.now()}`,
      version: newVersion.trim(),
      date: newChangelogDate || new Date().toISOString().split('T')[0],
      description: newChangelogDesc.trim(),
    };
    const updatedChangelog = [newItem, ...(project.changelog || [])];
    const updated: Project = {
      ...project,
      changelog: updatedChangelog,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setNewVersion('');
    setNewChangelogDesc('');
    setIsAddingChangelog(false);
    showToast('변경 내역이 추가되었습니다.', 'success');
  };

  const handleDeleteChangelog = (id: string) => {
    const updatedChangelog = (project.changelog || []).filter((item) => item.id !== id);
    const updated: Project = {
      ...project,
      changelog: updatedChangelog,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    showToast('변경 내역이 삭제되었습니다.', 'info');
  };

  // 6. Work Log Delete Handler
  const handleDeleteLog = (logId: string) => {
    if (window.confirm('이 개발 기록을 삭제하시겠습니까?')) {
      const updatedLogs = project.workLogs.filter((log) => log.id !== logId);
      const updated: Project = {
        ...project,
        workLogs: updatedLogs,
        updatedAt: new Date().toISOString(),
      };
      onUpdateProject(updated);
      showToast('개발 기록이 삭제되었습니다.', 'info');
    }
  };

  // Sort logs by date descending
  const sortedLogs = [...(project.workLogs || [])].sort((a, b) => b.date.localeCompare(a.date));
  const isDev = project.status === '개발 중';

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header: Back Link & Main Actions */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>프로젝트 목록</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpenEditProjectModal(project)}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors"
          >
            정보 수정
          </button>
          <button
            onClick={() => onOpenAddWorkLogModal(project, null)}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
          >
            + 기록 추가
          </button>
        </div>
      </div>

      {/* Project Overview Area */}
      <div className="space-y-4">
        {/* Status & Category */}
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-[#C9D1D9]">
            <span
              className={`w-2 h-2 rounded-full ${
                isDev ? 'bg-purple-400' : 'bg-emerald-400'
              }`}
            />
            {project.status}
          </span>
          <span className="text-[#30363D]">/</span>
          <span className="text-[#8B949E]">{project.category}</span>
        </div>

        {/* Title & English Subtitle */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F0F6FC]">
            {project.name}
          </h1>
          {project.englishName && (
            <p className="text-xs sm:text-sm font-mono text-[#8B949E] mt-1">
              {project.englishName}
            </p>
          )}
        </div>

        {/* Description: 1-2 lines */}
        <p className="text-sm text-[#C9D1D9] leading-relaxed max-w-3xl">
          {project.description}
        </p>

        {/* Clean Info Row with Thin Divider */}
        <div className="pt-4 border-t border-[#21262D] flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-[#8B949E] font-mono">
          <div>
            <span className="text-[#6E7681] mr-1.5">등록일</span>
            <span className="text-[#C9D1D9]">
              {project.createdAt ? project.createdAt.split('T')[0] : '2026-10-15'}
            </span>
          </div>
          <span className="text-[#30363D]">·</span>
          <div>
            <span className="text-[#6E7681] mr-1.5">개발 기록</span>
            <span className="text-[#C9D1D9]">{project.workLogs?.length || 0}건</span>
          </div>
          <span className="text-[#30363D]">·</span>
          <div>
            <span className="text-[#6E7681] mr-1.5">기능</span>
            <span className="text-[#C9D1D9]">{project.keyFeatures?.length || 0}개</span>
          </div>
          <span className="text-[#30363D]">·</span>
          <div>
            <span className="text-[#6E7681] mr-1.5">사용 기술</span>
            <span className="text-[#C9D1D9]">
              {project.techStack?.length > 0 ? project.techStack.join(', ') : '미지정'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-4">
        {/* Left Main Column (8 cols) */}
        <div className="lg:col-span-8 space-y-12">
          {/* 1. 프로젝트 소개 */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E] pb-2 border-b border-[#21262D]">
              프로젝트 소개
            </h2>
            <div className="text-sm text-[#C9D1D9] leading-relaxed space-y-2">
              <p>
                {project.description}
              </p>
              <p className="text-xs text-[#8B949E]">
                현장별 상이한 서식과 요구사항을 표준화하고, 반복되는 수기 작성 과정을 자동화하여 업무 부담을 경감시키는 것을 목적으로 합니다.
              </p>
            </div>
          </section>

          {/* 2. 기능 (Key Features) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#21262D]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                기능
              </h2>

              {!isAddingFeature && (
                <button
                  onClick={() => setIsAddingFeature(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  + 기능 추가
                </button>
              )}
            </div>

            {/* Add Feature Input */}
            {isAddingFeature && (
              <div className="p-3 bg-[#161B22] border border-[#30363D] rounded-lg space-y-2.5">
                <input
                  type="text"
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddFeature()}
                  placeholder="추가할 기능 입력 (예: 위험 요인 템플릿 자동 분류)"
                  className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none focus:border-purple-500"
                  autoFocus
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => {
                      setIsAddingFeature(false);
                      setNewFeatureText('');
                    }}
                    className="px-2.5 py-1 text-[#8B949E] hover:text-[#F0F6FC]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddFeature}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-md font-medium"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            {/* Feature List or Empty State */}
            {(!project.keyFeatures || project.keyFeatures.length === 0) ? (
              <div className="py-4 text-xs text-[#8B949E] flex items-center justify-between">
                <span>등록된 기능이 없습니다.</span>
                {!isAddingFeature && (
                  <button
                    onClick={() => setIsAddingFeature(true)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    + 기능 추가
                  </button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-[#21262D]/60">
                {project.keyFeatures.map((feat, idx) => (
                  <li
                    key={idx}
                    className="py-2.5 flex items-start justify-between gap-3 group"
                  >
                    {editingFeatureIndex === idx ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editFeatureText}
                          onChange={(e) => setEditFeatureText(e.target.value)}
                          className="flex-1 px-2.5 py-1 bg-[#161B22] border border-purple-500 rounded-md text-xs text-[#E6EDF3] focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveFeatureEdit(idx)}
                          className="p-1 rounded text-emerald-400 hover:text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingFeatureIndex(null)}
                          className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC]"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-2.5 text-xs text-[#C9D1D9] leading-relaxed">
                          <span className="text-[#6E7681] font-mono mt-0.5">•</span>
                          <span>{feat}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => {
                              setEditingFeatureIndex(idx);
                              setEditFeatureText(feat);
                            }}
                            className="p-1 text-[#6E7681] hover:text-[#C9D1D9]"
                            title="수정"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteFeature(idx)}
                            className="p-1 text-[#6E7681] hover:text-rose-400"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 3. 개발 기록 (Work Logs - Primary Focus) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-[#21262D]">
              <div className="flex items-baseline gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                  개발 기록
                </h2>
                <span className="text-xs font-mono text-[#6E7681]">
                  ({sortedLogs.length})
                </span>
              </div>

              <button
                onClick={() => onOpenAddWorkLogModal(project, null)}
                className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
              >
                + 기록 추가
              </button>
            </div>

            {/* Timeline or Empty State */}
            {sortedLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#8B949E] space-y-2">
                <p>등록된 개발 기록이 없습니다.</p>
                <button
                  onClick={() => onOpenAddWorkLogModal(project, null)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 inline-block"
                >
                  + 첫 기록 추가
                </button>
              </div>
            ) : (
              <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#21262D]">
                {sortedLogs.map((log) => {
                  const isExpanded = !!expandedLogIds[log.id];
                  const hasDetails = Boolean(
                    log.issues || log.solution || log.testResult || log.nextSteps
                  );

                  return (
                    <article key={log.id} className="relative group space-y-2.5">
                      {/* Timeline Dot */}
                      <span className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#30363D] group-hover:bg-purple-400 border-2 border-[#0B0F17] transition-colors" />

                      {/* Log Header: Date and Actions */}
                      <div className="flex items-center justify-between text-xs">
                        <time className="font-mono text-[#8B949E]">
                          {log.date}
                        </time>

                        <div className="flex items-center gap-1.5 text-xs text-[#6E7681]">
                          <button
                            onClick={() => onOpenAddWorkLogModal(project, log)}
                            className="hover:text-[#C9D1D9] transition-colors"
                          >
                            수정
                          </button>
                          <span>·</span>
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="hover:text-rose-400 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </div>

                      {/* Primary Task Text */}
                      <div className="text-sm text-[#F0F6FC] font-medium leading-relaxed whitespace-pre-wrap">
                        {log.task}
                      </div>

                      {/* Collapsible Details Button */}
                      {hasDetails && (
                        <div>
                          <button
                            onClick={() => toggleLogExpansion(log.id)}
                            className="inline-flex items-center gap-1 text-[11px] text-[#8B949E] hover:text-[#C9D1D9] transition-colors py-0.5"
                          >
                            {isExpanded ? (
                              <>
                                <span>상세 내용 접기</span>
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                <span>상세 내용 보기 (문제점, 해결 방법, 테스트 결과, 다음 작업)</span>
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>

                          {/* Expanded Detail Rows */}
                          {isExpanded && (
                            <div className="mt-3 space-y-2.5 pl-3 border-l-2 border-[#21262D] text-xs">
                              {/* 문제점 */}
                              {log.issues && (
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-medium text-[#8B949E]">
                                    문제점
                                  </div>
                                  <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                                    {log.issues}
                                  </p>
                                </div>
                              )}

                              {/* 해결 방법 */}
                              {log.solution && (
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-medium text-[#8B949E]">
                                    해결 방법
                                  </div>
                                  <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                                    {log.solution}
                                  </p>
                                </div>
                              )}

                              {/* 테스트 결과 */}
                              {log.testResult && (
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-medium text-[#8B949E]">
                                    테스트 결과
                                  </div>
                                  <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                                    {log.testResult}
                                  </p>
                                </div>
                              )}

                              {/* 다음 작업 */}
                              {log.nextSteps && (
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-medium text-[#8B949E]">
                                    다음 작업
                                  </div>
                                  <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                                    {log.nextSteps}
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
          </section>

          {/* 4. 변경 내역 (Changelog) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#21262D]">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                변경 내역
              </h2>

              {!isAddingChangelog && (
                <button
                  onClick={() => setIsAddingChangelog(true)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                >
                  + 내역 추가
                </button>
              )}
            </div>

            {/* Add Changelog Form */}
            {isAddingChangelog && (
              <div className="p-3 bg-[#161B22] border border-[#30363D] rounded-lg space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    placeholder="버전 (예: v0.2.0)"
                    className="px-2.5 py-1 bg-[#0D1117] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] font-mono focus:outline-none"
                  />
                  <input
                    type="date"
                    value={newChangelogDate}
                    onChange={(e) => setNewChangelogDate(e.target.value)}
                    className="px-2.5 py-1 bg-[#0D1117] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none"
                  />
                </div>
                <textarea
                  rows={2}
                  value={newChangelogDesc}
                  onChange={(e) => setNewChangelogDesc(e.target.value)}
                  placeholder="변경 내용 작성"
                  className="w-full px-2.5 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none"
                />
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setIsAddingChangelog(false)}
                    className="px-2.5 py-1 text-[#8B949E] hover:text-[#F0F6FC]"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddChangelog}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-md font-medium"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}

            {/* Changelog List */}
            {(!project.changelog || project.changelog.length === 0) ? (
              <p className="text-xs text-[#8B949E] py-2">등록된 변경 내역이 없습니다.</p>
            ) : (
              <div className="space-y-3">
                {project.changelog.map((cl) => (
                  <div
                    key={cl.id}
                    className="flex items-start justify-between gap-4 text-xs group"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-[#F0F6FC]">
                          {cl.version}
                        </span>
                        <span className="text-[#6E7681] font-mono text-[11px]">
                          {cl.date}
                        </span>
                      </div>
                      <p className="text-[#8B949E] leading-relaxed">
                        {cl.description}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteChangelog(cl.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#6E7681] hover:text-rose-400 transition-opacity p-1"
                      title="삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar Column (4 cols) */}
        <aside className="lg:col-span-4 space-y-8">
          {/* 1. 진행 상태 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              진행 상태
            </h3>
            <div className="p-3 bg-[#111620] border border-[#21262D] rounded-lg">
              <select
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                className="w-full bg-[#161B22] border border-[#30363D] rounded-md px-2.5 py-1.5 text-xs text-[#E6EDF3] focus:outline-none focus:border-purple-500"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st} className="bg-[#161B22]">
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. 사용 기술 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                사용 기술
              </h3>
              {!isAddingTech && (
                <button
                  onClick={() => setIsAddingTech(true)}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  + 추가
                </button>
              )}
            </div>

            <div className="p-3 bg-[#111620] border border-[#21262D] rounded-lg space-y-2.5">
              {isAddingTech && (
                <div className="flex items-center gap-1.5 pb-2 border-b border-[#21262D]">
                  <input
                    type="text"
                    value={newTechText}
                    onChange={(e) => setNewTechText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTech()}
                    placeholder="기술명 입력"
                    className="flex-1 px-2 py-1 bg-[#161B22] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleAddTech}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs"
                  >
                    추가
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingTech(false);
                      setNewTechText('');
                    }}
                    className="p-1 text-[#8B949E] hover:text-[#F0F6FC]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {project.techStack && project.techStack.length > 0 ? (
                  project.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-[#C9D1D9] bg-[#161B22] border border-[#30363D]"
                    >
                      <span>{tech}</span>
                      <button
                        onClick={() => handleDeleteTech(tech)}
                        className="text-[#6E7681] hover:text-rose-400 transition-colors"
                        title="삭제"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-[#6E7681]">미지정</span>
                )}
              </div>
            </div>
          </div>

          {/* 3. 실행 주소 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
                실행 주소
              </h3>
              {!isEditingUrl && (
                <button
                  onClick={() => {
                    setUrlInput(project.liveUrl || '');
                    setIsEditingUrl(true);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300"
                >
                  {project.liveUrl ? '수정' : '+ 등록'}
                </button>
              )}
            </div>

            <div className="p-3 bg-[#111620] border border-[#21262D] rounded-lg">
              {isEditingUrl ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://... 또는 빈칸으로 미등록"
                    className="w-full px-2.5 py-1 bg-[#161B22] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex justify-end gap-1.5 text-xs">
                    <button
                      onClick={() => setIsEditingUrl(false)}
                      className="px-2 py-0.5 text-[#8B949E] hover:text-[#F0F6FC]"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSaveUrl}
                      className="px-2.5 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium"
                    >
                      저장
                    </button>
                  </div>
                </div>
              ) : project.liveUrl && project.liveUrl.trim().length > 0 ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-mono break-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>{project.liveUrl}</span>
                </a>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-[#6E7681]">
                  <Link2Off className="w-3.5 h-3.5" />
                  <span>미등록</span>
                </div>
              )}
            </div>
          </div>

          {/* 4. 프로젝트 정보 */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              프로젝트 정보
            </h3>
            <div className="p-3 bg-[#111620] border border-[#21262D] rounded-lg divide-y divide-[#21262D] text-xs">
              <div className="py-1.5 flex justify-between">
                <span className="text-[#8B949E]">카테고리</span>
                <span className="text-[#C9D1D9]">{project.category}</span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-[#8B949E]">등록일</span>
                <span className="font-mono text-[#C9D1D9]">
                  {project.createdAt ? project.createdAt.split('T')[0] : '2026-10-15'}
                </span>
              </div>
              <div className="py-1.5 flex justify-between">
                <span className="text-[#8B949E]">최종 수정</span>
                <span className="font-mono text-[#C9D1D9]">
                  {project.updatedAt ? project.updatedAt.split('T')[0] : '2026-10-19'}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
