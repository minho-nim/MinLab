import React, { useState, useMemo } from 'react';
import { Project, WorkLog, NavigationTab } from './types';
import { loadProjects, saveProjects } from './utils/storage';
import { Navbar } from './components/Navbar';
import { StatsBanner } from './components/StatsBanner';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectModal } from './components/ProjectModal';
import { WorkLogModal } from './components/WorkLogModal';
import { DevelopmentLogView } from './components/DevelopmentLogView';
import { JsonBackupModal } from './components/JsonBackupModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { Toast, ToastMessage } from './components/Toast';
import { Info, X, Download } from 'lucide-react';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<NavigationTab>('projects');

  // Search & Filter (for Projects Tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('전체');

  // Development Log specific project filter
  const [devLogProjectIdFilter, setDevLogProjectIdFilter] = useState<string | null>(null);

  // Storage notice banner visibility
  const [showStorageNotice, setShowStorageNotice] = useState<boolean>(() => {
    return localStorage.getItem('minlab_hide_storage_notice') !== 'true';
  });

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Work Log Modal
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [workLogDefaultProjectId, setWorkLogDefaultProjectId] = useState<string | null>(null);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [logToDeleteInfo, setLogToDeleteInfo] = useState<{ log: WorkLog; projectId: string } | null>(null);

  // JSON Backup Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync to localStorage
  const updateProjectsState = (newProjects: Project[]) => {
    setProjects(newProjects);
    saveProjects(newProjects);
  };

  // Currently selected project for Detail view
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Aggregate metrics
  const totalLogsCount = useMemo(() => {
    return projects.reduce((acc, p) => acc + (p.workLogs?.length || 0), 0);
  }, [projects]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [projects]);

  // Filtered projects for the 'Projects' catalog view (supports 상태 및 분야/기술 태그)
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Filter by status or category tab
      if (activeCategoryFilter === '구상 중') {
        if (p.status !== '구상 중') return false;
      } else if (activeCategoryFilter === '개발 중') {
        if (p.status !== '개발 중') return false;
      } else if (activeCategoryFilter === '완성') {
        if (p.status !== '완성' && p.status !== '완료') return false;
      } else if (activeCategoryFilter === '보류') {
        if (p.status !== '보류') return false;
      } else if (activeCategoryFilter !== '전체') {
        if (p.category !== activeCategoryFilter) return false;
      }

      // 2. Filter by global search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inName = p.name.toLowerCase().includes(q);
        const inEn = (p.englishName || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inTech = (p.techStack || []).some((t) => t.toLowerCase().includes(q));
        const inCat = (p.category || '').toLowerCase().includes(q);
        return inName || inEn || inDesc || inTech || inCat;
      }

      return true;
    });
  }, [projects, activeCategoryFilter, searchQuery]);

  // Handlers for Project Add / Edit
  const handleSaveProject = (projectToSave: Project) => {
    const exists = projects.some((p) => p.id === projectToSave.id);
    let updatedList: Project[];

    if (exists) {
      updatedList = projects.map((p) => (p.id === projectToSave.id ? projectToSave : p));
      showToast(`'${projectToSave.name}' 프로젝트가 수정되었습니다.`, 'success');
    } else {
      updatedList = [projectToSave, ...projects];
      showToast(`새 프로젝트 '${projectToSave.name}'이(가) 등록되었습니다.`, 'success');
    }

    updateProjectsState(updatedList);
  };

  const handleUpdateProject = (updated: Project) => {
    const updatedList = projects.map((p) => (p.id === updated.id ? updated : p));
    updateProjectsState(updatedList);
  };

  // Handlers for Project Deletion
  const handleRequestDelete = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    const deletedName = projectToDelete.name;
    const updatedList = projects.filter((p) => p.id !== projectToDelete.id);
    updateProjectsState(updatedList);
    if (selectedProjectId === projectToDelete.id) {
      setSelectedProjectId(null);
    }
    setProjectToDelete(null);
    showToast(`'${deletedName}' 프로젝트가 삭제되었습니다.`, 'info');
  };

  // Handlers for Work Log
  const handleOpenWorkLogModal = (
    defaultProjId?: string | null,
    existingLog: WorkLog | null = null
  ) => {
    setWorkLogDefaultProjectId(defaultProjId || selectedProjectId || (projects[0]?.id ?? null));
    setEditingWorkLog(existingLog);
    setIsWorkLogModalOpen(true);
  };

  const handleSaveWorkLog = (logToSave: WorkLog, targetProjectId: string) => {
    const targetProject = projects.find((p) => p.id === targetProjectId);
    if (!targetProject) {
      showToast('대상 프로젝트를 찾을 수 없습니다.', 'error');
      return;
    }

    const currentLogs = targetProject.workLogs || [];
    const logExists = currentLogs.some((l) => l.id === logToSave.id);

    let updatedLogs: WorkLog[];
    if (logExists) {
      updatedLogs = currentLogs.map((l) => (l.id === logToSave.id ? logToSave : l));
      showToast('개발 기록이 수정되었습니다.', 'success');
    } else {
      updatedLogs = [logToSave, ...currentLogs];
      showToast('새 개발 기록이 등록되었습니다.', 'success');
    }

    const updatedProject: Project = {
      ...targetProject,
      workLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    };

    handleUpdateProject(updatedProject);
  };

  const handleRequestDeleteLog = (log: WorkLog, targetProjectId: string) => {
    setLogToDeleteInfo({ log, projectId: targetProjectId });
  };

  const handleConfirmDeleteLog = () => {
    if (!logToDeleteInfo) return;
    const { log, projectId } = logToDeleteInfo;
    const targetProj = projects.find((p) => p.id === projectId);
    if (targetProj) {
      const updatedLogs = (targetProj.workLogs || []).filter((l) => l.id !== log.id);
      const updatedProj: Project = {
        ...targetProj,
        workLogs: updatedLogs,
        updatedAt: new Date().toISOString(),
      };
      handleUpdateProject(updatedProj);
      showToast(`'${log.title || log.task || '개발 기록'}'이 삭제되었습니다.`, 'info');
    }
    setLogToDeleteInfo(null);
  };

  // Navigate to Development Log for a specific project
  const handleViewLogsForProject = (projectId: string) => {
    setSelectedProjectId(null);
    setDevLogProjectIdFilter(projectId);
    setCurrentTab('development-log');
  };

  const handleDismissNotice = () => {
    setShowStorageNotice(false);
    localStorage.setItem('minlab_hide_storage_notice', 'true');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#E6EDF3] flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Main Navigation Bar (Projects & Development Log) */}
      <Navbar
        currentTab={selectedProject ? 'projects' : currentTab}
        onSelectTab={(tab) => {
          setSelectedProjectId(null);
          setCurrentTab(tab);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewProjectModal={() => {
          setEditingProject(null);
          setIsProjectModalOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onNavigateHome={() => {
          setSelectedProjectId(null);
          setCurrentTab('projects');
        }}
        totalProjectsCount={projects.length}
        totalLogsCount={totalLogsCount}
      />

      {/* Storage & Data Preservation Notice Banner */}
      {showStorageNotice && (
        <aside aria-label="저장 방식 안내" className="bg-[#111726] border-b border-[#21262D] px-4 py-2.5 text-xs">
          <div className="max-w-6xl mx-auto flex items-start sm:items-center justify-between gap-3 text-[#C9D1D9]">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400 shrink-0" />
              <p className="leading-snug">
                <strong className="text-purple-300 font-medium">데이터 저장 및 보존 안내:</strong>{' '}
                모든 프로젝트와 개발 기록은 별도 서버 없이 브라우저 로컬 스토리지(LocalStorage)에 안전하게 저장됩니다.
                브라우저 캐시 삭제 시 데이터가 유실될 수 있으므로, 상단{' '}
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="text-purple-400 underline font-medium hover:text-purple-300 inline-flex items-center gap-0.5"
                >
                  <Download className="w-3 h-3 inline" />
                  [백업·복원]
                </button>
                을 통해 주기적으로 JSON 백업 파일을 다운로드해 보관하세요.
              </p>
            </div>
            <button
              onClick={handleDismissNotice}
              className="text-[#8B949E] hover:text-[#F0F6FC] p-1 rounded hover:bg-[#161B22] shrink-0"
              title="안내 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Main View Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProject ? (
          /* Project Detail Page */
          <ProjectDetail
            project={selectedProject}
            onBack={() => setSelectedProjectId(null)}
            onUpdateProject={handleUpdateProject}
            onOpenEditProjectModal={(p) => {
              setEditingProject(p);
              setIsProjectModalOpen(true);
            }}
            onRequestDelete={() => handleRequestDelete(selectedProject)}
            onOpenAddWorkLogModal={(p, existing) => handleOpenWorkLogModal(p.id, existing)}
            onNavigateToDevLog={(projectId) => handleViewLogsForProject(projectId)}
            showToast={showToast}
          />
        ) : currentTab === 'projects' ? (
          /* 1. Projects View: 전체 프로젝트 목록, 태그 필터, 프로젝트 카드 */
          <div className="space-y-8">
            <StatsBanner
              projects={projects}
              activeFilter={activeCategoryFilter}
              onSelectFilter={setActiveCategoryFilter}
              categories={categories}
            />

            {filteredProjects.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8B949E] space-y-3 border border-dashed border-[#21262D] rounded-xl">
                <p>일치하는 프로젝트가 없습니다.</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategoryFilter('전체');
                    }}
                    className="px-2.5 py-1 rounded-md text-xs text-[#C9D1D9] bg-[#161B22] hover:bg-[#21262D] border border-[#30363D]"
                  >
                    필터 초기화
                  </button>
                  <button
                    onClick={() => {
                      setEditingProject(null);
                      setIsProjectModalOpen(true);
                    }}
                    className="px-3 py-1 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500"
                  >
                    + 새 프로젝트
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-5">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={(p) => setSelectedProjectId(p.id)}
                    onEdit={(p) => {
                      setEditingProject(p);
                      setIsProjectModalOpen(true);
                    }}
                    onDelete={handleRequestDelete}
                    onViewLogs={handleViewLogsForProject}
                  />
                ))}
              </div>
            )}
          </div>
        ) : currentTab === 'development-log' ? (
          /* 2. Development Log View: 날짜별 개발 기록과 수정 이력 조회 및 프로젝트별 필터링 */
          <DevelopmentLogView
            projects={projects}
            selectedProjectIdFilter={devLogProjectIdFilter}
            onSelectProjectIdFilter={setDevLogProjectIdFilter}
            onOpenAddLogModal={(defId, existing) => handleOpenWorkLogModal(defId, existing)}
            onRequestDeleteLog={(log, pId) => handleRequestDeleteLog(log, pId)}
            onNavigateToProject={(pId) => setSelectedProjectId(pId)}
          />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#21262D] py-6 text-xs text-[#8B949E] bg-[#0A0D14]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F0F6FC]">MinLab</span>
            <span>·</span>
            <span>개인 연구·개발 포트폴리오 & 아카이브</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6E7681]">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="hover:text-purple-400 transition-colors"
            >
              JSON 데이터 백업·복원
            </button>
            <span>·</span>
            <span>브라우저 LocalStorage 보존</span>
            <span>·</span>
            <a
              href="https://github.com/minho-nim/MinLab"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#F0F6FC] transition-colors"
            >
              GitHub 저장소
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {/* 1. Project Add / Edit Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        initialProject={editingProject}
      />

      {/* 2. Project Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={projectToDelete !== null}
        title="프로젝트 삭제 확인"
        itemName={projectToDelete ? projectToDelete.name : ''}
        warningText={
          projectToDelete
            ? `주의: 삭제 시 데이터가 영구적으로 제거됩니다. 등록된 기능(${projectToDelete.keyFeatures?.length || 0}개), 개발 기록(${projectToDelete.workLogs?.length || 0}건), 변경 내역이 함께 삭제됩니다.`
            : '주의: 삭제 시 데이터가 영구적으로 제거됩니다.'
        }
        confirmText="삭제"
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* 3. Work Log Add / Edit Modal */}
      <WorkLogModal
        isOpen={isWorkLogModalOpen}
        onClose={() => {
          setIsWorkLogModalOpen(false);
          setWorkLogDefaultProjectId(null);
          setEditingWorkLog(null);
        }}
        onSave={handleSaveWorkLog}
        initialLog={editingWorkLog}
        projects={projects}
        defaultProjectId={workLogDefaultProjectId}
      />

      {/* 4. Work Log Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={logToDeleteInfo !== null}
        title="개발 기록 삭제 확인"
        itemName={logToDeleteInfo ? (logToDeleteInfo.log.title || logToDeleteInfo.log.task || `${logToDeleteInfo.log.date} 기록`) : ''}
        description={logToDeleteInfo ? `내용: "${logToDeleteInfo.log.content || logToDeleteInfo.log.task || ''}"` : undefined}
        warningText="해당 개발 기록(날짜, 버전, 변경 사항, 수정 이유, 테스트 결과, 다음 작업 등)이 영구 삭제됩니다."
        confirmText="삭제"
        onClose={() => setLogToDeleteInfo(null)}
        onConfirm={handleConfirmDeleteLog}
      />

      {/* 5. JSON Backup / Restore Modal */}
      <JsonBackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        projects={projects}
        onRestore={(restoredProjects) => {
          updateProjectsState(restoredProjects);
          if (selectedProjectId && !restoredProjects.some((p) => p.id === selectedProjectId)) {
            setSelectedProjectId(null);
          }
        }}
        showToast={showToast}
      />
    </div>
  );
}
