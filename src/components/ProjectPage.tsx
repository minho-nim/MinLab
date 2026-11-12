import { ProjectNavigator } from "./ProjectNavigator";
import { FeatureShowcase } from "./FeatureShowcase";
import { DevelopmentJourney } from "./DevelopmentJourney";
import { ProjectChapters } from "./ProjectChapters";
import type { Project } from "../types";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { lastArchive } from "../utils/archiveQuery";
import { routeHash } from "../utils/navigation";

export function ProjectPage({
  project,
  projects = [],
  linkedLogId,
}: {
  project: Project;
  projects?: Project[];
  linkedLogId?: string;
}) {
  const logs = [...project.workLogs].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const background = [...logs]
    .reverse()
    .find((item) => item.reason || item.issues);
  return (
    <div className="project-story">
      <ProjectChapters />
      <div className="project-breadcrumb">
        <a className="text-link" href={lastArchive()}>
          <ArrowLeft size={15} /> 프로젝트 / {project.name}
        </a>
      </div>
      <header
        id="project-overview"
        className="project-intro project-chapter-target"
      >
        <p className="eyebrow">
          {project.category} / {project.status}
        </p>
        <h1>{project.name}</h1>
        <p>{project.description}</p>
        <div className="project-tags">
          {project.techStack.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="project-actions">
          {project.liveUrl?.trim() && (
            <a
              className="primary-link"
              href={project.liveUrl}
              target="_blank"
              rel="noreferrer"
            >
              앱 실행하기 <ArrowUpRight size={17} />
            </a>
          )}
          {project.githubUrl && (
            <a
              className="text-link"
              href={project.githubUrl}
              target="_blank"
              rel="noreferrer"
            >
              GitHub <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </header>
      <FeatureShowcase project={project} />
      <section
        id="project-problem"
        className="problem-solution detail-reading-section project-chapter-target"
      >
        <p className="eyebrow">제작 배경과 해결 방식</p>
        <h2>문제에서 출발해, 제품으로.</h2>
        {background ? (
          <>
            <small>{background.date} · 실제 개발 기록</small>
            <p>{background.reason || background.issues}</p>
            {background.solution && <p>{background.solution}</p>}
          </>
        ) : (
          <p>제작 배경은 아직 기록되지 않았습니다.</p>
        )}
      </section>
      <section
        id="project-development"
        className="detail-development project-chapter-target"
      >
        <header>
          <p className="eyebrow">개발 과정</p>
          <h2>아이디어가 발전해 온 과정.</h2>
        </header>
        <DevelopmentJourney project={project} linkedLogId={linkedLogId} />
        <div className="project-actions">
          <a
            className="text-link"
            href={routeHash({ view: "records", projectId: project.id })}
          >
            전체 개발일지 보기 ↗
          </a>
          <a
            className="text-link"
            href={routeHash({
              view: "records",
              projectId: project.id,
              tab: "prompts",
            })}
          >
            작업 프롬프트 {project.promptHistory?.length || 0}개 ↗
          </a>
        </div>
      </section>
      <section
        id="project-result"
        className="detail-reading-section project-chapter-target"
      >
        <p className="eyebrow">결과와 다음 작업</p>
        <h2>기록으로 확인하는 변화.</h2>
        {logs.find((l) => l.testResult) ? (
          <>
            <h3>가장 최근에 기록된 검증 결과</h3>
            <p>{logs.find((l) => l.testResult)?.testResult}</p>
          </>
        ) : (
          <p>별도로 기록된 검증 결과가 없습니다.</p>
        )}
        {logs.find((l) => l.nextSteps) && (
          <>
            <h3>기록된 다음 작업</h3>
            <p>{logs.find((l) => l.nextSteps)?.nextSteps}</p>
          </>
        )}
        {project.changelog.length > 0 && (
          <details>
            <summary>기존 변경 이력 {project.changelog.length}개</summary>
            {project.changelog.map((c) => (
              <article key={c.id}>
                <small>
                  {c.date} / {c.version}
                </small>
                <p>{c.description}</p>
              </article>
            ))}
          </details>
        )}
        <div className="project-actions">
          {project.liveUrl?.trim() && (
            <a
              className="primary-link"
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              앱 실행하기 ↗
            </a>
          )}
          {project.githubUrl && (
            <a
              className="text-link"
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          )}
        </div>
      </section>
      <ProjectNavigator project={project} projects={projects} />
    </div>
  );
}
