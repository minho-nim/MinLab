import React, { useState, useMemo, useEffect } from "react";
import { Project, WorkLog, NavigationTab } from "./types";
import { loadProjects, saveProjects } from "./utils/storage";
import { SmartHeader } from "./components/SmartHeader";
import { MediaLibrary } from "./components/MediaLibrary";
import { HomePage } from "./components/HomePage";
import { ArchiveView } from "./components/ArchiveView";
import { AboutPage } from "./components/AboutPage";
import { VersionJournal } from "./components/VersionJournal";
import { ProjectDetail } from "./components/ProjectDetail";
import { ProjectPage } from "./components/ProjectPage";
import { PromptHistoryView } from "./components/PromptHistoryView";
import { parseRoute, routeHash, type ArchiveRoute } from "./utils/navigation";
import { ProjectModal } from "./components/ProjectModal";
import { WorkLogModal } from "./components/WorkLogModal";
import { DevelopmentLogView } from "./components/DevelopmentLogView";
import { JsonBackupModal } from "./components/JsonBackupModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { Toast, ToastMessage } from "./components/Toast";
import { safeRead } from "./utils/archiveQuery";
import { Info, X, Download } from "lucide-react";

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [route, setRoute] = useState<ArchiveRoute>(() =>
    parseRoute(window.location.hash || "#/home"),
  );
  const selectedProjectId =
    route.view === "project" || route.view === "manage"
      ? route.projectId
      : null;
  const currentTab: NavigationTab =
    route.view === "records" ? "development-log" : "projects";
  const devLogProjectIdFilter =
    route.view === "records" ? route.projectId || null : null;
  const navigate = (next: ArchiveRoute) => {
    const hash = routeHash(next);
    if (window.location.hash === hash)
      window.scrollTo({ top: 0, behavior: "instant" });
    else window.location.hash = hash;
  };
  const setSelectedProjectId = (id: string | null) =>
    navigate(id ? { view: "project", projectId: id } : { view: "archive" });
  const [manageRecords, setManageRecords] = useState(false);
  const [adminSection, setAdminSection] = useState("projects");

  useEffect(() => {
    const priorRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    let restoring = false;
    let current = window.location.hash || "#/home";
    let position = window.scrollY;
    const save = () => {
      if (
        restoring ||
        (window.location.hash || "#/home").split("?")[0] !==
          current.split("?")[0]
      )
        return;
      position = window.scrollY;
      // Filter edits replace the current URL without a hashchange event.
      current = window.location.hash || "#/home";
      try {
        sessionStorage.setItem("minlab_scroll:" + current, String(position));
        if (parseRoute(current).view === "archive")
          sessionStorage.setItem("minlab_last_archive", current);
      } catch {
        /* Page navigation remains available without session storage. */
      }
    };
    let frame = 0;
    const update = () => {
      restoring = true;
      try {
        sessionStorage.setItem("minlab_scroll:" + current, String(position));
      } catch {}
      current = window.location.hash || "#/home";
      setRoute(parseRoute(current));
      setManageRecords(false);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          let top = 0;
          try {
            top =
              Number(sessionStorage.getItem("minlab_scroll:" + current)) || 0;
          } catch {}
          window.scrollTo({ top, behavior: "instant" });
          position = window.scrollY;
          restoring = false;
        }),
      );
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      history.scrollRestoration = priorRestoration;
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", update);
      window.removeEventListener("scroll", save);
    };
  }, []);

  // Storage notice banner visibility
  const [showStorageNotice, setShowStorageNotice] = useState<boolean>(() => {
    return safeRead("minlab_hide_storage_notice") !== "true";
  });

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Work Log Modal
  const [isWorkLogModalOpen, setIsWorkLogModalOpen] = useState(false);
  const [workLogDefaultProjectId, setWorkLogDefaultProjectId] = useState<
    string | null
  >(null);
  const [editingWorkLog, setEditingWorkLog] = useState<WorkLog | null>(null);
  const [logToDeleteInfo, setLogToDeleteInfo] = useState<{
    log: WorkLog;
    projectId: string;
  } | null>(null);

  // JSON Backup Modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast Helper
  const showToast = (
    text: string,
    type: "success" | "error" | "info" = "info",
  ) => {
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
  const updateProjectsState = (newProjects: Project[]): boolean => {
    if (!saveProjects(newProjects)) {
      showToast(
        "브라우저 저장 공간에 기록하지 못했습니다. JSON 백업 후 저장 공간을 확인해 주세요.",
        "error",
      );
      return false;
    }
    setProjects(newProjects);
    return true;
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

  // Handlers for Project Add / Edit
  const handleSaveProject = (projectToSave: Project): boolean => {
    const exists = projects.some((p) => p.id === projectToSave.id);
    let updatedList: Project[];

    if (exists) {
      updatedList = projects.map((p) =>
        p.id === projectToSave.id ? projectToSave : p,
      );
    } else {
      updatedList = [projectToSave, ...projects];
    }

    if (updateProjectsState(updatedList)) {
      showToast(
        exists
          ? `'${projectToSave.name}' 프로젝트가 수정되었습니다.`
          : `새 프로젝트 '${projectToSave.name}'이(가) 등록되었습니다.`,
        "success",
      );
      return true;
    }
    return false;
  };

  const handleUpdateProject = (updated: Project): boolean => {
    const updatedList = projects.map((p) =>
      p.id === updated.id ? updated : p,
    );
    return updateProjectsState(updatedList);
  };

  // Handlers for Project Deletion
  const handleRequestDelete = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleConfirmDelete = () => {
    if (!projectToDelete) return;
    const deletedName = projectToDelete.name;
    const updatedList = projects.filter((p) => p.id !== projectToDelete.id);
    if (!updateProjectsState(updatedList)) return;
    if (selectedProjectId === projectToDelete.id) {
      setSelectedProjectId(null);
    }
    setProjectToDelete(null);
    showToast(`'${deletedName}' 프로젝트가 삭제되었습니다.`, "info");
  };

  // Handlers for Work Log
  const handleOpenWorkLogModal = (
    defaultProjId?: string | null,
    existingLog: WorkLog | null = null,
  ) => {
    setWorkLogDefaultProjectId(
      defaultProjId || selectedProjectId || (projects[0]?.id ?? null),
    );
    setEditingWorkLog(existingLog);
    setIsWorkLogModalOpen(true);
  };

  const handleSaveWorkLog = (
    logToSave: WorkLog,
    targetProjectId: string,
  ): boolean => {
    const targetProject = projects.find((p) => p.id === targetProjectId);
    if (!targetProject) {
      showToast("대상 프로젝트를 찾을 수 없습니다.", "error");
      return false;
    }

    const currentLogs = targetProject.workLogs || [];
    const logExists = currentLogs.some((l) => l.id === logToSave.id);

    let updatedLogs: WorkLog[];
    if (logExists) {
      updatedLogs = currentLogs.map((l) =>
        l.id === logToSave.id ? logToSave : l,
      );
    } else {
      updatedLogs = [logToSave, ...currentLogs];
    }

    const updatedProject: Project = {
      ...targetProject,
      workLogs: updatedLogs,
      updatedAt: new Date().toISOString(),
    };

    const updatedList = projects.map((p) =>
      p.id === updatedProject.id ? updatedProject : p,
    );
    if (updateProjectsState(updatedList)) {
      showToast(
        logExists
          ? "개발 기록이 수정되었습니다."
          : "새 개발 기록이 등록되었습니다.",
        "success",
      );
      return true;
    }
    return false;
  };

  const handleRequestDeleteLog = (log: WorkLog, targetProjectId: string) => {
    setLogToDeleteInfo({ log, projectId: targetProjectId });
  };

  const handleConfirmDeleteLog = () => {
    if (!logToDeleteInfo) return;
    const { log, projectId } = logToDeleteInfo;
    const targetProj = projects.find((p) => p.id === projectId);
    if (targetProj) {
      const updatedLogs = (targetProj.workLogs || []).filter(
        (l) => l.id !== log.id,
      );
      const updatedProj: Project = {
        ...targetProj,
        workLogs: updatedLogs,
        updatedAt: new Date().toISOString(),
      };
      const updatedList = projects.map((p) =>
        p.id === updatedProj.id ? updatedProj : p,
      );
      if (updateProjectsState(updatedList)) {
        showToast(
          `'${log.title || log.task || "개발 기록"}'이 삭제되었습니다.`,
          "info",
        );
      }
    }
    setLogToDeleteInfo(null);
  };

  // Navigate to Development Log for a specific project
  const handleViewLogsForProject = (projectId: string) => {
    navigate({ view: "records", projectId });
  };

  const handleDismissNotice = () => {
    setShowStorageNotice(false);
    try {
      localStorage.setItem("minlab_hide_storage_notice", "true");
    } catch (err) {
      console.warn("Could not save storage notice preference:", err);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-ink flex flex-col font-sans selection:bg-accent selection:text-white">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={handleDismissToast} />

      <SmartHeader view={route.view === "project" ? "archive" : route.view} />

      {/* Storage & Data Preservation Notice Banner */}
      {showStorageNotice && (
        <aside
          aria-label="저장 방식 안내"
          className="bg-surface-alt border-b border-line px-4 py-2.5 text-xs"
        >
          <div className="max-w-6xl mx-auto flex items-start sm:items-center justify-between gap-3 text-ink-secondary">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-accent shrink-0" />
              <p className="leading-snug">
                기록은 이 브라우저에 저장됩니다. 보관하려면{" "}
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="text-accent underline font-medium hover:text-accent inline-flex items-center gap-0.5"
                >
                  <Download className="w-3 h-3 inline" />
                  백업·복원
                </button>
                에서 JSON 파일을 내려받으세요.
              </p>
            </div>
            <button
              onClick={handleDismissNotice}
              className="text-muted hover:text-ink p-1 rounded hover:bg-surface shrink-0"
              title="안내 닫기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Main View Container */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9"
      >
        {selectedProject && route.view === "project" ? (
          <ProjectPage
            key={selectedProject.id}
            project={selectedProject}
            projects={projects}
          />
        ) : selectedProject ? (
          /* Project Detail Page */
          <div className="managed-project">
            <ProjectDetail
              project={selectedProject}
              onBack={() =>
                navigate({ view: "project", projectId: selectedProject.id })
              }
              onUpdateProject={handleUpdateProject}
              onOpenEditProjectModal={(p) => {
                setEditingProject(p);
                setIsProjectModalOpen(true);
              }}
              onRequestDelete={() => handleRequestDelete(selectedProject)}
              onOpenAddWorkLogModal={(p, existing) =>
                handleOpenWorkLogModal(p.id, existing)
              }
              onNavigateToDevLog={(projectId) =>
                handleViewLogsForProject(projectId)
              }
              showToast={showToast}
            />
          </div>
        ) : selectedProjectId ? (
          <div className="py-16 text-center text-sm text-muted">
            <p>
              프로젝트를 찾을 수 없습니다. 이 브라우저에 데이터가 없다면 JSON
              백업을 가져오세요.
            </p>
            <a href="#/" className="mt-4 inline-block text-accent">
              아카이브로 돌아가기
            </a>
          </div>
        ) : route.view === "home" ? (
          <HomePage projects={projects} />
        ) : route.view === "about" ? (
          <AboutPage projects={projects} />
        ) : route.view === "archive" ? (
          <ArchiveView projects={projects} />
        ) : route.view === "admin" ? (
          <section className="admin-dashboard">
            <header className="page-heading">
              <p className="eyebrow">관리자</p>
              <h1>기록을 관리합니다.</h1>
              <p>
                이 브라우저에 저장되는 편집 공간입니다. 운영 사이트의 원본
                데이터를 직접 변경하지 않습니다.
              </p>
            </header>
            <div className="admin-metrics">
              <div>
                <span>프로젝트</span>
                <strong>{projects.length}</strong>
              </div>
              <div>
                <span>개발일지</span>
                <strong>{totalLogsCount}</strong>
              </div>
              <div>
                <span>프롬프트</span>
                <strong>
                  {projects.reduce(
                    (n, p) => n + (p.promptHistory?.length || 0),
                    0,
                  )}
                </strong>
              </div>
            </div>
            <nav className="admin-tabs" aria-label="관리자 메뉴">
              <button
                aria-pressed={adminSection === "projects"}
                onClick={() => setAdminSection("projects")}
              >
                Projects
              </button>
              <a href="#/development-log">Development Logs</a>
              <button
                aria-pressed={adminSection === "about"}
                onClick={() => setAdminSection("about")}
              >
                About Editor
              </button>
              <button
                aria-pressed={adminSection === "media"}
                onClick={() => setAdminSection("media")}
              >
                프로젝트 이미지
              </button>
              <button onClick={() => setIsBackupModalOpen(true)}>
                Data Manager · 백업·복원
              </button>
            </nav>
            {adminSection === "about" ? (
              <AboutPage editing projects={projects} />
            ) : adminSection === "media" ? (
              <MediaLibrary
                projects={projects}
                onEdit={(p) => {
                  setEditingProject(p);
                  setIsProjectModalOpen(true);
                }}
              />
            ) : (
              <>
                <div className="section-heading">
                  <h2>프로젝트 관리</h2>
                  <button
                    className="primary-link"
                    onClick={() => {
                      setEditingProject(null);
                      setIsProjectModalOpen(true);
                    }}
                  >
                    + 프로젝트 등록
                  </button>
                </div>
                <div className="admin-projects">
                  {projects.map((p, index) => (
                    <article key={p.id}>
                      <a href={routeHash({ view: "manage", projectId: p.id })}>
                        <strong>{p.name}</strong>
                        <span>
                          {p.category} / {p.status}
                        </span>
                      </a>
                      <a
                        className="text-link"
                        href={routeHash({ view: "project", projectId: p.id })}
                      >
                        공개 화면 ↗
                      </a>
                      <button
                        disabled={index === 0}
                        aria-label={p.name + " 표시순 올리기"}
                        onClick={() => {
                          const ordered = [...projects];
                          [ordered[index - 1], ordered[index]] = [
                            ordered[index],
                            ordered[index - 1],
                          ];
                          updateProjectsState(ordered);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        disabled={index === projects.length - 1}
                        aria-label={p.name + " 표시순 내리기"}
                        onClick={() => {
                          const ordered = [...projects];
                          [ordered[index], ordered[index + 1]] = [
                            ordered[index + 1],
                            ordered[index],
                          ];
                          updateProjectsState(ordered);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => {
                          setEditingProject(p);
                          setIsProjectModalOpen(true);
                        }}
                      >
                        수정
                      </button>
                      <button onClick={() => handleRequestDelete(p)}>
                        삭제
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
            <p className="admin-future">
              추후 연결 예정 · AI Inbox / Review Center / Publishing — 현재
              미연동
            </p>
          </section>
        ) : currentTab === "development-log" ? (
          /* 2. Development Log View: 날짜별 개발 기록과 수정 이력 조회 및 프로젝트별 필터링 */
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3">
              <nav aria-label="기록 종류" className="flex gap-2 text-xs">
                <a
                  href={routeHash({
                    view: "records",
                    projectId: devLogProjectIdFilter || undefined,
                  })}
                  className={
                    "rounded-md px-3 py-2 " +
                    (route.view === "records" && route.tab === "prompts"
                      ? "text-muted"
                      : "bg-accent-soft font-semibold text-accent")
                  }
                >
                  개발일지
                </a>
                <a
                  href={routeHash({
                    view: "records",
                    projectId: devLogProjectIdFilter || undefined,
                    tab: "prompts",
                  })}
                  className={
                    "rounded-md px-3 py-2 " +
                    (route.view === "records" && route.tab === "prompts"
                      ? "bg-accent-soft font-semibold text-accent"
                      : "text-muted")
                  }
                >
                  작업 프롬프트
                </a>
              </nav>
              {route.view === "records" && route.tab === "prompts" && (
                <select
                  aria-label="기록 대상 프로젝트"
                  value={devLogProjectIdFilter || ""}
                  onChange={(event) =>
                    navigate({
                      view: "records",
                      projectId: event.target.value || undefined,
                      tab: "prompts",
                    })
                  }
                  className="max-w-full rounded-md border border-line bg-canvas px-2 py-2 text-xs text-ink"
                >
                  <option value="">전체 프로젝트</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="journal-mode">
              <button
                className="text-link"
                onClick={() => setManageRecords(!manageRecords)}
              >
                {manageRecords
                  ? "방문자용 타임라인 보기"
                  : "관리자 · 상세 기록 편집"}
              </button>
              <p>
                프로젝트 JSON 백업에 개발일지와 프롬프트 원본이 함께 보존됩니다.
              </p>
            </div>
            {route.view === "records" && route.tab === "prompts" ? (
              <PromptHistoryView
                projects={projects}
                projectId={devLogProjectIdFilter}
                onUpdateProject={handleUpdateProject}
              />
            ) : !manageRecords ? (
              <VersionJournal
                projects={projects}
                projectId={devLogProjectIdFilter}
                onSelect={(id) =>
                  navigate({ view: "records", projectId: id || undefined })
                }
              />
            ) : (
              <DevelopmentLogView
                projects={projects}
                selectedProjectIdFilter={devLogProjectIdFilter}
                onSelectProjectIdFilter={(id) =>
                  navigate({ view: "records", projectId: id || undefined })
                }
                onOpenAddLogModal={(defId, existing) =>
                  handleOpenWorkLogModal(defId, existing)
                }
                onRequestDeleteLog={(log, pId) =>
                  handleRequestDeleteLog(log, pId)
                }
                onNavigateToProject={(pId) => setSelectedProjectId(pId)}
              />
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-line py-6 text-xs text-muted bg-canvas">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink">MinLab</span>
            <span>·</span>
            <span>AI 활용 · 프로젝트 · 개발일지</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted">
            <button
              onClick={() => setIsBackupModalOpen(true)}
              className="hover:text-accent transition-colors"
            >
              JSON 데이터 백업·복원
            </button>
            <span>·</span>
            <span>브라우저에 저장</span>
            <span>·</span>
            <a
              href="https://github.com/minho-nim/MinLab"
              target="_blank"
              rel="noreferrer"
              className="hover:text-ink transition-colors"
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
        itemName={projectToDelete ? projectToDelete.name : ""}
        warningText={
          projectToDelete
            ? `주의: 삭제 시 데이터가 영구적으로 제거됩니다. 등록된 기능(${projectToDelete.keyFeatures?.length || 0}개), 개발 기록(${projectToDelete.workLogs?.length || 0}건), 프롬프트 기록이 함께 삭제됩니다.`
            : "주의: 삭제 시 데이터가 영구적으로 제거됩니다."
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
        itemName={
          logToDeleteInfo
            ? logToDeleteInfo.log.title ||
              logToDeleteInfo.log.task ||
              `${logToDeleteInfo.log.date} 기록`
            : ""
        }
        description={
          logToDeleteInfo
            ? `내용: "${logToDeleteInfo.log.content || logToDeleteInfo.log.task || ""}"`
            : undefined
        }
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
          const saved = updateProjectsState(restoredProjects);
          if (
            saved &&
            selectedProjectId &&
            !restoredProjects.some((p) => p.id === selectedProjectId)
          ) {
            setSelectedProjectId(null);
          }
          return saved;
        }}
        showToast={showToast}
      />
    </div>
  );
}
