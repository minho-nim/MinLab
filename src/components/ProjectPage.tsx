import {
  projectDestination,
  projectLinkLabel,
} from "../utils/projectDestinations";
import { projectStories } from "../data/projectStories";
import {
  ProjectPurpose,
  ProjectMaking,
  ProjectScope,
} from "./ProjectCaseContent";
import { ProjectNavigator } from "./ProjectNavigator";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
import { FeatureShowcase } from "./FeatureShowcase";
import { DevelopmentJourney } from "./DevelopmentJourney";
import { ProjectChapters } from "./ProjectChapters";
import type { Project } from "../types";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { lastArchive } from "../utils/archiveQuery";
import { routeHash } from "../utils/navigation";
import { minLabProjectId } from "../utils/homeProjects";

export function ProjectPage({
  project,
  projects = [],
  linkedLogId,
}: {
  project: Project;
  projects?: Project[];
  linkedLogId?: string;
}) {
  const story = projectStories[project.id];
  const cover = mediaFor(project)[0];
  const logs = [...project.workLogs].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  // Keep old record links working without a portfolio showcase for this site itself.
  if (project.id === minLabProjectId)
    return (
      <div
        className="project-story minlab-history"
        data-project-id={project.id}
      >
        <header className="page-heading">
          <h1>MinLab 변경사항</h1>
          <p>이 웹사이트를 고친 내용과 작업 프롬프트를 모았습니다.</p>
          <div className="project-actions">
            <a
              className="text-link"
              href={routeHash({ view: "records", projectId: project.id })}
            >
              변경사항 모아보기
            </a>
            <a
              className="text-link"
              href={routeHash({
                view: "records",
                projectId: project.id,
                tab: "prompts",
              })}
            >
              작업 프롬프트 보기
            </a>
          </div>
        </header>
        <section id="project-development" className="detail-development">
          <DevelopmentJourney project={project} linkedLogId={linkedLogId} />
        </section>
      </div>
    );
  return (
    <div className="project-story" data-project-id={project.id}>
      <ProjectChapters />
      <div className="project-breadcrumb">
        <a className="text-link" href={lastArchive()}>
          <ArrowLeft size={15} /> 프로젝트 / {project.name}
        </a>
      </div>
      <header
        id="project-overview"
        className={
          "project-intro project-chapter-target" +
          (cover ? " has-project-cover" : "")
        }
      >
        <div className="project-intro-copy">
          <p className="project-category">{project.category}</p>
          <h1>{project.name}</h1>
          <p className="project-intro-description">{project.description}</p>
          <dl className="project-availability">
            <div>
              <dt>개발 상태</dt>
              <dd>{project.status}</dd>
            </div>
            <div>
              <dt>이용 경로</dt>
              <dd>
                {project.liveUrl?.trim()
                  ? "앱 실행 링크 제공 · 검증 범위는 아래에서 확인"
                  : "등록된 앱 실행 링크 없음"}
              </dd>
            </div>
          </dl>
          <div className="project-tags">
            {project.techStack.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          {story && (
            <p className="project-portfolio-note">
              제작 배경과 자세한 사용 흐름은 별도 포트폴리오에 정리했습니다.
            </p>
          )}
          <div className="project-actions">
            {story && (
              <a className="primary-link" {...projectDestination(project.id)}>
                {projectLinkLabel(project.id)} <ArrowUpRight size={17} />
              </a>
            )}
            {project.liveUrl?.trim() && (
              <a
                className={story ? "text-link" : "primary-link"}
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
              >
                앱 실행 · 새 탭 <ArrowUpRight size={17} />
              </a>
            )}
            {project.githubUrl && (
              <a
                className="text-link"
                href={project.githubUrl}
                target="_blank"
                rel="noreferrer"
              >
                GitHub · 새 탭 <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </div>
        {cover && (
          <figure className="project-intro-screen">
            <ProjectMedia
              project={project}
              eager
              priority
              zoomable
              expandLabel={project.name + " 대표 화면 크게 보기"}
            />
            <figcaption>
              <span>{cover.label}</span>
              {cover.notice && <p>{cover.notice}</p>}
            </figcaption>
          </figure>
        )}
      </header>
      <FeatureShowcase project={project} />
      <ProjectPurpose project={project} />
      <section
        id="project-development"
        className="detail-development project-chapter-target"
      >
        <ProjectMaking project={project} />
        <header>
          <p className="eyebrow">원본 기록</p>
          <h2>버전별 개발일지</h2>
        </header>
        <details
          key={project.id + (linkedLogId || "")}
          className="project-records-disclosure"
          open={linkedLogId ? true : undefined}
        >
          <summary>개발 기록 {logs.length}개 보기</summary>
          <DevelopmentJourney project={project} linkedLogId={linkedLogId} />
        </details>
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
        <h2>구현한 것과 남은 확인</h2>
        <ProjectScope project={project} />
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
              className={story ? "text-link" : "primary-link"}
              href={project.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              앱 실행 · 새 탭 ↗
            </a>
          )}
          {project.githubUrl && (
            <a
              className="text-link"
              href={project.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub · 새 탭 ↗
            </a>
          )}
        </div>
      </section>
      <ProjectNavigator project={project} projects={projects} />
    </div>
  );
}
