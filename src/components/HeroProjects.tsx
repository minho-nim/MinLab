import { useEffect, useRef, useState } from "react";
import type { Project } from "../types";
import { routeHash } from "../utils/navigation";
import { ProjectMedia } from "./ProjectMedia";

export function HeroProjects({ projects }: { projects: Project[] }) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id || "");
  const nav = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    projects.findIndex((p) => p.id === selectedId),
  );
  const selected = projects[index];
  useEffect(() => {
    const button = buttons.current[index],
      track = nav.current;
    if (track && button)
      track.scrollTo({
        left: button.offsetLeft - track.offsetLeft - 4,
        behavior: "instant",
      });
  }, [index]);
  if (!selected) return null;
  const choose = (i: number, focus = false) => {
    const next = Math.max(0, Math.min(i, projects.length - 1));
    setSelectedId(projects[next].id);
    if (focus) buttons.current[next]?.focus({ preventScroll: true });
  };
  return (
    <>
      <div className="hero-project-cloud" aria-label="실제 프로젝트 화면 모음">
        {projects.map((p, i) => (
          <a
            key={p.id}
            className={
              "hero-project hero-project-" +
              i +
              (i === 0 ? " hero-main-image" : "")
            }
            href={routeHash({ view: "project", projectId: p.id })}
            aria-label={p.name + " 프로젝트 살펴보기"}
          >
            <div className="hero-project-visual">
              <ProjectMedia project={p} eager={i < 2} />
              <p className="hero-project-description">{p.description}</p>
            </div>
            <div className="hero-project-label">
              <strong>{p.name}</strong>
              <span>{p.category} ↗</span>
            </div>
          </a>
        ))}
      </div>
      <div className="hero-mobile-showcase">
        <a
          id="hero-mobile-preview"
          className="hero-mobile-featured"
          href={routeHash({ view: "project", projectId: selected.id })}
          aria-label={selected.name + " 프로젝트 살펴보기"}
        >
          <ProjectMedia project={selected} eager />
          <div className="hero-mobile-caption">
            <div>
              <strong>{selected.name}</strong>
              <span>{selected.category}</span>
            </div>
            <span aria-hidden="true">살펴보기 ↗</span>
          </div>
        </a>
        <nav
          className="hero-thumbnail-track"
          ref={nav}
          aria-label="첫 화면 프로젝트 선택"
        >
          {projects.map((p, i) => (
            <button
              type="button"
              key={p.id}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              aria-pressed={index === i}
              aria-controls="hero-mobile-preview"
              aria-label={p.name + " 화면 선택"}
              onClick={() => choose(i)}
              onKeyDown={(e) => {
                const target =
                  e.key === "ArrowRight"
                    ? i + 1
                    : e.key === "ArrowLeft"
                      ? i - 1
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? projects.length - 1
                          : null;
                if (target !== null) {
                  e.preventDefault();
                  choose(target, true);
                }
              }}
            >
              <span className="hero-thumbnail-image" aria-hidden="true">
                <ProjectMedia project={p} />
              </span>
              <span>{p.name}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
