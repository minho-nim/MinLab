const originKey = "minlab_archive_origin_v1";
interface ArchiveOrigin {
  hash: string;
  projectId: string;
}
let memory: ArchiveOrigin | null = null;
let cue: HTMLAnchorElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const archiveHash = (hash: string) => hash === "#/" || hash.startsWith("#/?");

export function rememberArchiveOrigin(hash: string, projectId: string) {
  if (!archiveHash(hash) || !projectId) return;
  memory = { hash, projectId };
  try {
    sessionStorage.setItem(originKey, JSON.stringify(memory));
  } catch {
    /* The current tab can still retain its navigation context. */
  }
}

export function archiveReturnProject(hash: string): string | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(originKey) || "null");
    if (
      value &&
      typeof value.hash === "string" &&
      archiveHash(value.hash) &&
      typeof value.projectId === "string"
    )
      memory = value;
  } catch {
    /* Use the in-memory context when storage is unavailable. */
  }
  return memory?.hash === hash ? memory.projectId : null;
}

export function forgetArchiveOrigin() {
  memory = null;
  try {
    sessionStorage.removeItem(originKey);
  } catch {
    /* Optional context. */
  }
}

export function clearArchiveReturnCue() {
  clearTimeout(timer);
  cue?.removeAttribute("data-archive-return");
  cue?.removeEventListener("blur", clearArchiveReturnCue);
  cue = null;
  timer = undefined;
}

export function showArchiveReturnCue(projectId: string) {
  clearArchiveReturnCue();
  // Compare values instead of interpolating a saved project ID into a selector.
  const target = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(
      "a.archive-project[data-collection-key]",
    ),
  ).find((node) => node.dataset.collectionKey === projectId);
  if (!target) return;
  cue = target;
  target.dataset.archiveReturn = "true";
  const active = document.activeElement;
  // Keep a search field or another control the visitor has already chosen.
  if (
    !active ||
    active === document.body ||
    active === document.documentElement ||
    active === target
  )
    target.focus({ preventScroll: true });
  target.addEventListener("blur", clearArchiveReturnCue, { once: true });
  timer = setTimeout(clearArchiveReturnCue, 1800);
}
