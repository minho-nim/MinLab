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
  const navigationTarget = useRef<number | null>(null);
  const navigationTop = useRef<number | null>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const nodes = Array.from(
          container.current?.querySelectorAll<HTMLElement>("[data-scene]") ||
            [],
        );
        if (!nodes.length) return;
        const previewElement = container.current?.previousElementSibling;
        const preview = previewElement?.getBoundingClientRect();
        const previewTop = previewElement
          ? parseFloat(getComputedStyle(previewElement).top) || 0
          : 0;
        const anchor = matchMedia("(max-width:899px)").matches
          ? Math.min(
              innerHeight * 0.8,
              Math.max(
                innerHeight * 0.35,
                (preview?.height || 0) + previewTop + 24,
              ),
            )
          : innerHeight * 0.35;
        const nearest = nodes.reduce((best, node) => {
          const rect = node.getBoundingClientRect(),
            previous = best.getBoundingClientRect();
          const distance = (r: DOMRect) =>
            anchor < r.top
              ? r.top - anchor
              : anchor > r.bottom
                ? anchor - r.bottom
                : 0;
          return distance(rect) < distance(previous) ? node : best;
        }, nodes[0]);
        if (navigationTarget.current !== null) {
          if (
            navigationTop.current === null ||
            Math.abs(scrollY - navigationTop.current) > 2
          )
            return;
          const target = nodes.find(
            (node) => Number(node.dataset.scene) === navigationTarget.current,
          );
          const rect = target?.getBoundingClientRect();
          if (!rect || (rect.top <= anchor && rect.bottom >= anchor))
            navigationTarget.current = null;
          else return;
        }
        setActive(Number(nearest.dataset.scene));
      });
    };
    const release = () => {
      navigationTarget.current = null;
    };
    const keyRelease = (event: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Home",
          "End",
          " ",
        ].includes(event.key)
      )
        release();
    };
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", keyRelease);
    const observer = new ResizeObserver(update);
    if (container.current) {
      observer.observe(container.current);
      if (container.current.previousElementSibling)
        observer.observe(container.current.previousElementSibling);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", keyRelease);
    };
  }, [project.id]);
  const choose = (index: number) => {
    navigationTarget.current = index;
    navigationTop.current = null;
    setActive(index);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const node = container.current?.querySelector<HTMLElement>(
          '[data-scene="' + index + '"]',
        );
        if (!node) return;
        const previewElement = container.current?.previousElementSibling;
        const height = previewElement?.getBoundingClientRect().height || 0;
        const previewTop = previewElement
          ? parseFloat(getComputedStyle(previewElement).top) || 0
          : 0;
        const anchor = matchMedia("(max-width:899px)").matches
          ? Math.min(
              innerHeight * 0.8,
              Math.max(innerHeight * 0.35, height + previewTop + 24),
            )
          : innerHeight * 0.35;
        const top = Math.max(
          0,
          Math.min(
            document.documentElement.scrollHeight - innerHeight,
            scrollY + node.getBoundingClientRect().top - anchor + 16,
          ),
        );
        navigationTop.current = top;
        window.scrollTo({
          top,
          behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
            ? "instant"
            : "smooth",
        });
      }),
    );
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
              className={[
                active === i ? "is-active" : "",
                s.description.trim().length > 180
                  ? "scene-detailed"
                  : s.description.trim()
                    ? "scene-brief"
                    : "scene-screen",
              ].join(" ")}
            >
              <span className="eyebrow">
                {String(i + 1).padStart(2, "0")} / 주요 기능
              </span>
              <h3>{s.name}</h3>
              {s.description && <p>{s.description}</p>}
              {s.screen >= 0 && screens[s.screen].label !== s.name && (
                <small>{screens[s.screen].label}</small>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
