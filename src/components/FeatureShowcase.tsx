import { useEffect, useRef, useState } from "react";
import type { Project } from "../types";
import { mediaFor, ProjectMedia } from "./ProjectMedia";

export function FeatureShowcase({ project }: { project: Project }) {
  const screens = mediaFor(project);
  const features = project.keyFeatures.map((f, i) =>
    typeof f === "string"
      ? { id: "feature-" + i, name: f, description: "" }
      : f,
  );
  const featureScenes = features.map((f) => ({
    id: f.id,
    name: f.name,
    description: f.description || "",
    screen: screens.findIndex(
      (s) => s.featureId === f.id || s.label === f.name,
    ),
  }));
  const scenes = [
    ...screens
      .filter(
        (s) => !featureScenes.some((f) => f.screen === screens.indexOf(s)),
      )
      .map((s) => ({
        id: s.id,
        name: s.label,
        description: "",
        screen: screens.indexOf(s),
      })),
    ...featureScenes,
  ];
  const [active, setActive] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const nodes = Array.from(
      container.current?.querySelectorAll<HTMLElement>("[data-scene]") || [],
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top - innerHeight * 0.35) -
              Math.abs(b.boundingClientRect.top - innerHeight * 0.35),
          )[0];
        if (current)
          setActive(Number((current.target as HTMLElement).dataset.scene));
      },
      { rootMargin: "-20% 0px -45% 0px", threshold: 0 },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [project.id]);
  const choose = (index: number) => {
    setActive(index);
    container.current
      ?.querySelector<HTMLElement>('[data-scene="' + index + '"]')
      ?.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  if (!scenes.length)
    return (
      <section className="showcase-empty">
        <h2>프로젝트 화면</h2>
        <p>등록된 화면과 기능 설명이 없습니다.</p>
      </section>
    );
  const scene = scenes[active] || scenes[0];
  return (
    <section className="feature-showcase" aria-label="기능 쇼케이스">
      <header className="section-heading">
        <div>
          <p className="eyebrow">기능 쇼케이스</p>
          <h2>화면으로 살펴보세요.</h2>
        </div>
        <span>
          {String(active + 1).padStart(2, "0")} /{" "}
          {String(scenes.length).padStart(2, "0")}
        </span>
      </header>
      <nav className="scene-tabs" aria-label="기능 직접 선택">
        {scenes.map((s, i) => (
          <button
            key={s.id}
            aria-pressed={i === active}
            onClick={() => choose(i)}
          >
            {s.name}
          </button>
        ))}
      </nav>
      <div className="feature-showcase-layout">
        <div className="browser-showcase">
          <div className="window-bar">
            <span aria-hidden="true">● ● ●</span>
            <span>{project.name} · 화면 미리보기</span>
          </div>
          {scene.screen >= 0 ? (
            <ProjectMedia project={project} index={scene.screen} />
          ) : (
            <div className="scene-no-image">
              <strong>{scene.name}</strong>
              <p>이 기능에 연결된 화면은 아직 등록되지 않았습니다.</p>
            </div>
          )}
          <div className="scene-controls">
            <button disabled={active === 0} onClick={() => choose(active - 1)}>
              ← 이전 기능
            </button>
            <span>{scene.name}</span>
            <button
              disabled={active === scenes.length - 1}
              onClick={() => choose(active + 1)}
            >
              다음 기능 →
            </button>
          </div>
        </div>
        <div className="scene-stories" ref={container}>
          {scenes.map((s, i) => (
            <article
              key={s.id}
              data-scene={i}
              className={active === i ? "is-active" : ""}
            >
              <span className="eyebrow">
                {String(i + 1).padStart(2, "0")} / 주요 기능
              </span>
              <h3>{s.name}</h3>
              {s.description && <p>{s.description}</p>}
              {s.screen >= 0 && <small>{screens[s.screen].label}</small>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
