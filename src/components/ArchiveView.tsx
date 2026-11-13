import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { ArrowUpRight, Grid2X2, List, Search, X } from "lucide-react";
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
import {
  projectGroups,
  projectGroup,
  groupLabel,
} from "../utils/projectGroups";
import { routeHash } from "../utils/navigation";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
import { useCollectionMotion } from "../utils/useCollectionMotion";
export function ArchiveView({ projects }: { projects: Project[] }) {
  const [filtersOpen, setFiltersOpen] = useState(
    () => safeRead("minlab_archive_filters_open") === "true",
  );
  const [hovered, setHovered] = useState<Project | null>(null);
  const preview = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const activeFilters = useRef<HTMLDivElement>(null);
  const categories = useRef<HTMLElement>(null);
  const filterFocus = useRef<string | null>(null);
  const cursor = useRef({ x: 0, y: 0 });
  const [query, setQuery] = useState<ArchiveQuery>(() => {
    const value = readArchiveQuery(location.hash);
    if (!new URLSearchParams(location.hash.split("?")[1]).has("layout"))
      value.layout = safeRead("minlab_archive_layout", "grid");
    return value;
  });
  const collection = useCollectionMotion(query);
  const positionPreview = (x: number, y: number) => {
    cursor.current = { x, y };
    const node = preview.current;
    if (!node) return;
    node.style.setProperty(
      "--preview-x",
      Math.max(8, Math.min(innerWidth - node.offsetWidth - 8, x + 24)) + "px",
    );
    node.style.setProperty(
      "--preview-y",
      Math.max(8, Math.min(innerHeight - node.offsetHeight - 8, y + 24)) + "px",
    );
  };
  useLayoutEffect(() => {
    const node = preview.current;
    if (!hovered || !node) return;
    const firstPosition = !node.style.getPropertyValue("--preview-x");
    if (firstPosition) node.style.transition = "none";
    positionPreview(cursor.current.x, cursor.current.y);
    if (firstPosition) {
      node.getBoundingClientRect();
      node.style.removeProperty("transition");
    }
  }, [hovered]);
  useEffect(() => {
    const dismiss = () => setHovered(null);
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Tab" || event.key === "Escape") dismiss();
    };
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
      window.removeEventListener("keydown", keyboard);
    };
  }, []);
  useEffect(() => {
    const restore = () => setQuery(readArchiveQuery(location.hash));
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, []);
  const change = (patch: Partial<ArchiveQuery>, animate = true) => {
    const next = { ...query, ...patch };
    collection.capture(animate);
    setHovered(null);
    setQuery(next);
    history.replaceState(null, "", archiveHash(next));
    safeWrite("minlab_archive_layout", next.layout);
  };
  const selected = [
    { key: "q", label: "검색", value: query.q },
    { key: "group", label: "분류", value: groupLabel(query.group) },
    { key: "category", label: "세부분야", value: query.category },
    { key: "status", label: "상태", value: query.status },
    { key: "tag", label: "태그", value: query.tag },
    {
      key: "sort",
      label: "정렬",
      value:
        query.sort === "name"
          ? "이름순"
          : query.sort === "latest"
            ? "최신 수정순"
            : "",
    },
  ].filter((item) => item.value);
  useLayoutEffect(() => {
    if (filterFocus.current === null) return;
    const key = filterFocus.current;
    filterFocus.current = null;
    const target = activeFilters.current?.querySelector<HTMLButtonElement>(
      `[data-filter-key="${key}"]`,
    );
    (target || search.current)?.focus({ preventScroll: true });
  }, [query]);
  useLayoutEffect(() => {
    const strip = categories.current;
    const selected = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!strip || !selected || strip.scrollWidth <= strip.clientWidth) return;
    const area = strip.getBoundingClientRect();
    const button = selected.getBoundingClientRect();
    if (button.left < area.left || button.right > area.right)
      strip.scrollBy({
        left: button.left - area.left - 8,
        behavior: "instant",
      });
  }, [query.category]);
  const removeFilter = (key: string, index: number) => {
    filterFocus.current =
      selected[index + 1]?.key || selected[index - 1]?.key || "";
    change({ [key]: defaultQuery[key as keyof ArchiveQuery] });
  };
  const clearFilters = () => {
    filterFocus.current = "";
    change({ ...defaultQuery, layout: query.layout });
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
            ref={search}
            type="search"
            aria-label="프로젝트 검색"
            placeholder="이름, 설명, 기술 태그로 검색"
            value={query.q}
            onChange={(e) => change({ q: e.target.value }, false)}
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
      <nav ref={categories} className="category-bar" aria-label="프로젝트 분야">
        {[
          { id: "", label: "전체" },
          ...projectGroups.filter((group) =>
            projects.some((p) => projectGroup(p.category) === group.id),
          ),
        ].map((c) => (
          <button
            key={c.id}
            aria-pressed={
              (query.group ||
                (query.category ? projectGroup(query.category) : "")) === c.id
            }
            onClick={() => change({ group: c.id, category: "" })}
          >
            {c.label}
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
        <summary>
          상세 필터 및 정렬
          {!!selected.filter((item) => item.key !== "q").length && (
            <span className="filter-active-count">
              {selected.filter((item) => item.key !== "q").length}개 적용 중
            </span>
          )}
        </summary>
        <div className="archive-filters">
          <label>
            세부분야
            <select
              aria-label="카테고리 필터"
              value={query.category}
              onChange={(e) => change({ category: e.target.value, group: "" })}
            >
              <option value="">전체 세부분야</option>
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
          <button className="text-link" onClick={clearFilters}>
            초기화 ↗
          </button>
        </div>
      </details>
      {!!selected.length && (
        <div
          ref={activeFilters}
          className="active-filter-bar"
          role="group"
          aria-label="적용한 탐색 조건"
        >
          {selected.map((item, index) => (
            <button
              key={item.key}
              data-filter-key={item.key}
              className="active-filter-chip"
              aria-label={`${item.label}: ${item.value} 해제`}
              onClick={() => removeFilter(item.key, index)}
            >
              <span>
                {item.label} <strong>{item.value}</strong>
              </span>
              <X size={14} aria-hidden="true" />
            </button>
          ))}
          <button className="filter-clear" onClick={clearFilters}>
            조건 초기화
          </button>
        </div>
      )}
      <p
        className="result-count"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {String(filtered.length).padStart(2, "0")}개의 프로젝트{" "}
        <span>/ 전체 {projects.length}개</span>
      </p>
      {!filtered.length ? (
        <div className="empty-state">
          <h2>검색 결과가 없습니다.</h2>
          <p>검색어를 바꾸거나 필터를 초기화해 보세요.</p>
          <button className="primary-link" onClick={clearFilters}>
            전체 프로젝트 보기 ↗
          </button>
        </div>
      ) : (
        <div
          ref={collection.root}
          className={"project-collection " + query.layout}
        >
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
              data-collection-key={p.id}
              className={
                "archive-project " +
                (!mediaFor(p).length ? "text-project" : "image-project")
              }
              onPointerEnter={(e) => {
                if (query.layout === "list" && e.pointerType === "mouse") {
                  positionPreview(e.clientX, e.clientY);
                  setHovered(p);
                }
              }}
              onPointerLeave={() => setHovered(null)}
              onPointerMove={(e) => {
                if (e.pointerType === "mouse") {
                  positionPreview(e.clientX, e.clientY);
                  if (query.layout === "list" && hovered?.id !== p.id)
                    setHovered(p);
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
