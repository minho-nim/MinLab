import React, { useState, useMemo } from 'react';
import { Project, WorkLog } from './types';
import { loadProjects, saveProjects } from './utils/storage';
import { Navbar } from './components/Navbar';
import { StatsBanner } from './components/StatsBanner';
import { ProjectCard } from './components/ProjectCard';
import { ProjectDetail } from './components/ProjectDetail';
import { ProjectModal } from './components/ProjectModal';
import { WorkLogModal } from './components/WorkLogModal';
import { JsonBackupModal } from './components/JsonBackupModal';
import { Toast, ToastMessage } from './components/Toast';

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('전체');

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [projectForWorkLog, setProjectForWorkLog] = useState<Project | null>(null);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);

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

  // Currently selected project
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [projects]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Filter by tab
      if (activeFilter === '개발 중') {
        if (p.status !== '개발 중') return false;
      } else if (activeFilter !== '전체') {
        if (p.category !== activeFilter) return false;
      }

      // 2. Filter by search query
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
  }, [projects, activeFilter, searchQuery]);

  // Project Handlers
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

  // Work Log Handlers
  const handleOpenAddWorkLog = (project: Project, existingLog: WorkLog | null = null) => {
    setProjectForWorkLog(project);
    setEditingWorkLog(existingLog);
    setIsWorkLogModalOpen(true);
  };

  const handleSaveWorkLog = (logToSave: WorkLog) => {
    if (!projectForWorkLog) return;

    const currentLogs = projectForWorkLog.workLogs || [];
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
      ...projectForWorkLog,
      workLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    };

    handleUpdateProject(updatedProject);
    setProjectForWorkLog(updatedProject);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#E6EDF3] flex flex-col font-sans selection:bg-purple-600 selection:text-white">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      {/* Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenNewProjectModal={() => {
          setEditingProject(null);
          setIsProjectModalOpen(true);
        }}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onNavigateHome={() => setSelectedProjectId(null)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProject ? (
          /* Project Detail View */
          <ProjectDetail
            project={selectedProject}
            onBack={() => setSelectedProjectId(null)}
            onUpdateProject={handleUpdateProject}
            onOpenEditProjectModal={(p) => {
              setEditingProject(p);
              setIsProjectModalOpen(true);
            }}
            onOpenAddWorkLogModal={handleOpenAddWorkLog}
            showToast={showToast}
          />
        ) : (
          /* Project Catalog / List View */
          <div className="space-y-8">
            {/* Header & Filter */}
            <StatsBanner
              projects={projects}
              activeFilter={activeFilter}
              onSelectFilter={setActiveFilter}
              categories={categories}
            />

            {/* Projects List */}
            {filteredProjects.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#8B949E] space-y-3 border border-dashed border-[#21262D] rounded-xl">
                <p>일치하는 프로젝트가 없습니다.</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilter('전체');
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onSelect={(p) => setSelectedProjectId(p.id)}
                    onEdit={(p) => {
                      setEditingProject(p);
                      setIsProjectModalOpen(true);
                    }}
                    onAddLog={(p) => handleOpenAddWorkLog(p, null)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#21262D] py-6 text-xs text-[#8B949E]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#F0F6FC]">MinLab</span>
            <span>·</span>
            <span>연구·개발 아카이브</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-[#6E7681]">
            <span>JSON 백업 지원</span>
            <span>·</span>
            <span>개발 기록 관리</span>
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

      {/* 2. Work Log Modal */}
      <WorkLogModal
        isOpen={isWorkLogModalOpen}
        onClose={() => {
          setIsWorkLogModalOpen(false);
          setProjectForWorkLog(null);
          setEditingWorkLog(null);
        }}
        onSave={handleSaveWorkLog}
        initialLog={editingWorkLog}
      />

      {/* 3. JSON Backup / Restore Modal */}
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
