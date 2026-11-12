import { useEffect, type RefObject } from "react";

export const motionPreferenceKey = "minlab_visual_motion_paused_v1";
export const motionPreferenceEvent = "minlab:visual-motion";

export function motionAllowed() {
  return (
    document.documentElement.dataset.visualMotion !== "paused" &&
    !matchMedia("(prefers-reduced-motion:reduce)").matches
  );
}

// One compositor update per pointer frame; touch keeps native scrolling/zooming.
export function useMediaMotion(
  ref: RefObject<HTMLDivElement | null>,
  ready: boolean,
) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (node.closest(".admin-dashboard,.managed-project,[role=dialog]")) return;
    const card = node.closest<HTMLElement>(".hero-project");
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      node.removeAttribute("data-media-interacting");
      card?.removeAttribute("data-card-interacting");
      card?.style.removeProperty("--card-rx");
      card?.style.removeProperty("--card-ry");
      [
        "--media-rx",
        "--media-ry",
        "--media-x",
        "--media-y",
        "--light-x",
        "--light-y",
      ].forEach((name) => node.style.removeProperty(name));
    };
    const move = (event: PointerEvent) => {
      if (
        !ready ||
        event.pointerType !== "mouse" ||
        document.hidden ||
        !motionAllowed() ||
        !matchMedia("(hover:hover) and (pointer:fine)").matches
      )
        return reset();
      const bounds = node.getBoundingClientRect();
      const x = Math.max(
        -0.5,
        Math.min(0.5, (event.clientX - bounds.left) / bounds.width - 0.5),
      );
      const y = Math.max(
        -0.5,
        Math.min(0.5, (event.clientY - bounds.top) / bounds.height - 0.5),
      );
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        node.dataset.mediaInteracting = "true";
        if (card) {
          card.dataset.cardInteracting = "true";
          card.style.setProperty("--card-rx", `${-y * 5}deg`);
          card.style.setProperty("--card-ry", `${x * 8}deg`);
        }
        node.style.setProperty("--media-rx", `${-y * 8}deg`);
        node.style.setProperty("--media-ry", `${x * 12}deg`);
        node.style.setProperty("--media-x", `${x * 12}px`);
        node.style.setProperty("--media-y", `${y * 10}px`);
        node.style.setProperty("--light-x", `${(x + 0.5) * 100}%`);
        node.style.setProperty("--light-y", `${(y + 0.5) * 100}%`);
      });
    };
    const visible =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            const shown = entries.some((entry) => entry.isIntersecting);
            node.dataset.mediaVisible = String(shown);
            if (!shown) reset();
          });
    if (visible) visible.observe(node);
    else node.dataset.mediaVisible = "true";
    const reduced = matchMedia("(prefers-reduced-motion:reduce)");
    node.addEventListener("pointermove", move, { passive: true });
    node.addEventListener("pointerleave", reset);
    window.addEventListener(motionPreferenceEvent, reset);
    document.addEventListener("visibilitychange", reset);
    reduced.addEventListener("change", reset);
    return () => {
      reset();
      visible?.disconnect();
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", reset);
      window.removeEventListener(motionPreferenceEvent, reset);
      document.removeEventListener("visibilitychange", reset);
      reduced.removeEventListener("change", reset);
    };
  }, [ref, ready]);
}
