import type { Project } from "../types";
export interface ArchiveQuery {
  q: string;
  category: string;
  status: string;
  tag: string;
  sort: string;
  layout: string;
}
export const defaultQuery: ArchiveQuery = {
  q: "",
  category: "",
  status: "",
  tag: "",
  sort: "manual",
  layout: "grid",
};
export function readArchiveQuery(hash: string): ArchiveQuery {
  const params = new URLSearchParams(hash.split("?")[1]);
  return {
    q: params.get("q") || "",
    category: params.get("category") || "",
    status: params.get("status") || "",
    tag: params.get("tag") || "",
    sort: ["latest", "name"].includes(params.get("sort") || "")
      ? params.get("sort")!
      : "manual",
    layout: params.get("layout") === "list" ? "list" : "grid",
  };
}
export function archiveHash(query: ArchiveQuery) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value && value !== defaultQuery[key as keyof ArchiveQuery])
      params.set(key, value);
  return "#/" + (params.size ? "?" + params : "");
}
export function queryProjects(projects: Project[], query: ArchiveQuery) {
  const needle = query.q.trim().toLocaleLowerCase();
  const result = projects.filter(
    (p) =>
      (!query.category || p.category === query.category) &&
      (!query.status || p.status === query.status) &&
      (!query.tag || p.techStack.includes(query.tag)) &&
      (!needle ||
        [p.name, p.englishName, p.description, p.category, ...p.techStack]
          .join(" ")
          .toLocaleLowerCase()
          .includes(needle)),
  );
  if (query.sort === "name")
    result.sort((a, b) => a.name.localeCompare(b.name, "ko"));
  if (query.sort === "latest")
    result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return result;
}
export function safeRead(key: string, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}
export function safeWrite(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Preferences are optional; project saves report errors separately. */
  }
}
export function lastArchive() {
  try {
    const hash = sessionStorage.getItem("minlab_last_archive");
    return hash?.startsWith("#/?") || hash === "#/" ? hash : "#/";
  } catch {
    return "#/";
  }
}
