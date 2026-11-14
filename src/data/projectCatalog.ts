import config from "../../archive.config.json";
import type { Project } from "../types";

const CATALOG_LEDGER_KEY = "minlab_catalog_seen_project_ids_v1";
// v6 was already imported before Crossroads was registered. Missing entries
// from that catalog may have been deliberately deleted; do not restore them.
const LEGACY_V6_IDS = [
  "proj-1792485558773",
  "proj-1792563333333",
  "proj-1792558759961",
  "risk-assessment-workplan-automation",
  "proj-1792978415000",
  "proj-excuseoffice",
  "proj-minially",
];

export function catalogProjects(): Project[] {
  return config.projects.map((item) => ({
    id: item.id,
    name: item.name,
    englishName: item.name,
    description: item.description,
    category: item.category,
    status: "개발 중",
    techStack: item.techStack,
    liveUrl: item.appUrl,
    previewUrl: item.appUrl,
    githubUrl: item.repository ? "https://github.com/" + item.repository : "",
    keyFeatures: [],
    workLogs: [],
    changelog: [],
    promptHistory: [],
    isSample: false,
    archived: false,
    createdAt: "2026-10-23T00:00:00.000Z",
    updatedAt: "2026-10-23T00:00:00.000Z",
  }));
}

export function connectCatalogOnce(
  projects: Project[],
  storage: Pick<Storage, "getItem" | "setItem">,
  key: string,
): Project[] {
  const versionKey = "minlab_public_catalog_v" + config.version;
  let seen = new Set<string>();
  try {
    if (storage.getItem("minlab_public_catalog_v6")) {
      seen = new Set(LEGACY_V6_IDS);
      // A project that already received published records was connected before,
      // even if it has since been removed from the user's project array.
      const publishedRaw = storage.getItem("minlab_published_records_v1");
      if (publishedRaw) {
        const published = JSON.parse(publishedRaw);
        if (Array.isArray(published?.drafts))
          for (const entry of published.drafts) {
            if (typeof entry?.projectId === "string") seen.add(entry.projectId);
          }
      }
    }
    const raw = storage.getItem(CATALOG_LEDGER_KEY);
    if (raw) {
      const ids: unknown = JSON.parse(raw);
      if (Array.isArray(ids) && ids.every((id) => typeof id === "string"))
        seen = new Set(ids);
    }
  } catch {
    /* A broken or unavailable ledger must not hide a new project. */
  }
  // Refresh the previous public name even for an already-seen catalog entry.
  // Custom titles and all browser records remain user-owned.
  const renamed = catalogProjects().find(
    (project) => project.id === "proj-snake-race",
  );
  let merged = projects;
  if (renamed)
    merged = projects.map((project) => {
      if (project.id !== renamed.id) return project;
      const updated = { ...project };
      if (project.name === "꼬물 레이스") {
        updated.name = renamed.name;
        if (!project.englishName || project.englishName === "꼬물 레이스")
          updated.englishName = renamed.name;
      }
      const old = {
        githubUrl: "https://github.com/minho-nim/snake-race",
        liveUrl: "https://minho-nim.github.io/snake-race",
        previewUrl: "https://minho-nim.github.io/snake-race",
      };
      for (const key of ["githubUrl", "liveUrl", "previewUrl"] as const) {
        const replacement = renamed[key];
        if (
          typeof replacement === "string" &&
          project[key]?.replace(/\/$/, "") === old[key]
        )
          updated[key] = replacement;
      }
      return updated.name === project.name &&
        updated.englishName === project.englishName &&
        updated.githubUrl === project.githubUrl &&
        updated.liveUrl === project.liveUrl &&
        updated.previewUrl === project.previewUrl
        ? project
        : updated;
    });
  if (merged.every((project, index) => project === projects[index]))
    merged = projects;
  // Crossroads became MINOVA; keep its ID and local records across the rename.
  const minova = catalogProjects().find(
    (project) => project.id === "proj-crossroads-ai-verdict",
  );
  if (minova)
    merged = merged.map((project) => {
      if (project.id !== minova.id) return project;
      const updated = { ...project };
      const oldNames = ["Crossroads: AI Verdict", "Crossroads", "MINOVA"];
      if (oldNames.includes(project.name)) updated.name = minova.name;
      if (!project.englishName || oldNames.includes(project.englishName))
        updated.englishName = minova.name;
      for (const key of ["githubUrl", "liveUrl", "previewUrl"] as const) {
        const old =
          key === "githubUrl"
            ? ["https://github.com/minho-nim/crossroads-ai-verdict"]
            : [
                "https://minho-nim.github.io/MinLab/apps/crossroads",
                "https://minho-nim.github.io/crossroads-ai-verdict",
              ];
        const replacement = minova[key];
        if (
          typeof replacement === "string" &&
          old.includes(project[key]?.replace(/\/$/, "") || "")
        )
          updated[key] = replacement;
      }
      return updated.name === project.name &&
        updated.englishName === project.englishName &&
        updated.githubUrl === project.githubUrl &&
        updated.liveUrl === project.liveUrl &&
        updated.previewUrl === project.previewUrl
        ? project
        : updated;
    });
  if (merged.every((project, index) => project === projects[index]))
    merged = projects;
  // Update only known old public labels/addresses; custom browser content and records stay intact.
  for (const [id, oldNames] of [
    ["proj-minlab-ai-office", ["MinLab AI Office", "MINOFFI", "MINOFFIA"]],
    ["proj-1792978415000", ["WorthIt", "Worthit"]],
  ] as const) {
    const current = catalogProjects().find((project) => project.id === id);
    if (!current) continue;
    merged = merged.map((project) =>
      project.id === id && oldNames.some((name) => name === project.name)
        ? {
            ...project,
            name: current.name,
            englishName: project.englishName || project.name,
          }
        : project,
    );
  }
  merged = merged.map((project) => {
    if (project.id !== "proj-minially") return project;
    const old = "https://minho-nim.github.io/minially";
    const current = { ...project };
    for (const key of ["liveUrl", "previewUrl"] as const)
      if (project[key]?.replace(/\/$/, "") === old)
        current[key] = "https://minially.pages.dev/";
    return current.liveUrl === project.liveUrl &&
      current.previewUrl === project.previewUrl
      ? project
      : current;
  });
  const previousDescriptions: Record<string, string> = {
    "proj-1792978415000":
      "구매한 물건·구독·멤버십의 사용 횟수와 기간을 기록해 회당 사용 단가와 목표 달성률을 확인하는 소비 가치 추적 웹앱",
    "proj-minially":
      "일정·할 일·프로젝트를 관리하고 자주 쓰는 문구로 반복 입력을 줄이는 개인 플래너",
    "proj-minlab-ai-office":
      "여러 AI의 프로젝트 업무와 기획·결과·배포 승인을 한곳에서 관리하는 개인용 도트 사무실",
  };
  merged = merged.map((project) => {
    const current = catalogProjects().find(
      (candidate) => candidate.id === project.id,
    );
    return current &&
      project.description === previousDescriptions[project.id] &&
      current.description !== project.description
      ? { ...project, description: current.description }
      : project;
  });
  for (const candidate of catalogProjects()) {
    if (seen.has(candidate.id)) continue;
    const existing = merged.find(
      (project) =>
        project.id === candidate.id ||
        (!project.isSample &&
          project.githubUrl?.replace(/\/$/, "").toLowerCase() ===
            candidate.githubUrl?.toLowerCase()) ||
        project.name.trim().toLowerCase() === candidate.name.toLowerCase(),
    );
    if (!existing) merged = [...merged, candidate];
    else if (candidate.liveUrl && (!existing.liveUrl || !existing.previewUrl)) {
      // Connect a newly published address only where the user has no value.
      merged = merged.map((project) =>
        project === existing
          ? {
              ...project,
              liveUrl: project.liveUrl || candidate.liveUrl,
              previewUrl: project.previewUrl || candidate.previewUrl,
            }
          : project,
      );
    }
    seen.add(candidate.id);
  }
  try {
    if (merged !== projects) storage.setItem(key, JSON.stringify(merged));
    storage.setItem(CATALOG_LEDGER_KEY, JSON.stringify([...seen]));
    storage.setItem(versionKey, "true");
  } catch {
    /* Show the connection even if persistence is unavailable. */
  }
  return merged;
}
