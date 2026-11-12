import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Project } from "../types";
import { routeHash } from "../utils/navigation";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
import { HeroProjects } from "./HeroProjects";
import { selectHomeProjects } from "../utils/homeProjects";
import { useHeroHandoff } from "../utils/useHeroHandoff";
import { motionAllowed } from "../utils/visualMotion";
import { MotionControl } from "./MotionControl";
export function FeaturedExplorer({ projects }: { projects: Project[] }) {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const node = section.current?.querySelector(".featured-sticky");
    if (!node) return;
    const observer = new ResizeObserver(() => {
      section.current?.style.setProperty(
        "--explore-height",
        Math.ceil(node.getBoundingClientRect().height) + "px",
      );
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const touchX = useRef(0);
  const touchY = useRef(0);
  const count = projects.length;
  const STEP = 120; // Native scroll distance per project; no wheel interception or scroll lock.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (
          !section.current ||
          !matchMedia("(min-width: 900px) and (min-height: 571px)").matches
        )
          return;
        const y = -section.current.getBoundingClientRect().top + 90;
        setActive(
          Math.min(count - 1, Math.max(0, Math.floor((y + STEP * 0.2) / STEP))),
        );
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, [count]);
  useEffect(() => {
    if (!matchMedia("(max-width:899px)").matches) return;
    const nav = section.current?.querySelector<HTMLElement>(".explorer-index");
    const button = nav?.querySelectorAll("button")[active];
    if (nav && button)
      nav.scrollTo({
        left: button.offsetLeft - nav.offsetLeft - 8,
        behavior: "instant",
      });
  }, [active]);
  if (!count) return null;
  const index = Math.max(0, Math.min(active, count - 1));
  const project = projects[index];
  const select = (value: number) => {
    const next = Math.max(0, Math.min(value, count - 1));
    setActive(next);
    if (
      section.current &&
      matchMedia("(min-width: 900px) and (min-height: 571px)").matches
    )
      window.scrollTo({
        top:
          section.current.getBoundingClientRect().top +
          window.scrollY -
          90 +
          next * STEP,
        behavior: "instant",
      });
  };
  return (
    <section
      id="selected-work"
      ref={section}
      className="featured-scroll"
      style={
        {
          "--explore-distance": `${Math.max(0, count - 1) * STEP}px`,
        } as React.CSSProperties
      }
    >
      <div className="featured-sticky">
        <div className="section-heading">
          <div>
            <p className="eyebrow">프로젝트 탐색</p>
            <h2>만든 프로젝트</h2>
          </div>
          <a className="text-link" href="#/">
            전체 아카이브 <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="explorer-layout">
          <nav className="explorer-index" aria-label="대표 프로젝트 선택">
            {projects.map((p, i) => (
              <button
                key={p.id}
                aria-current={index === i ? "true" : undefined}
                onClick={() => select(i)}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{p.name}</strong>
                  <small>{p.category}</small>
                </div>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </nav>
          <div
            className={
              "explorer-preview " +
              (!mediaFor(project).length ? "explorer-text" : "")
            }
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
              touchY.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              const delta = touchX.current - e.changedTouches[0].clientX;
              const vertical = touchY.current - e.changedTouches[0].clientY;
              if (
                Math.abs(delta) > 60 &&
                Math.abs(delta) > Math.abs(vertical) * 1.3
              )
                select(index + (delta > 0 ? 1 : -1));
            }}
          >
            {mediaFor(project).length > 0 && (
              <a
                href={routeHash({ view: "project", projectId: project.id })}
                className="showcase-image"
                aria-label={project.name + " 상세 보기"}
              >
                <ProjectMedia project={project} />
              </a>
            )}
            <div className="preview-copy" key={project.id}>
              <p className="eyebrow">
                {project.category} / {project.status}
              </p>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <p className="explorer-facts">
                {project.workLogs.length
                  ? `${project.workLogs.length}개의 개발 기록`
                  : "프로젝트 소개"}{" "}
                · {project.techStack.slice(0, 2).join(" · ")}
              </p>
              <div className="preview-bottom">
                <a
                  className="primary-link"
                  href={routeHash({ view: "project", projectId: project.id })}
                >
                  프로젝트 보기 <ArrowUpRight size={16} />
                </a>
                <span>
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(count).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="explorer-progress">
          <div>
            <i style={{ width: `${((index + 1) / count) * 100}%` }} />
          </div>
          <span>스크롤로 둘러보기 · 모바일은 좌우로 넘기기</span>
          <a
            className="text-link"
            href="#development-process"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("development-process")?.scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
                  ? "instant"
                  : "smooth",
              });
            }}
          >
            개발 과정으로 이동 ↗
          </a>
          <div className="explorer-controls">
            <button
              aria-label="이전 대표 프로젝트"
              disabled={index === 0}
              onClick={() => select(index - 1)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              aria-label="다음 대표 프로젝트"
              disabled={index === count - 1}
              onClick={() => select(index + 1)}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
export function HomePage({ projects }: { projects: Project[] }) {
  const hero = useRef<HTMLElement>(null);
  useHeroHandoff(hero);
  const hasScreen = (p: Project) => mediaFor(p).length > 0;
  const images = selectHomeProjects(projects.filter(hasScreen), hasScreen, 4);
  const featured = selectHomeProjects(projects, hasScreen, 6);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (hero.current)
          hero.current.style.setProperty(
            "--hero-progress",
            String(
              Math.min(
                1,
                Math.max(0, scrollY / (hero.current.offsetHeight * 0.85)),
              ),
            ),
          );
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <>
      <section
        className="home-hero project-first-hero"
        ref={hero}
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse" || !motionAllowed()) return;
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty(
            "--px",
            String((e.clientX - r.left) / r.width - 0.5),
          );
          e.currentTarget.style.setProperty(
            "--py",
            String((e.clientY - r.top) / r.height - 0.5),
          );
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.setProperty("--px", "0");
          e.currentTarget.style.setProperty("--py", "0");
        }}
      >
        <div className="hero-introduction">
          <div className="hero-copy">
            <p className="eyebrow">MinLab · 개인 프로젝트</p>
            <h1>
              <span>필요한 걸 만들고,</span>
              <span>하나씩 고칩니다.</span>
            </h1>
          </div>
          <div className="hero-support">
            <p>
              웹앱과 게임을 만들고 있습니다.
              <br />
              만들면서 바꾼 점도 함께 적어두었습니다.
            </p>
            <a className="text-link" href="#/">
              전체 {projects.length}개 프로젝트 둘러보기 ↗
            </a>
          </div>
        </div>
        <HeroProjects projects={images} />
        <div className="hero-foot">
          <MotionControl />
          <span>
            {images.length
              ? `대표 프로젝트 ${images.length}개`
              : "전체 프로젝트 목록을 열어보세요."}
          </span>
          <a
            href="#selected-work"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("selected-work")?.scrollIntoView({
                behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
                  ? "instant"
                  : "smooth",
              });
            }}
          >
            프로젝트 둘러보기 <ArrowDown size={15} />
          </a>
        </div>
      </section>
      <FeaturedExplorer projects={featured} />
      <section
        id="development-process"
        className="home-process process-journal-entry"
      >
        <div>
          <p className="eyebrow">개발일지</p>
          <h2>
            만들면서
            <br />
            바꾼 것들.
          </h2>
          <p>추가한 기능, 고친 문제, 테스트한 내용을 남겼습니다.</p>
          <a className="primary-link" href="#/development-log">
            개발일지 보기 ↗
          </a>
        </div>
        <div className="recent-process-notes">
          {projects
            .flatMap((p) => p.workLogs.map((log) => ({ project: p, log })))
            .sort((a, b) => b.log.date.localeCompare(a.log.date))
            .slice(0, 3)
            .map(({ project: p, log }) => (
              <a
                key={p.id + log.id}
                href={routeHash({ view: "records", projectId: p.id })}
              >
                <time>{log.date}</time>
                <span>{p.name}</span>
                <strong>{log.title || log.task || "개발 기록"} ↗</strong>
              </a>
            ))}
        </div>
      </section>
    </>
  );
}
