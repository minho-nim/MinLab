import type { Project } from "../types";
import { projectCaseStudies } from "../data/projectCaseStudies";
import { routeHash } from "../utils/navigation";

export function ProjectPurpose({ project }: { project: Project }) {
  const study = projectCaseStudies[project.id];
  return (
    <section
      id="project-problem"
      className="detail-reading-section project-chapter-target"
    >
      <h2>왜 만들었나</h2>
      {study ? (
        <>
          <p>{study.audience}</p>
          <p>{study.purpose}</p>
          <h3>이렇게 사용합니다</h3>
          <ol className="project-use-flow">
            {study.flow.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      ) : (
        <p>
          제작 배경은 아직 정리하지 않았습니다. 등록된 기능과 개발 기록을 확인할
          수 있습니다.
        </p>
      )}
    </section>
  );
}
export function ProjectMaking({ project }: { project: Project }) {
  const study = projectCaseStudies[project.id];
  if (!study?.process?.length) return null;
  return (
    <div className="project-making">
      <h2>만들면서 바꾼 것</h2>
      {study.process.map((item) => (
        <article key={item.title}>
          <h3>{item.title}</h3>
          <dl>
            {[
              ["문제", item.problem],
              ["판단 기준", item.criterion],
              ["수정", item.change],
              ["확인 결과", item.result],
            ].map(([label, text]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
          <div className="project-actions">
            {item.logId &&
              project.workLogs.some((log) => log.id === item.logId) && (
                <a
                  className="text-link"
                  data-record-link={item.logId}
                  href={routeHash({
                    view: "project",
                    projectId: project.id,
                    logId: item.logId,
                  })}
                >
                  이 판단의 개발 기록 ↗
                </a>
              )}
            {item.sourceUrl && (
              <a
                className="text-link"
                href={item.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                당시 변경 근거 · 새 탭 ↗
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
export function ProjectScope({ project }: { project: Project }) {
  const study = projectCaseStudies[project.id];
  if (!study)
    return (
      <p>
        구현·검증 범위는 아직 별도로 정리하지 않았습니다. 과거 개발 기록은
        위에서 펼쳐 볼 수 있습니다.
      </p>
    );
  return (
    <>
      <dl className="project-scope">
        {[
          ["구현 범위", study.implementation],
          ["확인한 범위", study.verification],
          ["남은 확인", study.remaining],
        ].map(([label, text]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{text}</dd>
          </div>
        ))}
      </dl>
      {study.sources.length > 0 && (
        <details className="case-sources">
          <summary>소개에 참고한 자료</summary>
          {study.sources.map((source) => (
            <a
              key={source.url}
              className="text-link"
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.label} · 새 탭 ↗
            </a>
          ))}
        </details>
      )}
    </>
  );
}
