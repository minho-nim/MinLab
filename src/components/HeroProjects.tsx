import {
  projectDestination,
  projectLinkLabel,
} from "../utils/projectDestinations";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Project } from "../types";
import { ProjectMedia } from "./ProjectMedia";

export function HeroProjects({ projects }: { projects: Project[] }) {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:899px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(max-width:899px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    update();
    return () => query.removeEventListener("change", update);
  }, []);
  const [selectedId, setSelectedId] = useState(projects[0]?.id || "");
  const nav = useRef<HTMLElement>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
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
  }, [index, mobile]);
  if (!selected) return null;
  const choose = (i: number, focus = false) => {
    const next = Math.max(0, Math.min(i, projects.length - 1));
    setSelectedId(projects[next].id);
    if (focus) buttons.current[next]?.focus({ preventScroll: true });
  };
  return !mobile ? (
    <div className="hero-project-cloud" aria-label="프로젝트 화면 미리보기">
      {projects.map((p, i) => (
        <a
          key={p.id}
          style={{ "--screen-order": i } as CSSProperties}
          className={
            "hero-project hero-project-" +
            i +
            (i === 0 ? " hero-main-image" : "")
          }
          {...projectDestination(p.id)}
          aria-label={p.name + " " + projectLinkLabel(p.id)}
        >
          <div className="hero-project-visual">
            <ProjectMedia project={p} eager={i === 0} priority={i === 0} />
            <p className="hero-project-description">{p.description}</p>
          </div>
          <div className="hero-project-label">
            <strong>{p.name}</strong>
            <span>{p.category} ↗</span>
          </div>
        </a>
      ))}
    </div>
  ) : (
    <div className="hero-mobile-showcase">
      <a
        id="hero-mobile-preview"
        className="hero-mobile-featured"
        {...projectDestination(selected.id)}
        aria-label={selected.name + " " + projectLinkLabel(selected.id)}
        onPointerDown={() => {
          swiped.current = false;
        }}
        onTouchStart={(event) => {
          swiped.current = false;
          touch.current =
            event.touches.length === 1
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
              : null;
        }}
        onTouchMove={(event) => {
          if (event.touches.length > 1) touch.current = null;
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          const point = touch.current;
          touch.current = null;
          if (!point || event.touches.length) return;
          const dx = point.x - event.changedTouches[0].clientX;
          const dy = point.y - event.changedTouches[0].clientY;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            if (event.cancelable) event.preventDefault();
            swiped.current = true;
            choose(index + (dx > 0 ? 1 : -1));
          }
        }}
        onClick={(event) => {
          if (swiped.current && event.detail !== 0) {
            event.preventDefault();
            swiped.current = false;
          }
        }}
      >
        <ProjectMedia project={selected} eager priority />
        <div className="hero-mobile-caption">
          <div>
            <strong>{selected.name}</strong>
            <span>{selected.category}</span>
          </div>
          <span aria-hidden="true">{projectLinkLabel(selected.id)} ↗</span>
        </div>
      </a>
      <p className="hero-swipe-hint">좌우로 넘겨 다른 프로젝트 보기</p>
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
  );
}
