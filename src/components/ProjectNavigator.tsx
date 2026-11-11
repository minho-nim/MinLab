import { useEffect, useRef } from "react";
import type { Project } from "../types";
import { routeHash } from "../utils/navigation";
import { lastArchive } from "../utils/archiveQuery";
import { relatedProjects, nextProject } from "../utils/projectRelations";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
export function ProjectNavigator({
  project,
  projects,
}: {
  project: Project;
  projects: Project[];
}) {
  const related = relatedProjects(project, projects),
    next = nextProject(project, projects);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const media = matchMedia("(min-width:900px)");
    const update = () => {
      if (details.current) details.current.open = media.matches;
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return (
    <section className="project-connections" aria-label="프로젝트 간 이동">
      {related.length > 0 && (
        <div className="related-projects">
          <p className="eyebrow">함께 살펴볼 프로젝트</p>
          <div>
            {related.map((p) => (
              <a
                href={routeHash({ view: "project", projectId: p.id })}
                key={p.id}
              >
                {mediaFor(p).length > 0 && <ProjectMedia project={p} />}
                <small>{p.category}</small>
                <h3>{p.name} ↗</h3>
                <p>{p.description}</p>
              </a>
            ))}
          </div>
        </div>
      )}
      {next ? (
        <a
          className="next-project next-project-showcase"
          href={routeHash({ view: "project", projectId: next.id })}
        >
          <div>
            <span className="eyebrow">다음 프로젝트 / {next.category}</span>
            <h2>{next.name}</h2>
            <p>{next.description}</p>
            <span className="text-link">다음 프로젝트 살펴보기 ↗</span>
          </div>
          {mediaFor(next).length > 0 && <ProjectMedia project={next} />}
        </a>
      ) : (
        <a className="next-project" href={lastArchive()}>
          <span className="eyebrow">모든 프로젝트를 살펴보셨습니다.</span>
          <strong>전체 아카이브로 돌아가기 ↗</strong>
        </a>
      )}
      <details className="mini-project-menu" ref={details}>
        <summary>
          다른 프로젝트로 이동 <span>{project.name}</span>
        </summary>
        <nav
          className="mini-project-track"
          aria-label="프로젝트 미니 내비게이터"
        >
          <a href={lastArchive()}>전체 목록 ↗</a>
          {projects
            .filter((p) => p.visible !== false)
            .map((p) => (
              <a
                aria-current={p.id === project.id ? "page" : undefined}
                key={p.id}
                href={routeHash({ view: "project", projectId: p.id })}
              >
                {p.name}
              </a>
            ))}
        </nav>
      </details>
    </section>
  );
}
