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
export function FeaturedExplorer({ projects }: { projects: Project[] }) {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const touchX = useRef(0);
  const count = projects.length;
  const STEP = 520; // Native scroll distance per project; no wheel interception or scroll lock.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!section.current || !matchMedia("(min-width: 900px)").matches)
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
    if (!matchMedia("(max-width:639px)").matches) return;
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
    if (section.current && matchMedia("(min-width: 900px)").matches)
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
            <p className="eyebrow">01 / SELECTED WORK</p>
            <h2>
              탐색하고,
              <br />
              <em>발견하는 프로젝트.</em>
            </h2>
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
            className="explorer-preview"
            onTouchStart={(e) => {
              touchX.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const delta = touchX.current - e.changedTouches[0].clientX;
              if (Math.abs(delta) > 60) select(index + (delta > 0 ? 1 : -1));
            }}
          >
            <a
              href={routeHash({ view: "project", projectId: project.id })}
              className="showcase-image"
              aria-label={project.name + " 상세 보기"}
            >
              <ProjectMedia key={project.id} project={project} />
            </a>
            <div className="preview-copy" key={project.id}>
              <p className="eyebrow">
                {project.category} / {project.status}
              </p>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <div className="preview-bottom">
                <a
                  className="primary-link"
                  href={routeHash({ view: "project", projectId: project.id })}
                >
                  프로젝트 살펴보기 <ArrowUpRight size={16} />
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
          <span>SCROLL TO DISCOVER · 모바일에서는 좌우로 스와이프</span>
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
  const images = projects.filter((p) => mediaFor(p).length).slice(0, 3);
  const featured = [
    ...images,
    ...projects.filter((p) => !images.some((x) => x.id === p.id)),
  ].slice(0, 6);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (hero.current)
          hero.current.style.setProperty(
            "--hero-progress",
            String(Math.min(1, window.scrollY / 800)),
          );
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", update);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <>
      <section
        className="home-hero"
        ref={hero}
        onPointerMove={(e) => {
          if (
            e.pointerType !== "mouse" ||
            matchMedia("(prefers-reduced-motion: reduce)").matches
          )
            return;
          const rect = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty(
            "--pointer-x",
            `${((e.clientX - rect.left) / rect.width - 0.5) * 12}px`,
          );
          e.currentTarget.style.setProperty(
            "--pointer-y",
            `${((e.clientY - rect.top) / rect.height - 0.5) * 10}px`,
          );
        }}
        onPointerLeave={(e) => {
          e.currentTarget.style.setProperty("--pointer-x", "0px");
          e.currentTarget.style.setProperty("--pointer-y", "0px");
        }}
      >
        <div className="hero-meta">
          <span className="eyebrow">MINLAB / INDEPENDENT PROJECT ARCHIVE</span>
          <span className="eyebrow">IDEAS → EXPERIENCES → PRODUCTS</span>
        </div>
        <div className="hero-layout">
          <div className="hero-copy">
            <h1>
              <span>MAKE</span>
              <span>
                <em>IT</em> REAL.
              </span>
            </h1>
            <p className="hero-korean">
              아이디어를 현실로,
              <br />
              경험을 결과물로.
            </p>
            <p className="hero-description">
              직접 기획하고 만들며 쌓아가는 실험.
              <br />
              완성된 결과와 그 사이의 과정을 기록합니다.
            </p>
            <a className="primary-link" href="#/">
              프로젝트 탐색하기 <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="floating-showcase" aria-label="실제 프로젝트 화면">
            {images.map((p, i) => (
              <a
                key={p.id}
                className={"floating-window floating-" + i}
                href={routeHash({ view: "project", projectId: p.id })}
              >
                <div className="window-bar">
                  <span className="window-dots">● ● ●</span>
                  <span>{p.name}</span>
                  <ArrowUpRight size={12} />
                </div>
                <ProjectMedia project={p} eager />
                <div className="floating-caption">
                  <strong>{p.name}</strong>
                  <span>{p.category} ↗</span>
                </div>
              </a>
            ))}
            {!images.length && (
              <div className="hero-number">
                <span className="eyebrow">AN INDEX OF IDEAS</span>
                <strong>01 — {projects.length}</strong>
                <p>기획 · 제작 · 개선의 기록</p>
              </div>
            )}
          </div>
        </div>
        <div className="hero-foot">
          <span>
            {String(projects.length).padStart(2, "0")} PROJECTS / ALWAYS IN
            PROGRESS
          </span>
          <a
            href="#selected-work"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("selected-work")
                ?.scrollIntoView({
                  behavior: matchMedia("(prefers-reduced-motion: reduce)")
                    .matches
                    ? "instant"
                    : "smooth",
                });
            }}
          >
            SCROLL TO EXPLORE <ArrowDown size={14} />
          </a>
        </div>
      </section>
      <FeaturedExplorer projects={featured} />
      <section className="home-process">
        <p className="eyebrow">02 / THE PROCESS</p>
        <div>
          <h2>
            결과만큼,
            <br />
            <em>과정도 남깁니다.</em>
          </h2>
          <p>
            무엇을 만들었는지, 왜 바꿨는지.
            <br />
            실제 개발일지와 작업 프롬프트에서 확인하세요.
          </p>
          <a href="#/development-log" className="text-link">
            개발 과정 읽어보기 <ArrowUpRight size={18} />
          </a>
        </div>
        <ol>
          {[
            "문제를 정의합니다.",
            "작게 만들고 확인합니다.",
            "기록하고 개선합니다.",
          ].map((text, i) => (
            <li key={text}>
              <span>0{i + 1}</span>
              {text}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
