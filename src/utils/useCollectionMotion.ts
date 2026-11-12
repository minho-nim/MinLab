import { useEffect, useLayoutEffect, useRef } from "react";
import { motionAllowed, motionPreferenceEvent } from "./visualMotion";

// Read the current visual positions before changing data; animate only the
// visible result. DOM order, focus, links and search updates remain immediate.
export function useCollectionMotion(version: unknown) {
  const root = useRef<HTMLDivElement>(null);
  const before = useRef<Map<string, DOMRect> | null>(null);
  const animations = useRef(new Set<Animation>());
  const stop = () => {
    animations.current.forEach((animation) => animation.cancel());
    animations.current.clear();
    root.current?.removeAttribute("data-collection-moving");
  };
  const capture = (enabled = true) => {
    before.current =
      enabled &&
      motionAllowed() &&
      typeof Element.prototype.animate === "function"
        ? new Map(
            Array.from(
              root.current?.querySelectorAll<HTMLElement>(
                "[data-collection-key]",
              ) || [],
              (node) => [
                node.dataset.collectionKey!,
                node.getBoundingClientRect(),
              ],
            ),
          )
        : null;
    // Read first, then cancel: repeated actions continue from what's visible.
    stop();
  };
  useLayoutEffect(() => {
    const positions = before.current;
    before.current = null;
    if (!positions || !root.current || !motionAllowed()) return;
    for (const node of root.current.querySelectorAll<HTMLElement>(
      "[data-collection-key]",
    )) {
      const target = node.getBoundingClientRect();
      if (target.bottom < -80 || target.top > innerHeight + 80) continue;
      const source = positions.get(node.dataset.collectionKey!);
      let x = source ? source.left - target.left : 0;
      let y = source ? source.top - target.top : 0;
      const resized =
        !!source &&
        (Math.abs(source.width - target.width) > 1 ||
          Math.abs(source.height - target.height) > 1);
      if (source && Math.abs(x) < 1 && Math.abs(y) < 1 && !resized) continue;
      // A far-away card should arrive here, not fly across the entire archive.
      if (Math.abs(y) > innerHeight || Math.abs(x) > innerWidth) {
        x = 0;
        y = 16;
      }
      const animation = node.animate(
        [
          {
            transform: `translate3d(${x}px,${y}px,0)`,
            opacity: source && !resized ? 1 : 0.3,
          },
          { transform: "none", opacity: 1 },
        ],
        {
          duration: Math.min(420, 230 + Math.hypot(x, y) * 0.12),
          easing: "cubic-bezier(.16,1,.3,1)",
        },
      );
      animations.current.add(animation);
      root.current.dataset.collectionMoving = "true";
      const finish = () => {
        animations.current.delete(animation);
        if (!animations.current.size)
          root.current?.removeAttribute("data-collection-moving");
      };
      animation.onfinish = finish;
      animation.oncancel = finish;
    }
  }, [version]);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion:reduce)");
    const cancel = () => {
      before.current = null;
      stop();
    };
    window.addEventListener(motionPreferenceEvent, cancel);
    window.addEventListener("resize", cancel);
    document.addEventListener("visibilitychange", cancel);
    reduced.addEventListener("change", cancel);
    return () => {
      cancel();
      window.removeEventListener(motionPreferenceEvent, cancel);
      window.removeEventListener("resize", cancel);
      document.removeEventListener("visibilitychange", cancel);
      reduced.removeEventListener("change", cancel);
    };
  }, []);
  return { root, capture };
}
