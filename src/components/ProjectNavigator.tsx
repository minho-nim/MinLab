import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { motionAllowed } from "../utils/visualMotion";
import type { Project } from "../types";
import { routeHash } from "../utils/navigation";
import { lastArchive } from "../utils/archiveQuery";
import { relatedProjects, nextProject } from "../utils/projectRelations";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
export function ProjectNavigator({
  project,
  projects,
}: {
  project: Project;
  projects: Project[];
}) {
  const related = relatedProjects(project, projects),
    next = nextProject(project, projects);
  const details = useRef<HTMLDetailsElement>(null);
  const track = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const visible = projects.filter((p) => p.visible !== false);
  const position = visible.findIndex((p) => p.id === project.id);
  const updateEdges = () => {
    const node = track.current;
    if (!node) return;
    const next = {
      start: node.scrollLeft <= 2,
      end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 2,
    };
    setEdges((previous) =>
      previous.start === next.start && previous.end === next.end
        ? previous
        : next,
    );
  };
  const revealCurrent = () => {
    const node = track.current;
    const current = node?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!node || !current || !details.current?.open) return;
    const area = node.getBoundingClientRect();
    const card = current.getBoundingClientRect();
    node.scrollBy({
      left: card.left - area.left - (area.width - card.width) / 2,
      behavior: "instant",
    });
    updateEdges();
  };
  const move = (direction: number) =>
    track.current?.scrollBy({
      left: direction * track.current.clientWidth * 0.75,
      behavior: motionAllowed() ? "smooth" : "instant",
    });
  useEffect(() => {
    revealCurrent();
  }, [project.id]);
  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const observer = new ResizeObserver(updateEdges);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const media = matchMedia("(min-width:900px)");
    const update = () => {
      if (details.current) details.current.open = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <section className="project-connections" aria-label="프로젝트 간 이동">
      {related.length > 0 && (
        <div className="related-projects">
          <p className="eyebrow">관련 프로젝트</p>
          <div>
            {related.map((p) => (
              <a
                href={routeHash({ view: "project", projectId: p.id })}
                key={p.id}
              >
                {mediaFor(p).length > 0 && <ProjectMedia project={p} />}
                <small>{p.category}</small>
                <h3>{p.name} ↗</h3>
                <p>{p.description}</p>
              </a>
            ))}
          </div>
        </div>
      )}
      {next ? (
        <a
          className="next-project next-project-showcase"
          href={routeHash({ view: "project", projectId: next.id })}
        >
          <div>
            <span className="eyebrow">다음 프로젝트 / {next.category}</span>
            <h2>{next.name}</h2>
            <p>{next.description}</p>
            <span className="text-link">다음 프로젝트 보기 ↗</span>
          </div>
          {mediaFor(next).length > 0 && <ProjectMedia project={next} />}
        </a>
      ) : (
        <a className="next-project" href={lastArchive()}>
          <span className="eyebrow">마지막 프로젝트입니다.</span>
          <strong>전체 아카이브로 돌아가기 ↗</strong>
        </a>
      )}
      <details
        className="mini-project-menu"
        ref={details}
        onToggle={() => {
          if (details.current?.open) revealCurrent();
        }}
      >
        <summary>
          다른 프로젝트로 이동 <span>{project.name}</span>
        </summary>
        <div className="mini-project-controls">
          <p>
            {position >= 0
              ? `${String(position + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`
              : `${visible.length}개 프로젝트`}
          </p>
          <a href={lastArchive()}>전체 목록 ↗</a>
          <button
            type="button"
            aria-label="프로젝트 탐색기 왼쪽으로"
            disabled={edges.start}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="프로젝트 탐색기 오른쪽으로"
            disabled={edges.end}
            onClick={() => move(1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
        <nav
          ref={track}
          className="mini-project-track"
          aria-label="프로젝트 미니 내비게이터"
          onScroll={updateEdges}
          onKeyDown={(event) => {
            if (
              event.altKey ||
              event.ctrlKey ||
              event.metaKey ||
              event.shiftKey
            )
              return;
            const links = Array.from(
              event.currentTarget.querySelectorAll<HTMLAnchorElement>("a"),
            );
            const index = links.indexOf(
              document.activeElement as HTMLAnchorElement,
            );
            if (index < 0) return;
            const next =
              event.key === "ArrowRight"
                ? Math.min(index + 1, links.length - 1)
                : event.key === "ArrowLeft"
                  ? Math.max(0, index - 1)
                  : event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? links.length - 1
                      : -1;
            if (next < 0) return;
            event.preventDefault();
            const link = links[next];
            link.focus({ preventScroll: true });
            const area = event.currentTarget.getBoundingClientRect();
            const card = link.getBoundingClientRect();
            if (card.left < area.left || card.right > area.right)
              event.currentTarget.scrollBy({
                left: card.left - area.left - 8,
                behavior: motionAllowed() ? "smooth" : "instant",
              });
          }}
        >
          {visible.map((p) => (
            <a
              aria-current={p.id === project.id ? "page" : undefined}
              key={p.id}
              href={routeHash({ view: "project", projectId: p.id })}
            >
              <div className="mini-project-image">
                {mediaFor(p).length > 0 ? (
                  <ProjectMedia project={p} />
                ) : (
                  <span className="mini-project-monogram" aria-hidden="true">
                    {(p.englishName || p.name).slice(0, 2)}
                  </span>
                )}
              </div>
              <small>
                {p.id === project.id ? "보고 있는 프로젝트" : p.category}
              </small>
              <strong>{p.name}</strong>
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          ))}
        </nav>
      </details>
    </section>
  );
}
