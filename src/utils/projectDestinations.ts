import { projectStories } from "../data/projectStories";
import { routeHash } from "./navigation";

/** Dedicated portfolios open separately; archived development links stay local. */
export function projectDestination(projectId: string) {
  const portfolio = projectStories[projectId]?.url;
  return portfolio
    ? {
        href: portfolio.replace(/\/$/, "") + "/",
        target: "_blank",
        rel: "noopener noreferrer",
        "data-external-portfolio": true,
        title: "별도 포트폴리오 · 새 탭",
      }
    : { href: routeHash({ view: "project", projectId }) };
}

export function projectLinkLabel(projectId: string) {
  return projectStories[projectId] ? "포트폴리오 보기" : "프로젝트 보기";
}
