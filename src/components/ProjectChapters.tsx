import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export const projectChapters = [
  { id: "project-overview", label: "개요" },
  { id: "project-showcase", label: "기능" },
  { id: "project-problem", label: "문제 해결" },
  { id: "project-development", label: "개발 기록" },
  { id: "project-result", label: "결과" },
] as const;

export function ProjectChapters() {
  const [active, setActive] = useState<string>(projectChapters[0].id);
  const [wide, setWide] = useState(
    () => matchMedia("(min-width:1200px)").matches,
  );
  const [expanded, setExpanded] = useState(false);
  const menu = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const media = matchMedia("(min-width:1200px)");
    const resize = () => {
      setWide(media.matches);
      setExpanded(false);
      if (!media.matches && menu.current?.contains(document.activeElement))
        toggle.current?.focus({ preventScroll: true });
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, []);

  useEffect(() => {
    let frame = 0;
    const root = menu.current?.closest<HTMLElement>(".project-story");
    if (!root) return;
    const nodes = projectChapters.map((item) =>
      root.querySelector<HTMLElement>("#" + item.id),
    );
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const anchor =
          (parseFloat(
            getComputedStyle(root).getPropertyValue("--project-reading-top"),
          ) || 120) + 8;
        // Last section to pass the reading line wins, even across section gaps.
        let current: string = projectChapters[0].id;
        nodes.forEach((node, index) => {
          if (node && node.getBoundingClientRect().top <= anchor)
            current = projectChapters[index].id;
        });
        setActive(current);
      });
    };
    const observer = new ResizeObserver(update);
    nodes.forEach((node) => {
      if (node) observer.observe(node);
    });
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!menu.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [expanded]);

  const select = (id: string) => {
    const node = document.getElementById(id);
    if (!node) return;
    const records = node.querySelector<HTMLDetailsElement>(
      ".project-records-disclosure",
    );
    if (records) records.open = true;
    setExpanded(false);
    const heading = node.querySelector<HTMLElement>("h1,h2") || node;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    node.scrollIntoView({
      block: "start",
      behavior: matchMedia("(prefers-reduced-motion:reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const current =
    projectChapters.find((item) => item.id === active) || projectChapters[0];
  return (
    <aside
      className="project-chapters"
      ref={menu}
      aria-label="프로젝트 챕터 탐색"
      onKeyDown={(event) => {
        if (event.key === "Escape" && expanded) {
          event.preventDefault();
          event.stopPropagation();
          setExpanded(false);
          toggle.current?.focus({ preventScroll: true });
        }
      }}
    >
      <p className="chapter-caption">이 프로젝트</p>
      <button
        type="button"
        className="chapter-toggle"
        ref={toggle}
        aria-expanded={expanded}
        aria-controls="project-chapter-list"
        onClick={() => setExpanded((value) => !value)}
      >
        <span>목차</span>
        <strong>{current.label}</strong>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      <nav
        id="project-chapter-list"
        className="chapter-list"
        aria-label="프로젝트 목차"
        hidden={!wide && !expanded}
      >
        {projectChapters.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-controls={item.id}
            aria-current={active === item.id ? "location" : undefined}
            onClick={() => select(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
