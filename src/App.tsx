import React, { useState, useMemo, useEffect, lazy } from "react";
import { flushSync } from "react-dom";
import { orderPortfolioProjects } from "./utils/homeProjects";
import { routeMotion } from "./utils/routeMotion";
import { revealLinkedRecord } from "./utils/linkedRecord";
import { remoteConfigured, readRemoteSnapshot } from "./utils/remoteContent";
import { Project, WorkLog, NavigationTab } from "./types";
import { loadProjects, saveProjects } from "./utils/storage";
import { SmartHeader } from "./components/SmartHeader";
import { EntryLanding } from "./components/EntryLanding";
import { HomePage } from "./components/HomePage";
import { ArchiveView } from "./components/ArchiveView";
import { AboutPage } from "./components/AboutPage";
import { VersionJournal } from "./components/VersionJournal";
import { ProjectPage } from "./components/ProjectPage";
import { PromptHistoryView } from "./components/PromptHistoryView";
import { parseRoute, routeHash, type ArchiveRoute } from "./utils/navigation";
import { Toast, ToastMessage } from "./components/Toast";
import { contentChanges, draftKey, storeDraft } from "./utils/contentDraft";
import { parseImportJson } from "./utils/storage";
import { safeRead } from "./utils/archiveQuery";
import { Info, X, Download } from "lucide-react";

import { DeferredEditor } from "./components/DeferredEditor";

const RemoteStudio = lazy(() =>
  import("./components/RemoteStudio").then((module) => ({
    default: module.RemoteStudio,
  })),
);
const MediaLibrary = lazy(() =>
  import("./components/MediaLibrary").then((module) => ({
    default: module.MediaLibrary,
  })),
);
const ProjectDetail = lazy(() =>
  import("./components/ProjectDetail").then((module) => ({
    default: module.ProjectDetail,
  })),
);
const ProjectModal = lazy(() =>
  import("./components/ProjectModal").then((module) => ({
    default: module.ProjectModal,
  })),
);
const WorkLogModal = lazy(() =>
  import("./components/WorkLogModal").then((module) => ({
    default: module.WorkLogModal,
  })),
);
const DevelopmentLogView = lazy(() =>
  import("./components/DevelopmentLogView").then((module) => ({
    default: module.DevelopmentLogView,
  })),
);
const JsonBackupModal = lazy(() =>
  import("./components/JsonBackupModal").then((module) => ({
    default: module.JsonBackupModal,
  })),
);
const DeleteConfirmModal = lazy(() =>
  import("./components/DeleteConfirmModal").then((module) => ({
    default: module.DeleteConfirmModal,
  })),
);

export default function App() {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [published, setPublished] = useState<Project[]>(() => projects);
  const visitorProjects = useMemo(
    () => orderPortfolioProjects(published.filter((p) => p.visible !== false)),
    [published],
  );
  const [review, setReview] = useState(false);
  const [recovery, setRecovery] = useState<Project[] | null>(null);
  const [remoteAdmin, setRemoteAdmin] = useState(false);
  const [remoteAbout, setRemoteAbout] = useState<string | null>(null);
  const [aboutDraft, setAboutDraft] = useState<string | null>(
    () => safeRead("minlab_about_intro_v1_draft") || null,
  );
  useEffect(() => {
    if (!remoteConfigured) return;
    let live = true;
    readRemoteSnapshot()
      .then((value) => {
        if (!live || !value) return;
        setPublished(value.content);
        setRemoteAbout(value.about);
        if (!safeRead(draftKey)) setProjects(value.content);
        if (!safeRead("minlab_about_intro_v1_draft"))
          setAboutDraft(value.about);
      })
      .catch(() => {
        /* Static data remains readable during a backend outage. */
      });
    return () => {
      live = false;
    };
  }, []);
  const dragIndex = React.useRef<number | null>(null);
  useEffect(() => {
    const saved = safeRead(draftKey);
    if (saved) {
      const parsed = parseImportJson(saved);
      if (parsed.success && parsed.projects) setProjects(JSON.parse(saved));
    }
  }, []);
  const changes = contentChanges(published, projects);
  const hasDraft =
    changes.added.length > 0 ||
    changes.removed.length > 0 ||
    changes.changed.length > 0 ||
    changes.reordered;
  const [route, setRoute] = useState<ArchiveRoute>(() =>
    parseRoute(window.location.hash || "#/start"),
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
  useEffect(() => {
    if (
      remoteConfigured &&
      !remoteAdmin &&
      (route.view === "manage" || (route.view === "records" && route.editing))
    )
      navigate({ view: "admin" });
  }, [remoteAdmin, route]);
  const manageRecords = route.view === "records" && !!route.editing;
  const setManageRecords = (editing: boolean) => {
    if (route.view === "records")
      navigate({ ...route, editing: editing || undefined });
  };
  const [adminSection, setAdminSection] = useState("projects");
  const [adminSearch, setAdminSearch] = useState("");

  useEffect(() => {
    const priorRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    let restoring = false;
    let current = window.location.hash || "#/start";
    let position = window.scrollY;
    const save = () => {
      if (
        restoring ||
        (window.location.hash || "#/start").split("?")[0] !==
          current.split("?")[0]
      )
        return;
      position = window.scrollY;
      // Filter edits replace the current URL without a hashchange event.
      current = window.location.hash || "#/start";
      try {
        sessionStorage.setItem("minlab_scroll:" + current, String(position));
        if (parseRoute(current).view === "archive")
          sessionStorage.setItem("minlab_last_archive", current);
      } catch {
        /* Page navigation remains available without session storage. */
      }
    };
    let frame = 0;
    let navigationId = 0;
    let requestedRecord: string | undefined;
    const motion = routeMotion();
    const captureRecord = (event: MouseEvent) => {
      requestedRecord = undefined;
      if (
        event.button ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[data-record-link]",
      );
      if (link && link.target !== "_blank")
        requestedRecord = link.dataset.recordLink;
    };
    const update = (event?: HashChangeEvent) => {
      const navigation = ++navigationId;
      const explicitRecord = requestedRecord;
      requestedRecord = undefined;
      restoring = true;
      try {
        const previous = event?.oldURL
          ? new URL(event.oldURL).hash || "#/start"
          : current;
        sessionStorage.setItem("minlab_scroll:" + previous, String(position));
        if (parseRoute(previous).view === "archive")
          sessionStorage.setItem("minlab_last_archive", previous);
      } catch {}
      current = window.location.hash || "#/start";
      const nextRoute = parseRoute(current);
      void motion.run(
        () =>
          new Promise<void>((resolve) => {
            if (navigation !== navigationId) return resolve();
            flushSync(() => setRoute(nextRoute));
            frame = window.setTimeout(() => {
              if (navigation !== navigationId) return resolve();
              let top = 0;
              let saved: string | null = null;
              try {
                saved = sessionStorage.getItem("minlab_scroll:" + current);
                top = Number(saved) || 0;
              } catch {}
              window.scrollTo({ top, behavior: "instant" });
              if (
                nextRoute.view === "project" &&
                nextRoute.logId &&
                (saved === null || explicitRecord === nextRoute.logId)
              )
                revealLinkedRecord(nextRoute.logId);
              position = window.scrollY;
              restoring = false;
              resolve();
            }, 0);
          }),
        nextRoute.view === "project" ? nextRoute.projectId : undefined,
      );
    };
    window.addEventListener("hashchange", update);
    document.addEventListener("click", captureRecord, true);
    window.addEventListener("scroll", save, { passive: true });
    const initial = parseRoute(current);
    const initialHash = current;
    if (initial.view === "project" && initial.logId)
      frame = window.setTimeout(() => {
        if (navigationId || current !== initialHash) return;
        revealLinkedRecord(initial.logId!);
        position = window.scrollY;
      }, 0);
    return () => {
      history.scrollRestoration = priorRestoration;
      clearTimeout(frame);
      motion.dispose();
      window.removeEventListener("hashchange", update);
      document.removeEventListener("click", captureRecord, true);
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
    if (!storeDraft(newProjects)) {
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
    return (
      (route.view === "project" ? published : projects).find(
        (p) =>
          p.id === selectedProjectId &&
          (route.view !== "project" || p.visible !== false),
      ) || null
    );
  }, [projects, published, route.view, selectedProjectId]);

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
          ? `'${projectToSave.name}' 프로젝트 초안을 저장했습니다.`
          : `새 프로젝트 '${projectToSave.name}'초안을 저장했습니다.`,
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
    if (!storeDraft(projects)) return;
    try {
      localStorage.setItem("minlab_before_delete_v2", JSON.stringify(projects));
    } catch {
      return;
    }
    setRecovery(projects);
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
    navigate({ view: "records", projectId, editing: true });
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

      {route.view !== "landing" && (
        <SmartHeader view={route.view === "project" ? "archive" : route.view} />
      )}

      {/* Storage & Data Preservation Notice Banner */}
      {showStorageNotice &&
        (route.view === "admin" ||
          route.view === "manage" ||
          manageRecords) && (
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
        className={
          route.view === "landing"
            ? "entry-root flex-1 w-full"
            : "flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9"
        }
      >
        {selectedProject && route.view === "project" ? (
          <ProjectPage
            key={selectedProject.id}
            project={
              published.find((p) => p.id === selectedProject.id) ||
              selectedProject
            }
            projects={visitorProjects}
            linkedLogId={route.view === "project" ? route.logId : undefined}
          />
        ) : selectedProject ? (
          /* Project Detail Page */
          <div className="managed-project">
            <DeferredEditor>
              <ProjectDetail
                project={selectedProject}
                onBack={() => navigate({ view: "admin" })}
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
            </DeferredEditor>
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
        ) : route.view === "landing" ? (
          <EntryLanding />
        ) : route.view === "home" ? (
          <HomePage projects={visitorProjects} />
        ) : route.view === "about" ? (
          <AboutPage projects={visitorProjects} introOverride={remoteAbout} />
        ) : route.view === "archive" ? (
          <ArchiveView projects={visitorProjects} />
        ) : route.view === "admin" ? (
          <section className="admin-dashboard">
            <header className="page-heading">
              <p className="eyebrow">관리자</p>
              <h1>기록을 관리합니다.</h1>
              <p>
                {remoteConfigured
                  ? "관리자 로그인 후 서버 초안 저장과 공개 반영을 관리합니다."
                  : "이 브라우저에 저장되는 편집 공간입니다. 운영 사이트의 원본 데이터를 직접 변경하지 않습니다."}
              </p>
            </header>
            {remoteConfigured && (
              <DeferredEditor>
                <RemoteStudio
                  projects={projects}
                  onAuth={setRemoteAdmin}
                  about={aboutDraft}
                  onLoad={(value, about) => {
                    if (!updateProjectsState(value)) return false;
                    setAboutDraft(about);
                    return true;
                  }}
                  onPublish={(value, about) => {
                    setPublished(value);
                    setRemoteAbout(about);
                  }}
                />
              </DeferredEditor>
            )}
            {(!remoteConfigured || remoteAdmin) && (
              <>
                <section className="draft-review" aria-label="초안 관리">
                  <p>
                    편집 내용은 초안으로만 저장됩니다. 적용하면 이 브라우저의
                    방문자 화면이 바뀝니다. 운영 사이트 배포는 승인된 파일
                    반영으로 별도 진행합니다.
                  </p>
                  <button
                    className="primary-link"
                    disabled={!hasDraft}
                    onClick={() => setReview(!review)}
                  >
                    변경 사항 검토 {hasDraft ? "· 초안 있음" : ""}
                  </button>
                  {review && (
                    <div>
                      <p>
                        추가 {changes.added.length}개 · 수정{" "}
                        {changes.changed.length}개 · 제거{" "}
                        {changes.removed.length}개 ·{" "}
                        {changes.reordered
                          ? "표시 순서 변경 있음"
                          : "표시 순서 유지"}
                      </p>
                      {[...changes.added, ...changes.changed].map((p) => (
                        <details key={p.id}>
                          <summary>{p.name} · 수정 내용 확인</summary>
                          <div className="draft-diff">
                            <pre>
                              {JSON.stringify(
                                published.find((b) => b.id === p.id) || {},
                                null,
                                2,
                              )}
                            </pre>
                            <pre>{JSON.stringify(p, null, 2)}</pre>
                          </div>
                        </details>
                      ))}
                      {changes.removed.map((p) => (
                        <p key={p.id}>제거 예정: {p.name}</p>
                      ))}
                      <button
                        className="primary-link"
                        onClick={() => {
                          if (
                            !window.confirm(
                              "검토한 초안을 이 브라우저의 방문자 화면에 적용할까요?",
                            )
                          )
                            return;
                          if (!saveProjects(projects)) {
                            showToast(
                              "적용하지 못했습니다. 초안은 유지됩니다.",
                              "error",
                            );
                            return;
                          }
                          setPublished(projects);
                          setReview(false);
                          try {
                            localStorage.removeItem(draftKey);
                          } catch {}
                          showToast(
                            "이 브라우저에 적용했습니다. 운영 사이트에는 배포되지 않았습니다.",
                            "success",
                          );
                        }}
                      >
                        승인하고 이 브라우저에 적용
                      </button>
                    </div>
                  )}
                  {hasDraft && (
                    <button
                      className="text-link"
                      onClick={() => {
                        if (
                          confirm(
                            "저장한 초안을 버리고 현재 적용된 데이터로 돌아갈까요?",
                          )
                        ) {
                          setProjects(published);
                          setReview(false);
                          try {
                            localStorage.removeItem(draftKey);
                          } catch {}
                        }
                      }}
                    >
                      초안 버리기
                    </button>
                  )}
                  {recovery && (
                    <button
                      className="text-link"
                      onClick={() => {
                        updateProjectsState(recovery);
                        setRecovery(null);
                      }}
                    >
                      마지막 삭제 되돌리기
                    </button>
                  )}
                  <button
                    className="text-link"
                    onClick={() => {
                      const saved = safeRead("minlab_before_delete_v2");
                      if (saved) {
                        const result = parseImportJson(saved);
                        if (
                          result.success &&
                          result.projects &&
                          confirm("삭제 전 상태를 초안으로 복구할까요?")
                        )
                          updateProjectsState(result.projects);
                      }
                    }}
                  >
                    삭제 전 백업 복구
                  </button>
                </section>
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
                    프로젝트
                  </button>
                  <a href="#/development-log?edit=1">기록 관리</a>
                  <button
                    aria-pressed={adminSection === "about"}
                    onClick={() => setAdminSection("about")}
                  >
                    소개 편집
                  </button>
                  <button
                    aria-pressed={adminSection === "media"}
                    onClick={() => setAdminSection("media")}
                  >
                    프로젝트 이미지
                  </button>
                  <button onClick={() => setIsBackupModalOpen(true)}>
                    백업·복원
                  </button>
                </nav>
                {adminSection === "about" ? (
                  <AboutPage
                    editing
                    projects={projects}
                    introOverride={aboutDraft}
                    onDraft={setAboutDraft}
                  />
                ) : adminSection === "media" ? (
                  <DeferredEditor>
                    <MediaLibrary
                      projects={projects}
                      onEdit={(p) => {
                        setEditingProject(p);
                        setIsProjectModalOpen(true);
                      }}
                    />
                  </DeferredEditor>
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
                    <label className="admin-search">
                      프로젝트 검색
                      <input
                        type="search"
                        aria-label="관리할 프로젝트 검색"
                        placeholder="이름, 설명, 분야로 검색"
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                      />
                    </label>
                    <p className="result-count" role="status">
                      {
                        projects.filter((p) =>
                          [p.name, p.description, p.category]
                            .join(" ")
                            .toLowerCase()
                            .includes(adminSearch.toLowerCase()),
                        ).length
                      }
                      개 표시 / 전체 {projects.length}개
                    </p>
                    <div className="admin-projects">
                      {projects.map((p, index) =>
                        ![p.name, p.description, p.category]
                          .join(" ")
                          .toLowerCase()
                          .includes(adminSearch.toLowerCase()) ? null : (
                          <article
                            key={p.id}
                            draggable
                            onDragStart={() => {
                              dragIndex.current = index;
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const from = dragIndex.current;
                              if (from === null || from === index) return;
                              const ordered = [...projects];
                              const [item] = ordered.splice(from, 1);
                              ordered.splice(index, 0, item);
                              updateProjectsState(ordered);
                              dragIndex.current = null;
                            }}
                          >
                            <a
                              href={routeHash({
                                view: "manage",
                                projectId: p.id,
                              })}
                            >
                              <strong>{p.name}</strong>
                              <span>
                                {p.category} / {p.status}
                              </span>
                            </a>
                            <a
                              className="text-link"
                              href={routeHash({
                                view: "project",
                                projectId: p.id,
                              })}
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
                        ),
                      )}
                    </div>
                  </>
                )}
                <p className="admin-future">
                  프로젝트 편집 내용과 이미지는 이 브라우저에 저장됩니다. 백업
                  파일을 내려받아 보관하세요.
                </p>
              </>
            )}
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
                    editing: manageRecords || undefined,
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
                    editing: manageRecords || undefined,
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
            {manageRecords && (
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
                  프로젝트 JSON 백업에 개발일지와 프롬프트 원본이 함께
                  보존됩니다.
                </p>
              </div>
            )}
            {route.view === "records" && route.tab === "prompts" ? (
              <PromptHistoryView
                readOnly={!manageRecords}
                projects={manageRecords ? projects : visitorProjects}
                projectId={devLogProjectIdFilter}
                onUpdateProject={handleUpdateProject}
              />
            ) : !manageRecords ? (
              <VersionJournal
                projects={manageRecords ? projects : visitorProjects}
                projectId={devLogProjectIdFilter}
                onSelect={(id) =>
                  navigate({
                    view: "records",
                    projectId: id || undefined,
                    editing: manageRecords || undefined,
                  })
                }
              />
            ) : (
              <DeferredEditor>
                <DevelopmentLogView
                  projects={projects}
                  selectedProjectIdFilter={devLogProjectIdFilter}
                  onSelectProjectIdFilter={(id) =>
                    navigate({
                      view: "records",
                      projectId: id || undefined,
                      editing: manageRecords || undefined,
                    })
                  }
                  onOpenAddLogModal={(defId, existing) =>
                    handleOpenWorkLogModal(defId, existing)
                  }
                  onRequestDeleteLog={(log, pId) =>
                    handleRequestDeleteLog(log, pId)
                  }
                  onNavigateToProject={(pId) => setSelectedProjectId(pId)}
                />
              </DeferredEditor>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      {route.view !== "landing" && (
        <footer className="mt-auto border-t border-line py-6 text-xs text-muted bg-canvas">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">MinLab</span>
              <span>·</span>
              <span>AI 활용 · 프로젝트 · 개발일지</span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-muted">
              {(route.view === "admin" ||
                route.view === "manage" ||
                manageRecords) && (
                <button
                  onClick={() => setIsBackupModalOpen(true)}
                  className="hover:text-accent transition-colors"
                >
                  JSON 데이터 백업·복원
                </button>
              )}
              <span>·</span>

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
      )}

      {/* Modals */}
      {/* 1. Project Add / Edit Modal */}
      <DeferredEditor
        active={isProjectModalOpen}
        onCancel={() => setIsProjectModalOpen(false)}
      >
        <ProjectModal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setEditingProject(null);
          }}
          onSave={handleSaveProject}
          initialProject={editingProject}
          allProjects={projects}
        />
      </DeferredEditor>

      {/* 2. Project Delete Confirmation Modal */}
      <DeferredEditor
        active={projectToDelete !== null}
        onCancel={() => setProjectToDelete(null)}
      >
        <DeleteConfirmModal
          isOpen={projectToDelete !== null}
          title="프로젝트 삭제 확인"
          itemName={projectToDelete ? projectToDelete.name : ""}
          warningText={
            projectToDelete
              ? `삭제 후 초안 검토에서 반영하며, 관리자에서 삭제 전 백업을 복구할 수 있습니다. 등록된 기능(${projectToDelete.keyFeatures?.length || 0}개), 개발 기록(${projectToDelete.workLogs?.length || 0}건), 프롬프트 기록이 함께 삭제됩니다.`
              : "삭제 후 초안 검토에서 반영하며, 관리자에서 삭제 전 백업을 복구할 수 있습니다."
          }
          confirmText="삭제"
          onClose={() => setProjectToDelete(null)}
          onConfirm={handleConfirmDelete}
        />
      </DeferredEditor>

      {/* 3. Work Log Add / Edit Modal */}
      <DeferredEditor
        active={isWorkLogModalOpen}
        onCancel={() => setIsWorkLogModalOpen(false)}
      >
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
      </DeferredEditor>

      {/* 4. Work Log Delete Confirmation Modal */}
      <DeferredEditor
        active={logToDeleteInfo !== null}
        onCancel={() => setLogToDeleteInfo(null)}
      >
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
      </DeferredEditor>

      {/* 5. JSON Backup / Restore Modal */}
      <DeferredEditor
        active={isBackupModalOpen}
        onCancel={() => setIsBackupModalOpen(false)}
      >
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
      </DeferredEditor>
    </div>
  );
}
