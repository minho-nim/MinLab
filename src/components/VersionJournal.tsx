import { useMemo, useState } from "react";
import type { Project, WorkLog } from "../types";
import { routeHash } from "../utils/navigation";
export function LogContent({ log }: { log: WorkLog }) {
  const title = log.title || log.task || "";
  const kind = /신규|기능 추가/.test(title)
    ? "신규 기능"
    : /개선|수정|보완|정비/.test(title)
      ? "개선·수정"
      : null;
  return (
    <div className="log-content">
      {kind && (
        <span
          className={"log-kind " + (kind === "신규 기능" ? "new" : "improved")}
        >
          {kind}
        </span>
      )}
      <p className="eyebrow">
        {log.date}
        {log.version ? " / " + log.version : ""}
      </p>
      <h3>{log.title || log.task || "개발 기록"}</h3>
      {[
        ["변경 내용", log.content || log.task],
        ["수정 이유", log.reason || log.issues],
        ["해결 방법", log.solution],
        ["테스트 결과", log.testResult],
        ["다음 작업", log.nextSteps],
      ].map(
        ([label, value]) =>
          value && (
            <div key={label}>
              <h4>{label}</h4>
              <p>{value}</p>
            </div>
          ),
      )}
    </div>
  );
}
export function VersionJournal({
  projects,
  projectId,
  onSelect,
}: {
  projects: Project[];
  projectId?: string | null;
  onSelect: (id: string) => void;
}) {
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const logs = useMemo(
    () =>
      projects
        .filter((p) => !projectId || p.id === projectId)
        .flatMap((p) =>
          p.workLogs.map((log) => ({
            project: p,
            log,
            key: p.id + "/" + log.id,
          })),
        )
        .filter(({ project: p, log: l }) =>
          [
            p.name,
            l.title,
            l.content,
            l.task,
            l.version,
            l.reason,
            l.testResult,
            l.nextSteps,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((a, b) => b.log.date.localeCompare(a.log.date)),
    [projects, projectId, search],
  );
  const current = logs.find((l) => l.key === selected) || logs[0];
  return (
    <section className="version-journal">
      <header className="page-heading">
        <p className="eyebrow">DEVELOPMENT JOURNAL / REAL WORK, REAL RECORDS</p>
        <h1>
          만드는 과정의
          <br />
          <em>모든 변화.</em>
        </h1>
        <p>프로젝트에 남겨진 실제 날짜와 버전, 개선의 이유를 읽어보세요.</p>
      </header>
      <div className="journal-filters">
        <select
          aria-label="개발일지 프로젝트"
          value={projectId || ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          <option value="">전체 프로젝트</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          aria-label="개발일지 검색"
          placeholder="내용, 버전으로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span role="status">{logs.length}개의 기록</span>
      </div>
      {!current ? (
        <div className="empty-state">표시할 개발 기록이 없습니다.</div>
      ) : (
        <>
          <div className="journal-desktop">
            <nav className="version-index" aria-label="날짜 및 버전 선택">
              {logs.map(({ project: p, log: l, key }) => (
                <button
                  key={key}
                  aria-current={current.key === key ? "true" : undefined}
                  onClick={() => setSelected(key)}
                >
                  <small>
                    {l.date} / {l.version || "버전 미지정"}
                  </small>
                  <strong>{l.title || l.task || "개발 기록"}</strong>
                  <span>{p.name}</span>
                </button>
              ))}
            </nav>
            <article className="journal-detail">
              <a
                className="text-link"
                href={routeHash({
                  view: "project",
                  projectId: current.project.id,
                })}
              >
                {current.project.name} ↗
              </a>
              <LogContent log={current.log} />
            </article>
          </div>
          <div className="journal-mobile">
            {logs.map(({ project: p, log: l, key }) => (
              <details key={key}>
                <summary>
                  <small>
                    {l.date} · {l.version || "버전 미지정"} / {p.name}
                  </small>
                  <strong>{l.title || l.task || "개발 기록"}</strong>
                </summary>
                <LogContent log={l} />
                <a
                  href={routeHash({ view: "project", projectId: p.id })}
                  className="text-link"
                >
                  프로젝트 보기 ↗
                </a>
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
