import { useEffect, type RefObject } from "react";

// The first real screen travels into the explorer. Native scroll stays in control.
export function useHeroHandoff(hero: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = hero.current;
    if (!root) return;
    const desktop = matchMedia(
      "(min-width:900px) and (min-height:571px) and (prefers-reduced-motion:no-preference)",
    );
    let frame = 0;
    let overlay: HTMLDivElement | null = null;
    let sources: HTMLElement[] = [];
    let destination: HTMLElement | null = null;
    const reset = () => {
      overlay?.remove();
      overlay = null;
      sources.forEach((node) => node.style.removeProperty("visibility"));
      sources.forEach((node) =>
        node
          .closest<HTMLElement>(".hero-project")
          ?.style.removeProperty("visibility"),
      );
      destination?.style.removeProperty("visibility");
      root.removeAttribute("data-handoff");
    };
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!desktop.matches) return reset();
        sources = [
          ...root.querySelectorAll<HTMLElement>(".hero-project .project-media"),
        ];
        destination = document.querySelector<HTMLElement>(
          "#selected-work .showcase-image .project-media",
        );
        const explorer = document.getElementById("selected-work");
        if (
          !sources.length ||
          !destination ||
          !explorer ||
          sources[0].dataset.projectMedia !== destination.dataset.projectMedia
        )
          return reset();
        const end = explorer.getBoundingClientRect().top + scrollY - 90;
        const start = Math.max(0, end - innerHeight * 0.8);
        const progress = Math.max(
          0,
          Math.min(1, (scrollY - start) / Math.max(1, end - start)),
        );
        root.style.setProperty("--handoff-progress", String(progress));
        if (progress <= 0 || progress >= 1) return reset();
        if (!overlay) {
          overlay = document.createElement("div");
          overlay.className = "hero-handoff";
          overlay.setAttribute("aria-hidden", "true");
          sources.forEach((source) => {
            const clone = source.cloneNode(true) as HTMLElement;
            clone.removeAttribute("data-project-media");
            clone
              .querySelectorAll("img")
              .forEach((img) => (img.loading = "eager"));
            overlay!.append(clone);
          });
          document.body.append(overlay);
        }
        const target = destination.getBoundingClientRect();
        const bounds = sources.map((node) => node.getBoundingClientRect());
        root.setAttribute("data-handoff", "active");
        destination.style.visibility = "hidden";
        sources.forEach((node, i) => {
          const rect = bounds[i];
          const clone = overlay!.children[i] as HTMLElement;
          const mix = (a: number, b: number) => a + (b - a) * progress;
          Object.assign(clone.style, {
            left: `${mix(rect.left, target.left)}px`,
            top: `${mix(rect.top, target.top + i * 6)}px`,
            width: `${mix(rect.width, target.width)}px`,
            height: `${mix(rect.height, target.height)}px`,
            opacity: String(i ? Math.max(0, 1 - progress * 2) : 1),
            zIndex: String(sources.length - i),
          });
          node.style.visibility = "hidden";
          node.closest<HTMLElement>(".hero-project")!.style.visibility =
            "hidden";
        });
      });
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    desktop.addEventListener("change", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      reset();
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
      desktop.removeEventListener("change", update);
    };
  }, [hero]);
}
