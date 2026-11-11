import type { Project } from "../types";

/** Preserve stored order as the tie-breaker; never change archive order or data. */
export function selectHomeProjects(
  projects: Project[],
  hasScreen: (project: Project) => boolean,
  limit: number,
): Project[] {
  const eligible = projects.filter(
    (p) =>
      p.visible !== false &&
      !p.archived &&
      (hasScreen(p) || Boolean(p.liveUrl?.trim())),
  );
  const chosen: Project[] = [];
  const used = new Set<string>();
  const categories = new Set<string>();
  const game = (p: Project) => /게임|game/i.test(p.category);
  const add = (p: Project | undefined) => {
    if (p && chosen.length < limit && !used.has(p.id)) {
      chosen.push(p);
      used.add(p.id);
      categories.add(p.category.trim());
    }
  };
  const first = eligible.find(hasScreen) || eligible[0];
  add(first);
  if (first)
    add(
      eligible.find((p) => game(p) !== game(first) && hasScreen(p)) ||
        eligible.find((p) => game(p) !== game(first)),
    );
  for (const p of eligible) if (!categories.has(p.category.trim())) add(p);
  for (const p of eligible) add(p);
  return chosen;
}
