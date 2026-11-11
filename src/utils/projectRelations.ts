import type { Project } from "../types";
const generic = new Set([
  "react",
  "typescript",
  "javascript",
  "vite",
  "localstorage",
  "indexeddb",
  "github pages",
  "pwa",
]);
const words = (p: Project) =>
  new Set(
    p.description
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(
        (w) =>
          w.length >= 3 &&
          ![
            "프로젝트",
            "개인용",
            "웹사이트",
            "서비스를",
            "관리하는",
            "기록하는",
            "제공하는",
            "사용하는",
          ].includes(w),
      ),
  );
export const featureNames = (p: Project) =>
  p.keyFeatures.map((f) => (typeof f === "string" ? f : f.name));
export function relatedProjects(project: Project, projects: Project[]) {
  const currentWords = words(project);
  return projects
    .filter((p) => p.id !== project.id && p.visible !== false)
    .map((p, index) => {
      const category = Boolean(
        project.category && project.category === p.category,
      );
      const meaningful = p.techStack.filter(
        (t) => !generic.has(t.toLowerCase()) && project.techStack.includes(t),
      ).length;
      const features = featureNames(p).filter((f) =>
        featureNames(project).includes(f),
      ).length;
      const problem = [...words(p)].filter((w) => currentWords.has(w)).length;
      const direct = Boolean(project.relatedProjectIds?.includes(p.id));
      return {
        project: p,
        index,
        score:
          (category ? 10000 : 0) +
          (meaningful + features) * 100 +
          (problem >= 2 ? problem * 10 : 0) +
          (direct ? 1 : 0),
        relevant:
          category || meaningful > 0 || features > 0 || problem >= 2 || direct,
      };
    })
    .filter((p) => p.relevant)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .map((p) => p.project);
}
export function nextProject(project: Project, projects: Project[]) {
  const visible = projects.filter((p) => p.visible !== false);
  const index = visible.findIndex((p) => p.id === project.id);
  return index < 0 ? undefined : visible[index + 1];
}
