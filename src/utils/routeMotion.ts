import { motionAllowed } from "./visualMotion";
type Transition = {
  finished: Promise<void>;
  ready: Promise<void>;
  skipTransition(): void;
};
type MotionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => Transition;
};

// Capture the clicked real preview, including text links inside the same card.
// No click interception: hash history, new tabs and back/forward stay native.
export function routeMotion() {
  let source: HTMLElement | null = null;
  let nextProject = false;
  let transition: Transition | undefined;
  let named: HTMLElement[] = [];
  let generation = 0;
  const clear = () => {
    named.forEach((node) => node.style.removeProperty("view-transition-name"));
    named = [];
  };
  const capture = (event: MouseEvent) => {
    source = null;
    nextProject = false;
    if (
      event.button ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const link = (event.target as Element).closest<HTMLAnchorElement>(
      "a[href]",
    );
    if (
      !link ||
      link.target === "_blank" ||
      !link.hash.startsWith("#/projects/")
    )
      return;
    nextProject = link.classList.contains("next-project");
    source =
      link.querySelector<HTMLElement>("[data-project-media]") ||
      link
        .closest(".explorer-preview,.archive-card,article")
        ?.querySelector<HTMLElement>("[data-project-media]") ||
      null;
  };
  document.addEventListener("click", capture, true);
  return {
    async run(update: () => Promise<void>, projectId?: string) {
      const version = ++generation;
      transition?.skipTransition();
      clear();
      const doc = document as MotionDocument;
      const allowed =
        !!doc.startViewTransition &&
        motionAllowed();
      const outgoing = source;
      const isNext = nextProject;
      source = null;
      nextProject = false;
      if (!allowed) return update();
      document.documentElement.dataset.routeMotion = isNext
        ? "next-project"
        : "page";
      if (outgoing?.isConnected && outgoing.getBoundingClientRect().height) {
        outgoing.style.viewTransitionName = "project-preview";
        named.push(outgoing);
      }
      transition = doc.startViewTransition!(async () => {
        if (version !== generation) {
          await update();
          return;
        }
        clear();
        await update();
        if (version !== generation) return;
        if (projectId && outgoing) {
          const incoming = [
            ...document.querySelectorAll<HTMLElement>(
              ".project-story .browser-showcase [data-project-media]",
            ),
          ].find((node) => node.dataset.projectMedia === projectId);
          if (incoming) {
            incoming.style.viewTransitionName = "project-preview";
            named.push(incoming);
          }
        }
      });
      const current = transition;
      void current.ready.catch(() => {});
      try {
        await current.finished;
      } catch {
        /* Native navigation already completed. */
      }
      if (transition === current) {
        clear();
        transition = undefined;
        delete document.documentElement.dataset.routeMotion;
      }
    },
    dispose() {
      generation++;
      document.removeEventListener("click", capture, true);
      transition?.skipTransition();
      clear();
      delete document.documentElement.dataset.routeMotion;
    },
  };
}
