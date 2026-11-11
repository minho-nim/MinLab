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
  const count = projects.length;
  const STEP = 200; // Native scroll distance per project; no wheel interception or scroll lock.
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
            <p className="eyebrow">프로젝트 탐색</p>
            <h2>
              프로젝트를 고르면,
              <br />
              <em>이 자리에서 살펴봅니다.</em>
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
          <span>스크롤로 다음 프로젝트 · 모바일에서는 좌우로 넘기기</span>
          <a
            className="text-link"
            href="#development-process"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("development-process")
                ?.scrollIntoView({
                  behavior: matchMedia("(prefers-reduced-motion:reduce)")
                    .matches
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
  const images = projects.filter((p) => mediaFor(p).length).slice(0, 3);
  const [chosen, setChosen] = useState("");
  const main = images.find((p) => p.id === chosen) || images[0];
  const featured = [
    ...images,
    ...projects.filter((p) => !images.some((i) => i.id === p.id)),
  ].slice(0, 6);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        hero.current?.style.setProperty(
          "--hero-progress",
          String(Math.min(1, scrollY / 650)),
        ),
      );
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
    };
  }, []);
  return (
    <>
      <section className="home-hero" ref={hero}>
        <div className="hero-layout">
          <div className="hero-copy">
            <p className="eyebrow">MinLab · 프로젝트와 개발 기록</p>
            <h1>
              <span>아이디어를 현실로,</span>
              <span>경험을 결과물로.</span>
            </h1>
            <p className="hero-description">
              직접 기획하고 만든 웹앱과 게임.
              <br />
              작동하는 결과와 그 안의 고민을 함께 기록합니다.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#/">
                프로젝트 둘러보기 <ArrowUpRight size={17} />
              </a>
              <a className="text-link" href="#/development-log">
                개발 과정 읽어보기 ↗
              </a>
            </div>
          </div>
          <div
            className="hero-showcase"
            onPointerMove={(e) => {
              if (
                e.pointerType === "mouse" &&
                !matchMedia("(prefers-reduced-motion:reduce)").matches
              ) {
                const r = e.currentTarget.getBoundingClientRect();
                e.currentTarget.style.setProperty(
                  "--pointer-x",
                  `${((e.clientX - r.left) / r.width - 0.5) * 4}px`,
                );
                e.currentTarget.style.setProperty(
                  "--pointer-y",
                  `${((e.clientY - r.top) / r.height - 0.5) * 4}px`,
                );
              }
            }}
            onPointerLeave={(e) => {
              e.currentTarget.style.setProperty("--pointer-x", "0px");
              e.currentTarget.style.setProperty("--pointer-y", "0px");
            }}
          >
            {main ? (
              <>
                <a
                  className="hero-main-image"
                  href={routeHash({ view: "project", projectId: main.id })}
                  aria-label={main.name + " 프로젝트 살펴보기"}
                >
                  <ProjectMedia key={main.id} project={main} eager />
                </a>
                <div className="hero-image-caption">
                  <div>
                    <strong>{main.name}</strong>
                    <p>{main.description}</p>
                  </div>
                  <ArrowUpRight size={20} />
                </div>
                <div
                  className="hero-image-tabs"
                  aria-label="첫 화면 프로젝트 선택"
                >
                  {images.map((p) => (
                    <button
                      key={p.id}
                      aria-pressed={p.id === main.id}
                      onClick={() => setChosen(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="hero-text-index">
                <h2>{projects.length}개의 프로젝트</h2>
                <p>기획부터 제작과 개선까지, 실제 개발 기록을 살펴보세요.</p>
                <a className="text-link" href="#/">
                  전체 프로젝트 보기 ↗
                </a>
              </div>
            )}
          </div>
        </div>
        <div className="hero-foot">
          <p>현재 {projects.length}개의 프로젝트를 기록하고 있습니다.</p>
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
            프로젝트 탐색 <ArrowDown size={15} />
          </a>
        </div>
      </section>
      <section className="home-selected">
        <div className="section-heading">
          <div>
            <p className="eyebrow">직접 만든 서비스</p>
            <h2>작업한 프로젝트</h2>
          </div>
          <a className="text-link" href="#/">
            전체 프로젝트 보기 ↗
          </a>
        </div>
        <div className="home-project-grid">
          {featured.slice(0, 3).map((p) => (
            <a
              key={p.id}
              href={routeHash({ view: "project", projectId: p.id })}
            >
              <ProjectMedia project={p} />
              <div>
                <p className="eyebrow">{p.category}</p>
                <h3>
                  {p.name}
                  <ArrowUpRight size={18} />
                </h3>
                <p>{p.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
      <FeaturedExplorer projects={featured} />
      <section id="development-process" className="home-process">
        <div>
          <p className="eyebrow">개발 과정</p>
          <h2>
            문제를 정의하고,
            <br />
            만들어 보고, 개선합니다.
          </h2>
          <p>무엇을 만들었는지, 왜 바꿨는지. 실제 기록에서 확인하세요.</p>
          <a href="#/development-log" className="text-link">
            개발일지 읽어보기 ↗
          </a>
        </div>
        <ol>
          {["문제 정의", "구현과 확인", "기록과 개선"].map((text, i) => (
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
