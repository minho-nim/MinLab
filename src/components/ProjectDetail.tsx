import React, { useState, useMemo } from 'react';
import { Project, WorkLog, ChangelogItem, ProjectStatus, ProjectFeature, FeatureStatus } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { normalizeProjectStatus } from '../utils/storage';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  Trash2,
  ExternalLink,
  X,
  GitBranch,
  Terminal,
  Play,
  FileCode2,
  CheckCircle2,
  Clock,
  Layers,
  ArrowDown,
  ArrowUpRight,
  Code2,
} from 'lucide-react';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (updated: Project) => void;
  onOpenEditProjectModal: (project: Project) => void;
  onRequestDelete: () => void;
  onOpenAddWorkLogModal: (project: Project, existingLog?: WorkLog | null) => void;
  onNavigateToDevLog?: (projectId: string) => void;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

const STATUS_OPTIONS: ('구상 중' | '개발 중' | '완성' | '보류')[] = ['구상 중', '개발 중', '완성', '보류'];

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  onBack,
  onUpdateProject,
  onOpenEditProjectModal,
  onRequestDelete,
  onOpenAddWorkLogModal,
  onNavigateToDevLog,
  showToast,
}) => {
  // Normalize features to support both string[] and ProjectFeature[]
  const normalizedFeatures: ProjectFeature[] = useMemo(() => {
    return (project.keyFeatures || []).map((feat, idx) => {
      if (typeof feat === 'string') {
        return {
          id: `feat-${idx}`,
          name: feat,
          description: '',
          status: '진행 중',
        };
      }
      return {
        id: feat.id || `feat-${idx}`,
        name: feat.name || '',
        description: feat.description || '',
        status: feat.status || '진행 중',
      };
    });
  }, [project.keyFeatures]);

  // Features state
  const [isAddingFeature, setIsAddingFeature] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState('');
  const [newFeatureDesc, setNewFeatureDesc] = useState('');
  const [newFeatureStatus, setNewFeatureStatus] = useState<FeatureStatus>('진행 중');

  // Editing feature
  const [editingFeatureIndex, setEditingFeatureIndex] = useState<number | null>(null);
  const [editFeatureName, setEditFeatureName] = useState('');
  const [editFeatureDesc, setEditFeatureDesc] = useState('');
  const [editFeatureStatus, setEditFeatureStatus] = useState<FeatureStatus>('진행 중');

  // Confirmation Modals for Feature and Log
  const [featureToDelete, setFeatureToDelete] = useState<{ index: number; name: string } | null>(null);
  const [logToDelete, setLogToDelete] = useState<WorkLog | null>(null);

  // Tech stack state
  const [isAddingTech, setIsAddingTech] = useState(false);
  const [newTechText, setNewTechText] = useState('');

  // Changelog state
  const [isAddingChangelog, setIsAddingChangelog] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const [newChangelogDate, setNewChangelogDate] = useState(new Date().toISOString().split('T')[0]);
  const [newChangelogDesc, setNewChangelogDesc] = useState('');

  // Work log expanded state
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

  // Scroll to Development Logs section
  const scrollToDevLogs = () => {
    const elem = document.getElementById('work-logs-section');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 1. Feature Handlers
  const handleAddFeature = () => {
    if (!newFeatureName.trim()) {
      showToast('기능명을 입력해 주세요.', 'error');
      return;
    }
    const newFeature: ProjectFeature = {
      id: `feat-${Date.now()}`,
      name: newFeatureName.trim(),
      description: newFeatureDesc.trim(),
      status: newFeatureStatus,
    };
    const updatedFeatures = [...normalizedFeatures, newFeature];
    const updated: Project = {
      ...project,
      keyFeatures: updatedFeatures,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setNewFeatureName('');
    setNewFeatureDesc('');
    setNewFeatureStatus('진행 중');
    setIsAddingFeature(false);
    showToast('새 기능이 추가되었습니다.', 'success');
  };

  const startEditingFeature = (index: number, feat: ProjectFeature) => {
    setEditingFeatureIndex(index);
    setEditFeatureName(feat.name);
    setEditFeatureDesc(feat.description || '');
    setEditFeatureStatus(feat.status || '진행 중');
  };

  const handleSaveFeatureEdit = (index: number) => {
    if (!editFeatureName.trim()) {
      showToast('기능명을 입력해 주세요.', 'error');
      return;
    }
    const updatedFeatures = [...normalizedFeatures];
    updatedFeatures[index] = {
      ...updatedFeatures[index],
      name: editFeatureName.trim(),
      description: editFeatureDesc.trim(),
      status: editFeatureStatus,
    };
    const updated: Project = {
      ...project,
      keyFeatures: updatedFeatures,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setEditingFeatureIndex(null);
    showToast('기능 정보가 수정되었습니다.', 'success');
  };

  const handleConfirmDeleteFeature = () => {
    if (!featureToDelete) return;
    const deletedName = featureToDelete.name;
    const updatedFeatures = normalizedFeatures.filter((_, i) => i !== featureToDelete.index);
    const updated: Project = {
      ...project,
      keyFeatures: updatedFeatures,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setFeatureToDelete(null);
    showToast(`'${deletedName}' 기능이 삭제되었습니다.`, 'info');
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

  // 3. Status Change Handler
  const handleStatusChange = (newStatus: '구상 중' | '개발 중' | '완성' | '보류') => {
    const updated: Project = {
      ...project,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    showToast(`상태가 '${newStatus}'(으)로 변경되었습니다.`, 'success');
  };

  // 4. Changelog Handlers
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

  // 5. Work Log Delete Handler with Confirmation Modal
  const handleConfirmDeleteLog = () => {
    if (!logToDelete) return;
    const logName = logToDelete.title || logToDelete.task || `${logToDelete.date} 기록`;
    const updatedLogs = project.workLogs.filter((log) => log.id !== logToDelete.id);
    const updated: Project = {
      ...project,
      workLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setLogToDelete(null);
    showToast(`'${logName}' 개발 기록이 삭제되었습니다.`, 'info');
  };

  // Sort logs by date descending (최신 기록이 위에 표시)
  const sortedLogs = useMemo(() => {
    return [...(project.workLogs || [])].sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      const aCreated = a.createdAt || a.id || '';
      const bCreated = b.createdAt || b.id || '';
      return bCreated.localeCompare(aCreated);
    });
  }, [project.workLogs]);

  // Project type detection for execution area
  const normalizedStatus = normalizeProjectStatus(project.status);
  const isConceptual = normalizedStatus === '구상 중';
  const isDev = normalizedStatus === '개발 중';
  const isCompleted = normalizedStatus === '완성';
  const isPaused = normalizedStatus === '보류';

  const hasLiveUrl = Boolean(project.liveUrl && project.liveUrl.trim().length > 0);
  const hasGithubUrl = Boolean(project.githubUrl && project.githubUrl.trim().length > 0);

  const isPythonOrDesktop = Boolean(
    project.techStack?.some((t) => /python|pyqt|electron|c\+\+|tkinter/i.test(t)) ||
    project.category?.includes('자동화') ||
    project.category?.includes('데스크톱')
  );

  const isWebProject = Boolean(
    project.category?.includes('웹') ||
    project.techStack?.some((t) => /react|vite|next|vue|html|web|typescript|javascript/i.test(t)) ||
    (hasLiveUrl && project.liveUrl.startsWith('http'))
  );

  return (
    <div className="space-y-10 pb-20">
      {/* ============================================================== */}
      {/* 1. 상단 네비게이션 및 헤더 영역                                    */}
      {/* (프로젝트명, 설명, 상태 태그, 분야 및 기술 태그, 액션 버튼)         */}
      {/* ============================================================== */}
      <div className="space-y-5">
        {/* Navigation & Action Buttons */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>프로젝트 목록으로 돌아가기</span>
          </button>

          <div className="flex items-center gap-2">
            {/* 실제 URL이 있을 때만 동작하는 상단 버튼 */}
            {hasLiveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center gap-1 shadow-xs"
              >
                <span>프로젝트 실행</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            {hasGithubUrl && (
              <a
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors flex items-center gap-1"
              >
                <GitBranch className="w-3.5 h-3.5 text-[#8B949E]" />
                <span>GitHub 저장소</span>
                <ExternalLink className="w-3 h-3 text-[#6E7681]" />
              </a>
            )}

            <button
              onClick={() => onOpenEditProjectModal(project)}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>프로젝트 수정</span>
            </button>

            <button
              onClick={onRequestDelete}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[#8B949E] hover:text-rose-400 bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors"
              title="프로젝트 삭제"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 1-1. 상태 태그, 분야(카테고리), 기술 태그 & 샘플 구분 */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {/* 상태 태그 (구상 중, 개발 중, 완성, 보류) */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border text-xs ${
              isCompleted
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/50'
                : isConceptual
                ? 'bg-sky-950/70 text-sky-300 border-sky-800/50'
                : isPaused
                ? 'bg-amber-950/70 text-amber-300 border-amber-800/50'
                : 'bg-purple-950/70 text-purple-300 border-purple-800/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isCompleted
                  ? 'bg-emerald-400'
                  : isConceptual
                  ? 'bg-sky-400'
                  : isPaused
                  ? 'bg-amber-400'
                  : 'bg-purple-400 animate-pulse'
              }`}
            />
            {normalizedStatus}
          </span>

          {/* 분야 태그 */}
          {project.category && (
            <span className="px-2.5 py-1 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#161B22] border border-[#30363D]">
              {project.category}
            </span>
          )}

          {/* 기술 태그 목록 */}
          {project.techStack?.map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 rounded text-xs font-mono text-[#8B949E] bg-[#0E121A] border border-[#21262D]"
            >
              {tech}
            </span>
          ))}

          {/* 샘플 데이터 뱃지 */}
          {project.isSample ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-950/60 text-amber-300 border border-amber-800/40">
              샘플 데이터
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#161B22] text-[#8B949E] border border-[#21262D]">
              사용자 프로젝트
            </span>
          )}
        </div>

        {/* 1-2. 프로젝트명 & 영문명 */}
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

        {/* 1-3. 프로젝트 설명 (간결한 소개) */}
        {project.description ? (
          <p className="text-sm text-[#C9D1D9] leading-relaxed max-w-3xl">
            {project.description}
          </p>
        ) : (
          <p className="text-xs text-[#8B949E] italic">
            등록된 프로젝트 소개가 없습니다. (상단 '프로젝트 수정'을 통해 소개를 작성할 수 있습니다)
          </p>
        )}

        {/* 대표 이미지 배너 (등록되어 있을 때 표시) */}
        {project.thumbnailUrl && (
          <div className="relative w-full h-44 sm:h-56 rounded-xl overflow-hidden border border-[#21262D] bg-[#0D1117]">
            <img
              src={project.thumbnailUrl}
              alt={project.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. 프로젝트 실행 영역 (The Execution Area - First major block)      */}
      {/* ============================================================== */}
      <section className="bg-[#111622] border border-[#21262D] rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#21262D]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-purple-950/60 border border-purple-800/50 flex items-center justify-center text-purple-400">
              <Play className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#F0F6FC]">
                프로젝트 실행 영역
              </h2>
              <p className="text-xs text-[#8B949E]">
                {hasLiveUrl
                  ? '웹 브라우저에서 즉시 실행 가능한 프로젝트입니다.'
                  : isPythonOrDesktop
                  ? 'Python 데스크톱 및 자동화 도구 환경 안내'
                  : '프로젝트 실행 상태 및 배포 안내'}
              </p>
            </div>
          </div>

          <button
            onClick={scrollToDevLogs}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <span>개발 기록 보기</span>
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        {/* Execution Content based on Project Type */}
        {hasLiveUrl ? (
          /* Case 1: 실제 실행 URL이 있는 프로젝트 (웹 애플리케이션 등) */
          <div className="space-y-3.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#0D1117] border border-[#30363D] rounded-lg">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-[#F0F6FC]">
                    웹 애플리케이션 실행 가능
                  </span>
                </div>
                <p className="text-xs text-[#8B949E] font-mono truncate max-w-md">
                  {project.liveUrl}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors inline-flex items-center gap-1.5 shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>프로젝트 실행</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {hasGithubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors inline-flex items-center gap-1"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-[#8B949E]" />
                    <span>저장소</span>
                  </a>
                )}
              </div>
            </div>
            <p className="text-[11px] text-[#6E7681]">
              * 브라우저 새 탭에서 서비스가 실행됩니다. 배포 주소 및 연결 정보 수정은 상단 '프로젝트 수정'을 이용하세요.
            </p>
          </div>
        ) : isPythonOrDesktop ? (
          /* Case 2: Python / 데스크톱 자동화 도구 (실제 liveUrl이 없는 경우) */
          <div className="space-y-4 pt-1">
            <div className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-xs font-semibold text-[#F0F6FC]">
                      Python 데스크톱 / 업무 자동화 도구
                    </span>
                  </div>
                  <p className="text-xs text-[#C9D1D9] leading-relaxed">
                    본 프로그램은 실무 위험성평가서·작업계획서 문서 처리를 위한 <strong>Python 기반 자동화 도구</strong>입니다. 웹 브라우저 대신 로컬 환경 실행 또는 독립 실행 파일(.exe) 배포 형태로 개발되고 있습니다.
                  </p>
                </div>

                {hasGithubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-[#E6EDF3] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors inline-flex items-center gap-1.5 shrink-0"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                    <span>GitHub 소스코드 보기</span>
                    <ExternalLink className="w-3 h-3 text-[#8B949E]" />
                  </a>
                )}
              </div>

              {/* 실행 준비 상태 및 안내 문구 */}
              <div className="text-xs text-[#8B949E] space-y-1.5 border-t border-[#21262D] pt-3">
                <div className="flex items-center gap-1.5 text-purple-300 font-medium">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>로컬 실행 및 개발 환경 안내:</span>
                </div>
                <div className="p-2.5 bg-[#161B22] border border-[#21262D] rounded font-mono text-[11px] text-[#C9D1D9] space-y-1">
                  <div># 저장소 클론 및 가상환경 활성화</div>
                  <div className="text-purple-300">python -m venv venv && source venv/bin/activate  # (Windows: venv\Scripts\activate)</div>
                  <div>pip install -r requirements.txt</div>
                  <div>python main.py</div>
                </div>
                <p className="text-[11px] text-[#6E7681]">
                  * 현재 핵심 데이터 파싱 및 표준 서식 연동 모듈 개발 단계에 있으며, 독립 실행 파일(.exe) 패키징은 테스트 검증 완료 후 배포될 예정입니다.
                </p>
              </div>
            </div>

            <div className="text-xs text-[#8B949E] pt-1">
              구현 과정과 최근 수정 내역은 하단의 개발 기록을 통해 확인하실 수 있습니다.
            </div>
          </div>
        ) : (
          /* Case 3: 아직 실행할 수 없는 프로젝트 (준비 중 안내) */
          <div className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-[#F0F6FC]">
                  실행 준비 중인 프로젝트입니다
                </span>
              </div>
              <p className="text-xs text-[#8B949E] leading-relaxed">
                현재 요구사항 분석 및 초기 기능 구현 단계로, 아직 공개된 실행 URL 또는 실행 파일이 등록되지 않았습니다. 임의의 가상 링크를 제공하지 않으며, 테스트 검증 완료 후 배포 링크가 제공될 예정입니다.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#21262D] flex-wrap gap-2 text-xs">
              <span className="text-[11px] text-[#6E7681]">
                진행 상황과 구현 상세는 하단의 개발 기록을 확인해 주세요.
              </span>
              {hasGithubUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded text-xs text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] inline-flex items-center gap-1"
                  >
                    <GitBranch className="w-3 h-3" />
                    <span>저장소 확인</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 3. 프로젝트 정보 (Project Information)                              */}
      {/* (프로젝트 소개 상세, 주요 기능, 사용 기술, 기본 정보 메타)           */}
      {/* ※ URL 등록/미등록 상태 표시는 제거됨!                            */}
      {/* ============================================================== */}
      <section className="space-y-8">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262D]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
            프로젝트 정보
          </h2>
          <button
            onClick={() => onOpenEditProjectModal(project)}
            className="text-xs text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <Edit2 className="w-3 h-3" />
            <span>정보 수정</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 좌측 8열: 소개 & 주요 기능 */}
          <div className="lg:col-span-8 space-y-8">
            {/* 3-1. 프로젝트 소개 상세 */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-[#8B949E]">
                프로젝트 소개
              </h3>
              {project.description && project.description.trim() ? (
                <div className="p-4 bg-[#111620] border border-[#21262D] rounded-lg text-xs sm:text-sm text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </div>
              ) : (
                <div className="p-4 bg-[#111620] border border-dashed border-[#21262D] rounded-lg text-xs text-[#8B949E] flex items-center justify-between">
                  <span>등록된 상세 소개가 없습니다.</span>
                  <button
                    onClick={() => onOpenEditProjectModal(project)}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium"
                  >
                    + 소개 작성
                  </button>
                </div>
              )}
            </div>

            {/* 3-2. 주요 기능 (Key Features) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xs font-medium text-[#8B949E]">
                    주요 기능
                  </h3>
                  <span className="text-xs font-mono text-[#6E7681]">
                    ({normalizedFeatures.length}개)
                  </span>
                </div>

                {normalizedFeatures.length > 0 && !isAddingFeature && (
                  <button
                    onClick={() => {
                      setIsAddingFeature(true);
                      setNewFeatureName('');
                      setNewFeatureDesc('');
                      setNewFeatureStatus('진행 중');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    + 기능 추가
                  </button>
                )}
              </div>

              {/* 기능 추가 폼 */}
              {isAddingFeature && (
                <div className="p-3.5 bg-[#161B22] border border-[#30363D] rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-[#F0F6FC] font-medium">
                    <span>새 기능 등록</span>
                    <button
                      onClick={() => setIsAddingFeature(false)}
                      className="text-[#8B949E] hover:text-[#F0F6FC]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    placeholder="기능명 (예: 서식 데이터 파싱 및 매핑 모듈)"
                    className="w-full px-2.5 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none focus:border-purple-500"
                    autoFocus
                  />
                  <textarea
                    rows={2}
                    value={newFeatureDesc}
                    onChange={(e) => setNewFeatureDesc(e.target.value)}
                    placeholder="기능 설명 (선택 사항)"
                    className="w-full px-2.5 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-xs text-[#E6EDF3] focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={newFeatureStatus}
                      onChange={(e) => setNewFeatureStatus(e.target.value as FeatureStatus)}
                      className="px-2 py-1 bg-[#0D1117] border border-[#30363D] rounded text-xs text-[#C9D1D9] focus:outline-none"
                    >
                      <option value="진행 중">진행 중</option>
                      <option value="대기">대기</option>
                      <option value="완료">완료</option>
                    </select>

                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => setIsAddingFeature(false)}
                        className="px-2.5 py-1 text-[#8B949E] hover:text-[#F0F6FC]"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddFeature}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 기능 목록 */}
              {normalizedFeatures.length === 0 && !isAddingFeature ? (
                <div className="p-4 bg-[#111620] border border-dashed border-[#21262D] rounded-lg text-xs text-center space-y-2">
                  <p className="text-[#8B949E]">등록된 주요 기능이 없습니다.</p>
                  <button
                    onClick={() => {
                      setIsAddingFeature(true);
                      setNewFeatureName('');
                      setNewFeatureDesc('');
                      setNewFeatureStatus('진행 중');
                    }}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium inline-block"
                  >
                    + 첫 기능 추가
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {normalizedFeatures.map((feat, idx) => {
                    const isEditing = editingFeatureIndex === idx;
                    if (isEditing) {
                      return (
                        <div key={feat.id || idx} className="p-3 bg-[#161B22] border border-purple-500/50 rounded-lg space-y-2 text-xs">
                          <input
                            type="text"
                            value={editFeatureName}
                            onChange={(e) => setEditFeatureName(e.target.value)}
                            className="w-full px-2.5 py-1 bg-[#0D1117] border border-[#30363D] rounded text-[#E6EDF3] focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={editFeatureDesc}
                            onChange={(e) => setEditFeatureDesc(e.target.value)}
                            className="w-full px-2.5 py-1 bg-[#0D1117] border border-[#30363D] rounded text-[#E6EDF3] focus:outline-none"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <select
                              value={editFeatureStatus}
                              onChange={(e) => setEditFeatureStatus(e.target.value as FeatureStatus)}
                              className="px-2 py-0.5 bg-[#0D1117] border border-[#30363D] rounded text-[#C9D1D9]"
                            >
                              <option value="진행 중">진행 중</option>
                              <option value="대기">대기</option>
                              <option value="완료">완료</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingFeatureIndex(null)}
                                className="px-2 py-0.5 text-[#8B949E] hover:text-[#F0F6FC]"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSaveFeatureEdit(idx)}
                                className="px-2.5 py-0.5 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium"
                              >
                                저장
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={feat.id || idx}
                        className="group flex items-start justify-between gap-3 p-3 bg-[#111620] hover:bg-[#141A26] border border-[#21262D] rounded-lg transition-colors text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                feat.status === '완료'
                                  ? 'bg-emerald-400'
                                  : feat.status === '대기'
                                  ? 'bg-slate-400'
                                  : 'bg-purple-400'
                              }`}
                            />
                            <span className="font-medium text-[#F0F6FC]">
                              {feat.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] text-[#8B949E] bg-[#161B22] border border-[#21262D]">
                              {feat.status || '진행 중'}
                            </span>
                          </div>
                          {feat.description && (
                            <p className="text-[#8B949E] leading-relaxed pl-3.5">
                              {feat.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => startEditingFeature(idx, feat)}
                            className="p-1 text-[#6E7681] hover:text-[#C9D1D9]"
                            title="수정"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setFeatureToDelete({ index: idx, name: feat.name })}
                            className="p-1 text-[#6E7681] hover:text-rose-400"
                            title="삭제"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 우측 4열: 사용 기술 & 프로젝트 메타 (URL 미등록 표시는 없음) */}
          <div className="lg:col-span-4 space-y-6">
            {/* 3-3. 진행 상태 변경 드롭다운 */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-[#8B949E]">
                진행 상태
              </h3>
              <div className="p-3 bg-[#111620] border border-[#21262D] rounded-lg">
                <select
                  value={normalizedStatus}
                  onChange={(e) => handleStatusChange(e.target.value as '구상 중' | '개발 중' | '완성' | '보류')}
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

            {/* 3-4. 사용 기술 관리 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-[#8B949E]">
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

            {/* 3-5. 메타 정보 (카테고리, 등록일, 수정일) */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-[#8B949E]">
                기본 메타 정보
              </h3>
              <div className="p-3 bg-[#111620] border border-[#21262D] rounded-lg divide-y divide-[#21262D] text-xs">
                <div className="py-1.5 flex justify-between">
                  <span className="text-[#8B949E]">분야 (카테고리)</span>
                  <span className="text-[#C9D1D9]">{project.category || '미지정'}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-[#8B949E]">등록일</span>
                  <span className="font-mono text-[#C9D1D9]">
                    {project.createdAt ? project.createdAt.split('T')[0] : '2026-10-15'}
                  </span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-[#8B949E]">최종 수정일</span>
                  <span className="font-mono text-[#C9D1D9]">
                    {project.updatedAt ? project.updatedAt.split('T')[0] : '2026-10-19'}
                  </span>
                </div>
                {/* 만약 URL이 등록된 경우에만 링크 항목을 메타 정보에 단정하게 표시 */}
                {hasLiveUrl && (
                  <div className="py-1.5 flex justify-between items-center gap-2">
                    <span className="text-[#8B949E]">실행 URL</span>
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-purple-400 hover:text-purple-300 font-mono text-[11px] truncate max-w-[160px] inline-flex items-center gap-0.5"
                    >
                      <span>{project.liveUrl}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>
                )}
                {hasGithubUrl && (
                  <div className="py-1.5 flex justify-between items-center gap-2">
                    <span className="text-[#8B949E]">저장소</span>
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#C9D1D9] hover:text-[#F0F6FC] font-mono text-[11px] truncate max-w-[160px] inline-flex items-center gap-0.5"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. 개발 기록 요약 및 전체 개발 로그로 이동 링크                     */}
      {/* ============================================================== */}
      <section id="work-logs-section" className="space-y-4 pt-4 border-t border-[#21262D]">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262D] flex-wrap gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
              개발 기록
            </h2>
            <span className="text-xs font-mono text-[#6E7681]">
              ({sortedLogs.length}건)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 전체 개발 로그로 이동 링크 */}
            {onNavigateToDevLog && (
              <button
                onClick={() => onNavigateToDevLog(project.id)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D] transition-colors inline-flex items-center gap-1.5"
                title="모든 프로젝트의 개발 기록 페이지에서 이 프로젝트 필터링 조회"
              >
                <FileCode2 className="w-3.5 h-3.5 text-purple-400" />
                <span>전체 개발 로그에서 보기</span>
                <ArrowUpRight className="w-3 h-3 text-[#8B949E]" />
              </button>
            )}

            <button
              onClick={() => onOpenAddWorkLogModal(project, null)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-xs"
            >
              + 기록 추가
            </button>
          </div>
        </div>

        {/* Logs List */}
        {sortedLogs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-[#21262D] rounded-xl space-y-2">
            <p className="text-xs text-[#8B949E]">
              아직 등록된 개발 기록이 없습니다.
            </p>
            <button
              onClick={() => onOpenAddWorkLogModal(project, null)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 inline-block"
            >
              + 첫 기록 추가
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-7 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#21262D]">
            {sortedLogs.map((log) => {
              const isExpanded = !!expandedLogIds[log.id];
              const logTitle = log.title || log.task || '작업 기록';
              const logContent = log.content || log.task || '';
              const logReason = log.reason || log.issues || '';
              const hasDetails = Boolean(logReason || log.testResult || log.solution || log.nextSteps);

              return (
                <article key={log.id} className="relative group space-y-2.5">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#30363D] group-hover:bg-purple-400 border-2 border-[#0B0F17] transition-colors" />

                  {/* Log Header: Date, Version, Actions */}
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <time className="font-mono text-[#8B949E] text-xs">
                        {log.date}
                      </time>
                      {log.version && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-purple-300 bg-purple-950/50 border border-purple-800/40">
                          {log.version}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-[#6E7681]">
                      <button
                        onClick={() => onOpenAddWorkLogModal(project, log)}
                        className="hover:text-[#C9D1D9] transition-colors"
                      >
                        수정
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => setLogToDelete(log)}
                        className="hover:text-rose-400 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 제목 */}
                  <h4 className="text-sm font-semibold text-[#F0F6FC] leading-snug">
                    {logTitle}
                  </h4>

                  {/* 내용 */}
                  {logContent && logContent !== logTitle && (
                    <p className="text-xs text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                      {logContent}
                    </p>
                  )}

                  {/* 상세 내용 (이유, 테스트 결과, 다음 작업) 토글 */}
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
                            <span>상세 내용 보기 (수정 이유, 테스트 결과, 다음 작업)</span>
                            <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2.5 pl-3 border-l-2 border-[#21262D] text-xs">
                          {logReason && (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-medium text-[#8B949E]">
                                수정 이유
                              </div>
                              <p className="text-[#C9D1D9] leading-relaxed whitespace-pre-wrap">
                                {logReason}
                              </p>
                            </div>
                          )}

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

                          {log.nextSteps && (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-medium text-purple-400">
                                다음 작업 (Next Steps)
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

      {/* ============================================================== */}
      {/* 5. 변경 내역 (Changelog)                                         */}
      {/* ============================================================== */}
      <section className="space-y-4 pt-4 border-t border-[#21262D]">
        <div className="flex items-center justify-between pb-2 border-b border-[#21262D]">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#8B949E]">
            변경 내역 (Changelog)
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
        {!project.changelog || project.changelog.length === 0 ? (
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

      {/* Confirmation Modal for Feature Deletion */}
      <DeleteConfirmModal
        isOpen={featureToDelete !== null}
        title="기능 삭제 확인"
        itemName={featureToDelete ? featureToDelete.name : ''}
        warningText="해당 기능이 프로젝트에서 삭제됩니다."
        confirmText="삭제"
        onClose={() => setFeatureToDelete(null)}
        onConfirm={handleConfirmDeleteFeature}
      />

      {/* Confirmation Modal for Log Deletion */}
      <DeleteConfirmModal
        isOpen={logToDelete !== null}
        title="개발 기록 삭제 확인"
        itemName={logToDelete ? (logToDelete.title || logToDelete.task || `${logToDelete.date} 작업 기록`) : ''}
        description={logToDelete ? `작업 내용: "${logToDelete.content || logToDelete.task || ''}"` : undefined}
        warningText="해당 개발 기록(작업 내용, 수정 이유, 테스트 결과 등)이 삭제됩니다."
        confirmText="삭제"
        onClose={() => setLogToDelete(null)}
        onConfirm={handleConfirmDeleteLog}
      />
    </div>
  );
};
