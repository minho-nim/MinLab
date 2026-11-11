import type { Project } from "../types";
export const draftKey = "minlab_content_draft_v2";
// Legacy imports fill absent optional text fields with empty strings. Treat these
// as the same content in review without modifying either stored record.
function comparable(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item === "" ? undefined : item,
  );
}
export function contentChanges(before: Project[], after: Project[]) {
  return {
    added: after.filter((p) => !before.some((b) => b.id === p.id)),
    removed: before.filter((p) => !after.some((a) => a.id === p.id)),
    changed: after.filter((p) => {
      const old = before.find((b) => b.id === p.id);
      return old && comparable(old) !== comparable(p);
    }),
    reordered:
      before.map((p) => p.id).join("|") !== after.map((p) => p.id).join("|"),
  };
}
export function storeDraft(projects: Project[]) {
  try {
    localStorage.setItem(draftKey, JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}
