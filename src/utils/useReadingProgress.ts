import { useEffect, useState, type RefObject } from "react";
import { motionAllowed, motionPreferenceEvent } from "./visualMotion";

/** Native reading position drives decoration; text and scroll never wait on it. */
export function useReadingProgress(
  root: RefObject<HTMLElement | null>,
  identity: string,
) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const steps = [
      ...node.querySelectorAll<HTMLElement>("[data-reading-step]"),
    ];
    if (!steps.length) return;
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const bounds = node.getBoundingClientRect();
        const anchors = steps.map((step) => {
          const marker = step.querySelector<HTMLElement>(
            "[data-reading-anchor]",
          );
          const rect = (marker || step).getBoundingClientRect();
          return rect.top + (marker ? rect.height / 2 : 0);
        });
        const readingLine = Math.min(320, innerHeight * 0.38);
        let current = 0;
        anchors.forEach((top, index) => {
          if (top <= readingLine) current = index;
        });
        const start = anchors[0] - bounds.top;
        const distance = Math.max(1, bounds.height - start - 24);
        const moving = motionAllowed();
        const position = moving ? readingLine : anchors[current];
        const progress = Math.max(
          0,
          Math.min(1, (position - bounds.top - start) / distance),
        );
        node.style.setProperty("--reading-start", `${start}px`);
        node.style.setProperty("--reading-distance", `${distance}px`);
        node.style.setProperty("--reading-progress", String(progress));
        node.style.setProperty("--reading-offset", `${progress * distance}px`);
        node.dataset.readingMotion = moving ? "on" : "off";
        setActive(current);
      });
    };
    const size = new ResizeObserver(update);
    size.observe(node);
    steps.forEach((step) => size.observe(step));
    const reduced = matchMedia("(prefers-reduced-motion:reduce)");
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    addEventListener(motionPreferenceEvent, update);
    reduced.addEventListener("change", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      size.disconnect();
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
      removeEventListener(motionPreferenceEvent, update);
      reduced.removeEventListener("change", update);
    };
  }, [root, identity]);
  return active;
}
