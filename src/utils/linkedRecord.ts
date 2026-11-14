// Called after the route has rendered and restored its ordinary scroll position.
export function revealLinkedRecord(logId: string) {
  const scope = matchMedia("(min-width:900px)").matches
    ? ".journey-desktop"
    : ".journey-mobile";
  const target = [
    ...document.querySelectorAll<HTMLElement>(
      ".project-story " + scope + " [data-log]",
    ),
  ].find((node) => node.dataset.log === logId);
  const node = target || document.getElementById("project-development");
  if (!node) return;
  const records = node.closest<HTMLDetailsElement>(
    ".project-records-disclosure",
  );
  if (records) records.open = true;
  if (target instanceof HTMLDetailsElement) target.open = true;
  target
    ?.querySelectorAll<HTMLDetailsElement>(".log-original")
    .forEach((details) => (details.open = true));
  const heading = node.querySelector<HTMLElement>("h2,h3") || node;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  node.scrollIntoView({ block: "start", behavior: "instant" });
}
