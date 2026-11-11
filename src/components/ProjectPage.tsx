import { useEffect, useRef, useState } from "react";
import type { Project } from "../types";
import { ArrowLeft, ArrowUpRight, Settings } from "lucide-react";
import { lastArchive } from "../utils/archiveQuery";
import { routeHash } from "../utils/navigation";
import { mediaFor, ProjectMedia } from "./ProjectMedia";
import { LogContent } from "./VersionJournal";
export function ProjectPage({
  project,
  projects = [],
}: {
  project: Project;
  projects?: Project[];
}) {
  const [active, setActive] = useState(0);
  const [mediaIndex, setMediaIndex] = useState(0);
  const story = useRef<HTMLDivElement>(null);
  const features = project.keyFeatures.map((f, i) =>
    typeof f === "string"
      ? { id: "feature-" + i, name: f, description: "" }
      : f,
  );
  const media = mediaFor(project);
  const logs = [...project.workLogs].sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const [selectedLog, setSelectedLog] = useState("");
  const log = logs.find((l) => l.id === selectedLog) || logs[0];
  const background = [...logs]
    .reverse()
    .find((item) => item.reason || item.issues);
  const others = projects.filter((p) => p.id !== project.id);
  const related = others
    .filter(
      (p) =>
        p.category === project.category ||
        p.techStack.some((t) => project.techStack.includes(t)),
    )
    .slice(0, 3);
  const next =
    projects.length > 1
      ? projects[
          (projects.findIndex((p) => p.id === project.id) + 1) % projects.length
        ]
      : undefined;
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setActive(index);
            const matched = media.findIndex((m) => m.section === index);
            if (matched >= 0) setMediaIndex(matched);
          }
      },
      { rootMargin: "-15% 0px -40% 0px", threshold: 0.15 },
    );
    story.current
      ?.querySelectorAll("[data-index]")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [project.id, media.length]);
  return (
    <div className="project-story">
      <div className="project-breadcrumb">
        <a className="text-link" href={lastArchive()}>
          <ArrowLeft size={15} /> 아카이브로 돌아가기
        </a>
        <a
          className="text-link"
          href={routeHash({ view: "manage", projectId: project.id })}
        >
          <Settings size={14} /> 프로젝트 관리
        </a>
      </div>
      <header className="project-intro">
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
      <section className="detail-cover" aria-label="프로젝트 대표 화면">
        <ProjectMedia project={project} eager index={mediaIndex} />
        <div>
          <span>
            {media[mediaIndex]?.label ||
              "프로젝트 화면은 아직 등록되지 않았습니다."}
          </span>
          <span>{project.category}</span>
        </div>
      </section>
      <div className="story-layout">
        <div className="story-copy" ref={story}>
          <section data-index="0">
            <p className="eyebrow">프로젝트 소개</p>
            <h2>이 프로젝트는.</h2>
            <p>
              {project.description ||
                "프로젝트 소개가 아직 등록되지 않았습니다."}
            </p>
          </section>
          <section data-index="1">
            <p className="eyebrow">제작 배경</p>
            <h2>제작 배경과 문제.</h2>
            {background ? (
              <>
                <p className="eyebrow">
                  가장 이른 개발 기록 · {background.date} · 수정 이유
                </p>
                <p>{background.reason || background.issues}</p>
              </>
            ) : (
              <p className="muted-copy">
                제작 배경과 문제 정의는 아직 기록되지 않았습니다.
              </p>
            )}
          </section>
          <section data-index="2">
            <p className="eyebrow">주요 기능</p>
            <h2>기능에서 경험으로.</h2>
            {features.length ? (
              <div className="feature-options">
                {features.map((f, i) => (
                  <button
                    key={i}
                    aria-pressed={active === i + 10}
                    onClick={() => {
                      setActive(i + 10);
                      const matched = media.findIndex(
                        (m) =>
                          m.featureId === ("id" in f ? f.id : "feature-" + i) ||
                          m.label === f.name,
                      );
                      if (matched >= 0) setMediaIndex(matched);
                    }}
                  >
                    <span>0{i + 1}</span>
                    <div>
                      <h3>{f.name}</h3>
                      {f.description && <p>{f.description}</p>}
                    </div>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted-copy">
                상세 기능 설명은 아직 등록되지 않았습니다.
              </p>
            )}
            {active >= 10 &&
              features[active - 10] &&
              media.some(
                (m) =>
                  m.featureId ===
                    ("id" in features[active - 10]
                      ? features[active - 10].id
                      : "feature-" + (active - 10)) ||
                  m.label === features[active - 10].name,
              ) && (
                <div className="feature-inline-media">
                  <ProjectMedia project={project} index={mediaIndex} />
                  <p>{media[mediaIndex]?.label}</p>
                </div>
              )}
          </section>
          <section data-index="3">
            <p className="eyebrow">개발 및 개선 과정</p>
            <h2>
              만들고, 검증하고,
              <br />
              개선한 기록.
            </h2>
            {log ? (
              <>
                <label className="log-select">
                  날짜 · 버전 선택
                  <select
                    value={log.id}
                    onChange={(e) => setSelectedLog(e.target.value)}
                  >
                    {logs.map((l) => (
                      <option value={l.id} key={l.id}>
                        {l.date} / {l.version || "버전 미지정"} /{" "}
                        {l.title || l.task || "개발 기록"}
                      </option>
                    ))}
                  </select>
                </label>
                <LogContent log={log} />
              </>
            ) : (
              <p className="muted-copy">등록된 개발일지가 없습니다.</p>
            )}
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
          </section>
          <section data-index="4">
            <p className="eyebrow">변경 기록과 결과</p>
            <h2>변화와 결과.</h2>
            {project.changelog.length > 0 && (
              <div className="changelog-list">
                {project.changelog.map((c) => (
                  <article key={c.id}>
                    <small>
                      {c.date} / {c.version}
                    </small>
                    <p>{c.description}</p>
                  </article>
                ))}
              </div>
            )}
            {logs.some((l) => l.testResult) ? (
              <>
                <h3>기록에 남겨진 검증 결과</h3>
                <p>{logs.find((l) => l.testResult)?.testResult}</p>
              </>
            ) : (
              <p className="muted-copy">별도로 기록된 검증 결과가 없습니다.</p>
            )}
          </section>
        </div>
        <aside className="story-showcase">
          <div className="window-bar">
            <span className="window-dots">● ● ●</span>
            <span>프로젝트 화면</span>
            <ArrowUpRight size={12} />
          </div>
          <ProjectMedia key={project.id} project={project} index={mediaIndex} />
          <div className="showcase-caption">
            <p>{media[mediaIndex]?.label || "프로젝트 화면 미등록"}</p>
            {media.length > 1 && (
              <div className="media-tabs">
                {media.map((m, i) => (
                  <button
                    key={m.src}
                    aria-pressed={i === mediaIndex}
                    onClick={() => setMediaIndex(i)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            <p className="eyebrow">
              {active === 0
                ? "프로젝트 소개"
                : active === 1
                  ? "제작 배경"
                  : active === 2 || active >= 10
                    ? "주요 기능"
                    : active === 3
                      ? "개발 과정"
                      : "확인 결과"}
            </p>
            <p>
              {active >= 10
                ? features[active - 10]?.description ||
                  features[active - 10]?.name
                : active === 3
                  ? log?.title || "개발 과정"
                  : project.description}
            </p>
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="related-projects">
          <p className="eyebrow">관련 프로젝트</p>
          <h2>함께 살펴볼 프로젝트.</h2>
          <div>
            {related.map((p) => (
              <a
                href={routeHash({ view: "project", projectId: p.id })}
                key={p.id}
              >
                <small>{p.category}</small>
                <h3>{p.name} ↗</h3>
                <p>{p.description}</p>
              </a>
            ))}
          </div>
        </section>
      )}
      {next && (
        <a
          className="next-project"
          href={routeHash({ view: "project", projectId: next.id })}
        >
          <span className="eyebrow">다음 프로젝트</span>
          <strong>{next.name}</strong>
          <ArrowUpRight />
        </a>
      )}
      <nav className="mini-navigator" aria-label="프로젝트 미니 내비게이터">
        <a href={lastArchive()}>전체 목록</a>
        <span>{project.name}</span>
        {next && (
          <a href={routeHash({ view: "project", projectId: next.id })}>
            다음 프로젝트 ↗
          </a>
        )}
      </nav>
    </div>
  );
}
