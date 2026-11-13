/** Visitor-facing groups do not replace the project's saved category. */
export const projectGroups = [
  { id: "work", label: "AI·업무" },
  { id: "life", label: "생활" },
  { id: "games", label: "게임" },
  { id: "other", label: "기타" },
] as const;
export function projectGroup(category: string): string {
  if (/게임|game|레이싱/i.test(category)) return "games";
  if (/AI|업무|자동화|의사결정|프로젝트|아카이브|기획|도구/i.test(category))
    return "work";
  if (/생활|생산|일정|소비|건강|헬스|운동|라이프|엔터테인먼트|3D/i.test(category))
    return "life";
  return "other";
}
export function groupLabel(id: string) {
  return projectGroups.find((group) => group.id === id)?.label || "";
}
