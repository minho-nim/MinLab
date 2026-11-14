import type { Project } from "../types";

export const primaryProjectIds = [
  "proj-minlab-ai-office",
  "proj-minially",
] as const;

export const portfolioProjectIds = [
  ...primaryProjectIds,
  "proj-crossroads-ai-verdict",
  "proj-1792978415000",
  "proj-snake-race",
  "proj-musclemap",
] as const;

/** Lead visitor navigation with the main projects; keep all other saved positions. */
export function orderPortfolioProjects(projects: Project[]): Project[] {
  const rank = new Map<string, number>(
    portfolioProjectIds.map((id, index) => [id, index]),
  );
  return [...projects].sort(
    (a, b) =>
      (rank.get(a.id) ?? portfolioProjectIds.length) -
      (rank.get(b.id) ?? portfolioProjectIds.length),
  );
}

/** Preserve stored order as the tie-breaker without changing saved data. */
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
  for (const id of portfolioProjectIds)
    add(eligible.find((project) => project.id === id));
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
