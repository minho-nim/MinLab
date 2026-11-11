import { useEffect, useState } from "react";
import { ArrowUpRight, Grid2X2, List, Search } from "lucide-react";
import type { Project } from "../types";
import {
  archiveHash,
  defaultQuery,
  queryProjects,
  readArchiveQuery,
  safeRead,
  safeWrite,
  type ArchiveQuery,
} from "../utils/archiveQuery";
import { routeHash } from "../utils/navigation";
import { ProjectMedia } from "./ProjectMedia";
export function ArchiveView({ projects }: { projects: Project[] }) {
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
        <p className="eyebrow">THE ARCHIVE / ALL PROJECTS</p>
        <h1>
          만들고, 배우고,
          <br />
          <em>다시 발전시킵니다.</em>
        </h1>
        <p>
          작은 실험부터 실제 사용하는 도구까지. 프로젝트와 그 과정을 탐색하세요.
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
            {options(projects.flatMap((p) => p.techStack)).map((v) => (
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
      <p className="result-count" role="status">
        {String(filtered.length).padStart(2, "0")} PROJECTS{" "}
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
          {filtered.map((p, i) => (
            <a
              className="archive-project"
              key={p.id}
              href={routeHash({ view: "project", projectId: p.id })}
            >
              <ProjectMedia project={p} />
              <div className="archive-project-copy">
                <p className="eyebrow">
                  {String(i + 1).padStart(2, "0")} / {p.category}
                </p>
                <h2>
                  {p.name}
                  <ArrowUpRight size={22} />
                </h2>
                <p className="project-description">{p.description}</p>
                <div className="project-tags">
                  <span>{p.status}</span>
                  {p.techStack.slice(0, 3).map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
