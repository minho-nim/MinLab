import React, { useState, useMemo } from 'react';
import { Project, WorkLog, PromptHistoryItem, ProjectStatus, ProjectFeature, FeatureStatus } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ProjectPreview } from './ProjectPreview';
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

  // Project-specific prompt history
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [newPromptOutcome, setNewPromptOutcome] = useState('');
  const [newPromptDate, setNewPromptDate] = useState(new Date().toISOString().split('T')[0]);

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

  // 4. Prompt History Handlers
  const handleAddPrompt = () => {
    if (!newPromptTitle.trim() || !newPromptText.trim()) {
      showToast('작업 제목과 프롬프트를 입력해 주세요.', 'error');
      return;
    }
    const newItem: PromptHistoryItem = {
      id: `prompt-${Date.now()}`,
      title: newPromptTitle.trim(),
      date: newPromptDate || new Date().toISOString().split('T')[0],
      prompt: newPromptText.trim(),
      outcome: newPromptOutcome.trim(),
    };
    const updated: Project = {
      ...project,
      promptHistory: [newItem, ...(project.promptHistory || [])],
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    setNewPromptTitle('');
    setNewPromptText('');
    setNewPromptOutcome('');
    setNewPromptDate(new Date().toISOString().split('T')[0]);
    setIsAddingPrompt(false);
    showToast('프롬프트 기록을 저장했습니다.', 'success');
  };

  const handleDeletePrompt = (id: string) => {
    const updatedPromptHistory = (project.promptHistory || []).filter((item) => item.id !== id);
    const updated: Project = {
      ...project,
      promptHistory: updatedPromptHistory,
      updatedAt: new Date().toISOString(),
    };
    onUpdateProject(updated);
    showToast('프롬프트 기록을 삭제했습니다.', 'info');
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
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
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
                className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-accent hover:bg-accent-hover transition-colors flex items-center gap-1 shadow-xs"
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
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-ink-secondary bg-surface hover:bg-surface-alt border border-line-strong transition-colors flex items-center gap-1"
              >
                <GitBranch className="w-3.5 h-3.5 text-muted" />
                <span>GitHub 저장소</span>
                <ExternalLink className="w-3 h-3 text-muted" />
              </a>
            )}

            <button
              onClick={() => onOpenEditProjectModal(project)}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium text-ink-secondary bg-surface hover:bg-surface-alt border border-line-strong transition-colors flex items-center gap-1"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>프로젝트 수정</span>
            </button>

            <button
              onClick={onRequestDelete}
              className="px-2.5 py-1.5 rounded-md text-xs font-medium text-muted hover:text-rose-700 bg-surface hover:bg-surface-alt border border-line-strong transition-colors"
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
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isConceptual
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : isPaused
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-accent-soft text-accent border-accent-line'
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
                  : 'bg-accent '
              }`}
            />
            {normalizedStatus}
          </span>

          {/* 분야 태그 */}
          {project.category && (
            <span className="px-2.5 py-1 rounded-md text-xs font-medium text-ink-secondary bg-surface border border-line-strong">
              {project.category}
            </span>
          )}

          {/* 기술 태그 목록 */}
          {project.techStack?.map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 rounded text-xs font-mono text-muted bg-surface-alt border border-line"
            >
              {tech}
            </span>
          ))}

          {/* 샘플 데이터 뱃지 */}
          {project.isSample ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              샘플 데이터
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface text-muted border border-line">
              사용자 프로젝트
            </span>
          )}
        </div>

        {/* 1-2. 프로젝트명 & 영문명 */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-ink">
            {project.name}
          </h1>
          {project.englishName && (
            <p className="text-xs sm:text-sm font-mono text-muted mt-1">
              {project.englishName}
            </p>
          )}
        </div>

        {/* 1-3. 프로젝트 설명 (간결한 소개) */}
        {project.description ? (
          <p className="text-sm text-ink-secondary leading-relaxed max-w-3xl">
            {project.description}
          </p>
        ) : (
          <p className="text-xs text-muted italic">
            등록된 프로젝트 소개가 없습니다. (상단 '프로젝트 수정'을 통해 소개를 작성할 수 있습니다)
          </p>
        )}

        {/* 대표 이미지 배너 (등록되어 있을 때 표시) */}
        {project.thumbnailUrl && (
          <div className="relative w-full h-44 sm:h-56 rounded-xl overflow-hidden border border-line bg-surface-alt">
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
      {project.previewUrl && (
        <ProjectPreview key={`${project.id}-${project.previewUrl}`} name={project.name} url={project.previewUrl} />
      )}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-accent-soft border border-accent-line flex items-center justify-center text-accent">
              <Play className="w-3.5 h-3.5 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">
                프로젝트 실행 영역
              </h2>
              <p className="text-xs text-muted">
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
            className="text-xs text-accent hover:text-accent font-medium inline-flex items-center gap-1 transition-colors"
          >
            <span>개발 기록 보기</span>
            <ArrowDown className="w-3 h-3" />
          </button>
        </div>

        {/* Execution Content based on Project Type */}
        {hasLiveUrl ? (
          /* Case 1: 실제 실행 URL이 있는 프로젝트 (웹 애플리케이션 등) */
          <div className="space-y-3.5 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-surface-alt border border-line-strong rounded-lg">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 " />
                  <span className="text-xs font-semibold text-ink">
                    웹 애플리케이션 실행 가능
                  </span>
                </div>
                <p className="text-xs text-muted font-mono truncate max-w-md">
                  {project.liveUrl}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-md text-xs font-semibold text-white bg-accent hover:bg-accent-hover transition-colors inline-flex items-center gap-1.5 shadow-md"
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
                    className="px-3 py-2 rounded-md text-xs font-medium text-ink-secondary bg-surface hover:bg-surface-alt border border-line-strong transition-colors inline-flex items-center gap-1"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-muted" />
                    <span>저장소</span>
                  </a>
                )}
              </div>
            </div>
            <p className="text-[11px] text-muted">
              * 브라우저 새 탭에서 서비스가 실행됩니다. 배포 주소 및 연결 정보 수정은 상단 '프로젝트 수정'을 이용하세요.
            </p>
          </div>
        ) : isPythonOrDesktop ? (
          /* Case 2: Python / 데스크톱 자동화 도구 (실제 liveUrl이 없는 경우) */
          <div className="space-y-4 pt-1">
            <div className="p-4 bg-surface-alt border border-line-strong rounded-lg space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span className="text-xs font-semibold text-ink">
                      Python 데스크톱 / 업무 자동화 도구
                    </span>
                  </div>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    본 프로그램은 실무 위험성평가서·작업계획서 문서 처리를 위한 <strong>Python 기반 자동화 도구</strong>입니다. 웹 브라우저 대신 로컬 환경 실행 또는 독립 실행 파일(.exe) 배포 형태로 개발되고 있습니다.
                  </p>
                </div>

                {hasGithubUrl && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-md text-xs font-medium text-ink bg-surface hover:bg-surface-alt border border-line-strong transition-colors inline-flex items-center gap-1.5 shrink-0"
                  >
                    <GitBranch className="w-3.5 h-3.5 text-accent" />
                    <span>GitHub 소스코드 보기</span>
                    <ExternalLink className="w-3 h-3 text-muted" />
                  </a>
                )}
              </div>

              {/* 실행 준비 상태 및 안내 문구 */}
              <div className="text-xs text-muted space-y-1.5 border-t border-line pt-3">
                <div className="flex items-center gap-1.5 text-accent font-medium">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>로컬 실행 및 개발 환경 안내:</span>
                </div>
                <div className="p-2.5 bg-surface border border-line rounded font-mono text-[11px] text-ink-secondary space-y-1">
                  <div># 저장소 클론 및 가상환경 활성화</div>
                  <div className="text-accent">python -m venv venv && source venv/bin/activate  # (Windows: venv\Scripts\activate)</div>
                  <div>pip install -r requirements.txt</div>
                  <div>python main.py</div>
                </div>
                <p className="text-[11px] text-muted">
                  * 현재 핵심 데이터 파싱 및 표준 서식 연동 모듈 개발 단계에 있으며, 독립 실행 파일(.exe) 패키징은 테스트 검증 완료 후 배포될 예정입니다.
                </p>
              </div>
            </div>

            <div className="text-xs text-muted pt-1">
              구현 과정과 최근 수정 내역은 하단의 개발 기록을 통해 확인하실 수 있습니다.
            </div>
          </div>
        ) : (
          /* Case 3: 아직 실행할 수 없는 프로젝트 (준비 중 안내) */
          <div className="p-4 bg-surface-alt border border-line-strong rounded-lg space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span className="text-xs font-semibold text-ink">
                  실행 준비 중인 프로젝트입니다
                </span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                현재 요구사항 분석 및 초기 기능 구현 단계로, 아직 공개된 실행 URL 또는 실행 파일이 등록되지 않았습니다. 임의의 가상 링크를 제공하지 않으며, 테스트 검증 완료 후 배포 링크가 제공될 예정입니다.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-line flex-wrap gap-2 text-xs">
              <span className="text-[11px] text-muted">
                진행 상황과 구현 상세는 하단의 개발 기록을 확인해 주세요.
              </span>
              {hasGithubUrl && (
                <div className="flex items-center gap-2">
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded text-xs text-ink-secondary bg-surface hover:bg-surface-alt border border-line-strong inline-flex items-center gap-1"
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
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
            프로젝트 정보
          </h2>
          <button
            onClick={() => onOpenEditProjectModal(project)}
            className="text-xs text-accent hover:text-accent font-medium inline-flex items-center gap-1 transition-colors"
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
              <h3 className="text-xs font-medium text-muted">
                프로젝트 소개
              </h3>
              {project.description && project.description.trim() ? (
                <div className="p-4 bg-surface border border-line rounded-lg text-xs sm:text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </div>
              ) : (
                <div className="p-4 bg-surface border border-dashed border-line rounded-lg text-xs text-muted flex items-center justify-between">
                  <span>등록된 상세 소개가 없습니다.</span>
                  <button
                    onClick={() => onOpenEditProjectModal(project)}
                    className="text-xs text-accent hover:text-accent font-medium"
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
                  <h3 className="text-xs font-medium text-muted">
                    주요 기능
                  </h3>
                  <span className="text-xs font-mono text-muted">
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
                    className="text-xs text-accent hover:text-accent font-medium transition-colors"
                  >
                    + 기능 추가
                  </button>
                )}
              </div>

              {/* 기능 추가 폼 */}
              {isAddingFeature && (
                <div className="p-3.5 bg-surface border border-line-strong rounded-lg space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-ink font-medium">
                    <span>새 기능 등록</span>
                    <button
                      onClick={() => setIsAddingFeature(false)}
                      className="text-muted hover:text-ink"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={newFeatureName}
                    onChange={(e) => setNewFeatureName(e.target.value)}
                    placeholder="기능명 (예: 서식 데이터 파싱 및 매핑 모듈)"
                    className="w-full px-2.5 py-1.5 bg-surface-alt border border-line-strong rounded-md text-xs text-ink focus:outline-none focus:border-accent"
                    autoFocus
                  />
                  <textarea
                    rows={2}
                    value={newFeatureDesc}
                    onChange={(e) => setNewFeatureDesc(e.target.value)}
                    placeholder="기능 설명 (선택 사항)"
                    className="w-full px-2.5 py-1.5 bg-surface-alt border border-line-strong rounded-md text-xs text-ink focus:outline-none focus:border-accent"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <select
                      value={newFeatureStatus}
                      onChange={(e) => setNewFeatureStatus(e.target.value as FeatureStatus)}
                      className="px-2 py-1 bg-surface-alt border border-line-strong rounded text-xs text-ink-secondary focus:outline-none"
                    >
                      <option value="진행 중">진행 중</option>
                      <option value="대기">대기</option>
                      <option value="완료">완료</option>
                    </select>

                    <div className="flex gap-2 text-xs">
                      <button
                        onClick={() => setIsAddingFeature(false)}
                        className="px-2.5 py-1 text-muted hover:text-ink"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleAddFeature}
                        className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded font-medium"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 기능 목록 */}
              {normalizedFeatures.length === 0 && !isAddingFeature ? (
                <div className="p-4 bg-surface border border-dashed border-line rounded-lg text-xs text-center space-y-2">
                  <p className="text-muted">등록된 주요 기능이 없습니다.</p>
                  <button
                    onClick={() => {
                      setIsAddingFeature(true);
                      setNewFeatureName('');
                      setNewFeatureDesc('');
                      setNewFeatureStatus('진행 중');
                    }}
                    className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white rounded text-xs font-medium inline-block"
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
                        <div key={feat.id || idx} className="p-3 bg-surface border border-accent-line rounded-lg space-y-2 text-xs">
                          <input
                            type="text"
                            value={editFeatureName}
                            onChange={(e) => setEditFeatureName(e.target.value)}
                            className="w-full px-2.5 py-1 bg-surface-alt border border-line-strong rounded text-ink focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={editFeatureDesc}
                            onChange={(e) => setEditFeatureDesc(e.target.value)}
                            className="w-full px-2.5 py-1 bg-surface-alt border border-line-strong rounded text-ink focus:outline-none"
                          />
                          <div className="flex items-center justify-between pt-1">
                            <select
                              value={editFeatureStatus}
                              onChange={(e) => setEditFeatureStatus(e.target.value as FeatureStatus)}
                              className="px-2 py-0.5 bg-surface-alt border border-line-strong rounded text-ink-secondary"
                            >
                              <option value="진행 중">진행 중</option>
                              <option value="대기">대기</option>
                              <option value="완료">완료</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingFeatureIndex(null)}
                                className="px-2 py-0.5 text-muted hover:text-ink"
                              >
                                취소
                              </button>
                              <button
                                onClick={() => handleSaveFeatureEdit(idx)}
                                className="px-2.5 py-0.5 bg-accent hover:bg-accent-hover text-white rounded font-medium"
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
                        className="group flex items-start justify-between gap-3 p-3 bg-surface hover:bg-surface-alt border border-line rounded-lg transition-colors text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                feat.status === '완료'
                                  ? 'bg-emerald-400'
                                  : feat.status === '대기'
                                  ? 'bg-slate-400'
                                  : 'bg-accent'
                              }`}
                            />
                            <span className="font-medium text-ink">
                              {feat.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] text-muted bg-surface border border-line">
                              {feat.status || '진행 중'}
                            </span>
                          </div>
                          {feat.description && (
                            <p className="text-muted leading-relaxed pl-3.5">
                              {feat.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => startEditingFeature(idx, feat)}
                            className="p-1 text-muted hover:text-ink-secondary"
                            title="수정"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setFeatureToDelete({ index: idx, name: feat.name })}
                            className="p-1 text-muted hover:text-rose-700"
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
              <h3 className="text-xs font-medium text-muted">
                진행 상태
              </h3>
              <div className="p-3 bg-surface border border-line rounded-lg">
                <select
                  value={normalizedStatus}
                  onChange={(e) => handleStatusChange(e.target.value as '구상 중' | '개발 중' | '완성' | '보류')}
                  className="w-full bg-surface border border-line-strong rounded-md px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-accent"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st} className="bg-surface">
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3-4. 사용 기술 관리 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted">
                  사용 기술
                </h3>
                {!isAddingTech && (
                  <button
                    onClick={() => setIsAddingTech(true)}
                    className="text-xs text-accent hover:text-accent"
                  >
                    + 추가
                  </button>
                )}
              </div>

              <div className="p-3 bg-surface border border-line rounded-lg space-y-2.5">
                {isAddingTech && (
                  <div className="flex items-center gap-1.5 pb-2 border-b border-line">
                    <input
                      type="text"
                      value={newTechText}
                      onChange={(e) => setNewTechText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTech()}
                      placeholder="기술명 입력"
                      className="flex-1 px-2 py-1 bg-surface border border-line-strong rounded-md text-xs text-ink focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleAddTech}
                      className="px-2 py-1 bg-accent hover:bg-accent-hover text-white rounded text-xs"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingTech(false);
                        setNewTechText('');
                      }}
                      className="p-1 text-muted hover:text-ink"
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
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono text-ink-secondary bg-surface border border-line-strong"
                      >
                        <span>{tech}</span>
                        <button
                          onClick={() => handleDeleteTech(tech)}
                          className="text-muted hover:text-rose-700 transition-colors"
                          title="삭제"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted">미지정</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3-5. 메타 정보 (카테고리, 등록일, 수정일) */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted">
                기본 메타 정보
              </h3>
              <div className="p-3 bg-surface border border-line rounded-lg divide-y divide-[#21262D] text-xs">
                <div className="py-1.5 flex justify-between">
                  <span className="text-muted">분야 (카테고리)</span>
                  <span className="text-ink-secondary">{project.category || '미지정'}</span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-muted">등록일</span>
                  <span className="font-mono text-ink-secondary">
                    {project.createdAt ? project.createdAt.split('T')[0] : '2026-10-15'}
                  </span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-muted">최종 수정일</span>
                  <span className="font-mono text-ink-secondary">
                    {project.updatedAt ? project.updatedAt.split('T')[0] : '2026-10-19'}
                  </span>
                </div>
                {/* 만약 URL이 등록된 경우에만 링크 항목을 메타 정보에 단정하게 표시 */}
                {hasLiveUrl && (
                  <div className="py-1.5 flex justify-between items-center gap-2">
                    <span className="text-muted">실행 URL</span>
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent hover:text-accent font-mono text-[11px] truncate max-w-[160px] inline-flex items-center gap-0.5"
                    >
                      <span>{project.liveUrl}</span>
                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    </a>
                  </div>
                )}
                {hasGithubUrl && (
                  <div className="py-1.5 flex justify-between items-center gap-2">
                    <span className="text-muted">저장소</span>
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-secondary hover:text-ink font-mono text-[11px] truncate max-w-[160px] inline-flex items-center gap-0.5"
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
      <section id="work-logs-section" className="space-y-4 pt-4 border-t border-line">
        <div className="flex items-center justify-between pb-2 border-b border-line flex-wrap gap-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
              개발 기록
            </h2>
            <span className="text-xs font-mono text-muted">
              ({sortedLogs.length}건)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* 전체 개발 로그로 이동 링크 */}
            {onNavigateToDevLog && (
              <button
                onClick={() => onNavigateToDevLog(project.id)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-ink-secondary bg-surface hover:bg-surface-alt border border-line-strong transition-colors inline-flex items-center gap-1.5"
                title="모든 프로젝트의 개발 기록 페이지에서 이 프로젝트 필터링 조회"
              >
                <FileCode2 className="w-3.5 h-3.5 text-accent" />
                <span>전체 개발 로그에서 보기</span>
                <ArrowUpRight className="w-3 h-3 text-muted" />
              </button>
            )}

            <button
              onClick={() => onOpenAddWorkLogModal(project, null)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-accent hover:bg-accent-hover transition-colors shadow-xs"
            >
              + 기록 추가
            </button>
          </div>
        </div>

        {/* Logs List */}
        {sortedLogs.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-line rounded-xl space-y-2">
            <p className="text-xs text-muted">
              아직 등록된 개발 기록이 없습니다.
            </p>
            <button
              onClick={() => onOpenAddWorkLogModal(project, null)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-accent hover:bg-accent-hover inline-block"
            >
              + 첫 기록 추가
            </button>
          </div>
        ) : (
          <div className="relative pl-6 space-y-7 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-surface-alt">
            {sortedLogs.map((log) => {
              const isExpanded = !!expandedLogIds[log.id];
              const logTitle = log.title || log.task || '작업 기록';
              const logContent = log.content || log.task || '';
              const logReason = log.reason || log.issues || '';
              const hasDetails = Boolean(logReason || log.testResult || log.solution || log.nextSteps);

              return (
                <article key={log.id} className="relative group space-y-2.5">
                  {/* Timeline Dot */}
                  <span className="absolute -left-[27px] top-1.5 w-2.5 h-2.5 rounded-full bg-line-strong group-hover:bg-accent border-2 border-line transition-colors" />

                  {/* Log Header: Date, Version, Actions */}
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <time className="font-mono text-muted text-xs">
                        {log.date}
                      </time>
                      {log.version && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium text-accent bg-accent-soft border border-accent-line">
                          {log.version}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <button
                        onClick={() => onOpenAddWorkLogModal(project, log)}
                        className="hover:text-ink-secondary transition-colors"
                      >
                        수정
                      </button>
                      <span>·</span>
                      <button
                        onClick={() => setLogToDelete(log)}
                        className="hover:text-rose-700 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* 제목 */}
                  <h4 className="text-sm font-semibold text-ink leading-snug">
                    {logTitle}
                  </h4>

                  {/* 내용 */}
                  {logContent && logContent !== logTitle && (
                    <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-wrap">
                      {logContent}
                    </p>
                  )}

                  {/* 상세 내용 (이유, 테스트 결과, 다음 작업) 토글 */}
                  {hasDetails && (
                    <div>
                      <button
                        onClick={() => toggleLogExpansion(log.id)}
                        className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-ink-secondary transition-colors py-0.5"
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
                        <div className="mt-3 space-y-2.5 pl-3 border-l-2 border-line text-xs">
                          {logReason && (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-medium text-muted">
                                수정 이유
                              </div>
                              <p className="text-ink-secondary leading-relaxed whitespace-pre-wrap">
                                {logReason}
                              </p>
                            </div>
                          )}

                          {log.testResult && (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-medium text-muted">
                                테스트 결과
                              </div>
                              <p className="text-ink-secondary leading-relaxed whitespace-pre-wrap">
                                {log.testResult}
                              </p>
                            </div>
                          )}

                          {log.nextSteps && (
                            <div className="space-y-0.5">
                              <div className="text-[11px] font-medium text-accent">
                                다음 작업 (Next Steps)
                              </div>
                              <p className="text-ink-secondary leading-relaxed whitespace-pre-wrap">
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

      <section className="space-y-5 border-t border-line pt-7" id="prompt-history">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">WORKING NOTES</p>
            <h2 className="text-lg font-semibold tracking-tight text-ink">프롬프트 기록</h2>
            <p className="mt-1 text-xs text-muted">이 프로젝트의 아이디어와 개선 방향을 정리한 기록입니다.</p>
          </div>
          {!isAddingPrompt && (
            <button
              type="button"
              onClick={() => setIsAddingPrompt(true)}
              className="rounded-md border border-line-strong px-3 py-2 text-xs font-medium text-ink-secondary transition hover:border-line-strong hover:text-ink"
            >
              + 프롬프트 기록
            </button>
          )}
        </div>

        {isAddingPrompt && (
          <div className="space-y-3 rounded-lg border border-line-strong bg-surface p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <label className="space-y-1.5 text-xs text-muted">
                <span>작업 제목</span>
                <input
                  type="text"
                  value={newPromptTitle}
                  onChange={(e) => setNewPromptTitle(e.target.value)}
                  placeholder="예: CSV 업로드 오류 수정"
                  className="w-full rounded-md border border-line-strong bg-surface-alt px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
                />
              </label>
              <label className="space-y-1.5 text-xs text-muted">
                <span>날짜</span>
                <input
                  type="date"
                  value={newPromptDate}
                  onChange={(e) => setNewPromptDate(e.target.value)}
                  className="w-full rounded-md border border-line-strong bg-surface-alt px-3 py-2 text-sm text-ink focus:border-line-strong focus:outline-none"
                />
              </label>
            </div>
            <label className="block space-y-1.5 text-xs text-muted">
              <span>작업 프롬프트</span>
              <textarea
                rows={5}
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                placeholder="작업의 배경과 개선 방향, 핵심 내용을 자연스럽게 작성하세요."
                className="w-full resize-y rounded-md border border-line-strong bg-surface-alt px-3 py-2.5 font-mono text-xs leading-6 text-ink placeholder:font-sans placeholder:text-muted focus:border-line-strong focus:outline-none"
              />
            </label>
            <label className="block space-y-1.5 text-xs text-muted">
              <span>결과와 메모 <span className="text-muted">(선택)</span></span>
              <textarea
                rows={2}
                value={newPromptOutcome}
                onChange={(e) => setNewPromptOutcome(e.target.value)}
                placeholder="결과, 수정한 내용, 다음에 참고할 점"
                className="w-full resize-y rounded-md border border-line-strong bg-surface-alt px-3 py-2.5 text-sm leading-6 text-ink placeholder:text-muted focus:border-line-strong focus:outline-none"
              />
            </label>
            <div className="flex justify-end gap-2 pt-1 text-xs">
              <button type="button" onClick={() => setIsAddingPrompt(false)} className="rounded-md px-3 py-2 text-muted hover:text-ink">취소</button>
              <button type="button" onClick={handleAddPrompt} className="rounded-md bg-accent px-3.5 py-2 font-medium text-white transition hover:bg-accent-hover">저장</button>
            </div>
          </div>
        )}

        {!project.promptHistory?.length ? (
          <div className="rounded-lg border border-dashed border-line-strong px-5 py-8 text-center">
            <p className="text-sm text-ink-secondary">아직 프롬프트 기록이 없습니다.</p>
            <p className="mt-1 text-xs text-muted">작업에 도움이 된 프롬프트를 남겨두면 다음에 다시 활용할 수 있어요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {project.promptHistory.map((item) => (
              <article key={item.id} className="group rounded-lg border border-line-strong bg-surface p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                      <time dateTime={item.date} className="font-mono">{item.date}</time>
                      <span aria-hidden="true">·</span>
                      <span>Prompt</span>
                    </div>
                    <h3 className="mt-1 text-sm font-semibold text-ink">{item.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePrompt(item.id)}
                    className="rounded p-1.5 text-muted opacity-70 transition hover:bg-surface-alt hover:text-rose-700 sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label={`${item.title} 프롬프트 기록 삭제`}
                    title="기록 삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <pre className="mt-4 whitespace-pre-wrap break-words rounded-md border-l-2 border-accent bg-surface-alt px-4 py-3 font-mono text-xs leading-6 text-ink-secondary">{item.prompt}</pre>
                {item.outcome && (
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted">결과와 메모</p>
                    <p className="whitespace-pre-wrap text-xs leading-6 text-ink-secondary">{item.outcome}</p>
                  </div>
                )}
              </article>
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
