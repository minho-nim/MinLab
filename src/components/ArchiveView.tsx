import { useEffect, useState, useRef } from "react";
import { ArrowUpRight, Grid2X2, List, Search } from "lucide-react";
import type { Project } from "../types";
import {
  projectTags,
  archiveHash,
  defaultQuery,
  queryProjects,
  readArchiveQuery,
  safeRead,
  safeWrite,
  type ArchiveQuery,
} from "../utils/archiveQuery";
import { routeHash } from "../utils/navigation";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
export function ArchiveView({ projects }: { projects: Project[] }) {
  const [filtersOpen, setFiltersOpen] = useState(
    () => safeRead("minlab_archive_filters_open") === "true",
  );
  const [hovered, setHovered] = useState<Project | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState<ArchiveQuery>(() => {
    const value = readArchiveQuery(location.hash);
    if (!new URLSearchParams(location.hash.split("?")[1]).has("layout"))
      value.layout = safeRead("minlab_archive_layout", "grid");
    return value;
  });
  useEffect(() => {
    const restore = () => setQuery(readArchiveQuery(location.hash));
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, []);
  const change = (patch: Partial<ArchiveQuery>) => {
    const next = { ...query, ...patch };
    setQuery(next);
    history.replaceState(null, "", archiveHash(next));
    safeWrite("minlab_archive_layout", next.layout);
  };
  const filtered = queryProjects(projects, query);
  const options = (values: string[]) =>
    [...new Set(values.filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, "ko"),
    );
  return (
    <div className="archive-view">
      <header className="page-heading">
        <p className="eyebrow">프로젝트 아카이브</p>
        <h1>전체 프로젝트</h1>
        <p>
          웹앱, 게임, 업무용 도구를 모았습니다. 이름이나 기술로 검색할 수
          있습니다.
        </p>
      </header>
      <div className="archive-toolbar">
        <label className="archive-search">
          <Search size={18} />
          <input
            type="search"
            aria-label="프로젝트 검색"
            placeholder="이름, 설명, 기술 태그로 검색"
            value={query.q}
            onChange={(e) => change({ q: e.target.value })}
          />
        </label>
        <div className="view-switch" aria-label="보기 방식">
          <button
            aria-label="그리드 보기"
            aria-pressed={query.layout === "grid"}
            onClick={() => change({ layout: "grid" })}
          >
            <Grid2X2 size={18} />
          </button>
          <button
            aria-label="리스트 보기"
            aria-pressed={query.layout === "list"}
            onClick={() => change({ layout: "list" })}
          >
            <List size={18} />
          </button>
        </div>
      </div>
      <nav className="category-bar" aria-label="프로젝트 분야">
        {["", ...options(projects.map((p) => p.category))].map((c) => (
          <button
            key={c}
            aria-pressed={query.category === c}
            onClick={() => change({ category: c })}
          >
            {c || "전체"}
          </button>
        ))}
      </nav>
      <details
        className="filter-disclosure"
        open={filtersOpen}
        onToggle={(e) => {
          setFiltersOpen(e.currentTarget.open);
          safeWrite(
            "minlab_archive_filters_open",
            String(e.currentTarget.open),
          );
        }}
      >
        <summary>상세 필터 및 정렬</summary>
        <div className="archive-filters">
          <label>
            분야
            <select
              aria-label="카테고리 필터"
              value={query.category}
              onChange={(e) => change({ category: e.target.value })}
            >
              <option value="">전체 분야</option>
              {options(projects.map((p) => p.category)).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            상태
            <select
              aria-label="개발 상태 필터"
              value={query.status}
              onChange={(e) => change({ status: e.target.value })}
            >
              <option value="">전체 상태</option>
              {options(projects.map((p) => p.status)).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            태그
            <select
              aria-label="기술 태그 필터"
              value={query.tag}
              onChange={(e) => change({ tag: e.target.value })}
            >
              <option value="">전체 기술</option>
              {options(projects.flatMap(projectTags)).map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            정렬
            <select
              aria-label="프로젝트 정렬"
              value={query.sort}
              onChange={(e) => change({ sort: e.target.value })}
            >
              <option value="manual">등록된 표시순</option>
              <option value="latest">최신 수정순</option>
              <option value="name">이름순</option>
            </select>
          </label>
          <button
            className="text-link"
            onClick={() => change({ ...defaultQuery, layout: query.layout })}
          >
            초기화 ↗
          </button>
        </div>
      </details>
      <p className="result-count" role="status">
        {String(filtered.length).padStart(2, "0")}개의 프로젝트{" "}
        <span>/ 전체 {projects.length}개</span>
      </p>
      {!filtered.length ? (
        <div className="empty-state">
          <h2>검색 결과가 없습니다.</h2>
          <p>검색어를 바꾸거나 필터를 초기화해 보세요.</p>
          <button
            className="primary-link"
            onClick={() => change({ ...defaultQuery, layout: query.layout })}
          >
            전체 프로젝트 보기 ↗
          </button>
        </div>
      ) : (
        <div className={"project-collection " + query.layout}>
          {query.layout === "list" && (
            <div className="archive-list-head">
              <span>프로젝트</span>
              <span>분야</span>
              <span>개발 상태</span>
              <span>최근 수정</span>
            </div>
          )}
          {filtered.map((p) => (
            <a
              className={
                "archive-project " +
                (!mediaFor(p).length ? "text-project" : "image-project")
              }
              onPointerEnter={(e) => {
                if (query.layout === "list" && e.pointerType === "mouse")
                  setHovered(p);
              }}
              onPointerLeave={() => setHovered(null)}
              onPointerMove={(e) => {
                if (preview.current) {
                  preview.current.style.left =
                    Math.min(innerWidth - 290, e.clientX + 24) + "px";
                  preview.current.style.top =
                    Math.max(8, Math.min(innerHeight - 220, e.clientY + 24)) +
                    "px";
                }
              }}
              key={p.id}
              href={routeHash({ view: "project", projectId: p.id })}
            >
              {query.layout === "grid" && mediaFor(p).length > 0 && (
                <ProjectMedia project={p} />
              )}
              {query.layout === "list" && (
                <div className="archive-list-row">
                  <strong>{p.name} ↗</strong>
                  <span>{p.category}</span>
                  <span>{p.status}</span>
                  <time>{p.updatedAt?.slice(0, 10) || "미등록"}</time>
                </div>
              )}
              <div
                className={
                  "archive-project-copy " +
                  (query.layout === "list" ? "grid-only-copy" : "")
                }
              >
                <p className="eyebrow">{p.category}</p>
                <h2>
                  {p.name}
                  <ArrowUpRight size={22} />
                </h2>
                <p className="project-description">{p.description}</p>
                <div className="card-footer">
                  <span>
                    {p.workLogs.length
                      ? `개발 기록 ${p.workLogs.length}`
                      : "프로젝트 소개"}
                  </span>
                  <span>살펴보기 ↗</span>
                </div>
                <div className="project-tags">
                  <span>{p.status}</span>
                  {p.techStack.slice(0, 2).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
      {hovered && query.layout === "list" && mediaFor(hovered).length > 0 && (
        <div ref={preview} className="archive-hover-preview" aria-hidden="true">
          <ProjectMedia project={hovered} />
          <strong>{hovered.name}</strong>
        </div>
      )}
    </div>
  );
}
