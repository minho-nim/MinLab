import { useDeferredValue, useMemo, useState } from "react";
import type { Project, WorkLog } from "../types";
import { routeHash } from "../utils/navigation";

// A view of the original text, never a replacement for the stored record.
export function logHighlights(log: WorkLog): string[] {
  const text = log.content || log.task || "";
  const changes = text.split(/주요 변경\s*\n/)[1]?.split(/\n\s*\n/)[0];
  return (changes || text)
    .split("\n")
    .map((line) => line.replace(/^[-•]\s*/, "").trim())
    .filter((line) => line && !["작업 목적", "주요 변경"].includes(line))
    .slice(0, 3);
}
export function LogContent({
  log,
  expanded = false,
}: {
  log: WorkLog;
  expanded?: boolean;
}) {
  return (
    <div className="log-content">
      <p className="eyebrow">
        {log.date}
        {log.version ? " · v" + log.version : " · 기획·운영 기록"}
      </p>
      <h3>{log.title || log.task || "개발 기록"}</h3>
      <div className="log-highlights">
        <h4>주요 변경</h4>
        <ul>
          {logHighlights(log).map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
      <details className="log-original" open={expanded || undefined}>
        <summary>작업 내용 자세히 보기</summary>
        {[
          ["작업 내용", log.content || log.task],
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
      </details>
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [version, setVersion] = useState("");
  const [month, setMonth] = useState("");
  const [limit, setLimit] = useState(20);
  const source = useMemo(
    () =>
      projects
        .filter((p) => !projectId || p.id === projectId)
        .flatMap((project) =>
          project.workLogs.map((log) => ({
            project,
            log,
            key: project.id + "/" + log.id,
          })),
        )
        .sort((a, b) => b.log.date.localeCompare(a.log.date)),
    [projects, projectId],
  );
  const versions = [
    ...new Set(source.map((item) => item.log.version).filter(Boolean)),
  ];
  const logs = useMemo(
    () =>
      source.filter(
        ({ project: p, log: l }) =>
          (!version || l.version === version) &&
          (!month || l.date.startsWith(month)) &&
          [
            p.name,
            l.title,
            l.content,
            l.task,
            l.version,
            l.reason,
            l.issues,
            l.solution,
            l.testResult,
            l.nextSteps,
          ]
            .join(" ")
            .toLowerCase()
            .includes(deferredSearch.toLowerCase()),
      ),
    [source, version, month, deferredSearch],
  );
  const current = logs.find((l) => l.key === selected) || logs[0];
  return (
    <section className="version-journal">
      <header className="page-heading">
        <p className="eyebrow">개발일지</p>
        <h1>개발일지 모아보기</h1>
        <p>
          프로젝트별로 추가한 기능과 수정한 내용, 테스트 결과를 볼 수 있습니다.
        </p>
      </header>
      <div className="journal-filters">
        <label>
          프로젝트
          <select
            aria-label="개발일지 프로젝트"
            value={projectId || ""}
            onChange={(e) => {
              onSelect(e.target.value);
              setVersion("");
              setLimit(20);
            }}
          >
            <option value="">전체 프로젝트</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.workLogs.length}
              </option>
            ))}
          </select>
        </label>
        <label>
          검색
          <input
            type="search"
            aria-label="개발일지 검색"
            placeholder="변경 내용, 버전으로 검색"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(20);
            }}
          />
        </label>
        <label>
          버전
          <select
            aria-label="개발일지 버전"
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
              setLimit(20);
            }}
          >
            <option value="">전체 버전</option>
            {versions.map((v) => (
              <option key={v} value={v}>
                v{v}
              </option>
            ))}
          </select>
        </label>
        <label>
          작업 월
          <input
            type="month"
            aria-label="개발일지 작업 월"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value);
              setLimit(20);
            }}
          />
        </label>
      </div>
      <div className="journal-result">
        <span role="status">{logs.length}개의 기록</span>
        {(search || version || month) && (
          <button
            className="text-link"
            onClick={() => {
              setSearch("");
              setVersion("");
              setMonth("");
              setLimit(20);
            }}
          >
            검색 조건 초기화
          </button>
        )}
      </div>
      {!current ? (
        <div className="empty-state">표시할 개발 기록이 없습니다.</div>
      ) : (
        <>
          <div className="journal-desktop">
            <nav className="version-index" aria-label="날짜 및 버전 선택">
              {logs.map(({ project: p, log: l, key }, i) => (
                <div key={key}>
                  {(i === 0 || logs[i - 1].log.date !== l.date) && (
                    <p className="journal-date">{l.date}</p>
                  )}
                  <button
                    aria-current={current.key === key ? "true" : undefined}
                    onClick={() => setSelected(key)}
                  >
                    <small>
                      {l.version ? "v" + l.version : "기획·운영 기록"}
                    </small>
                    <strong>{l.title || l.task || "개발 기록"}</strong>
                    <span>{p.name}</span>
                  </button>
                </div>
              ))}
            </nav>
            <article className="journal-detail" key={current.key}>
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
            {logs.slice(0, limit).map(({ project: p, log: l, key }) => (
              <details
                key={key}
                onToggle={(e) => {
                  const open = e.currentTarget.open;
                  setExpanded((previous) => {
                    const next = new Set(previous);
                    if (open) next.add(key);
                    else next.delete(key);
                    return next;
                  });
                }}
              >
                <summary>
                  <small>
                    {l.date} · {l.version ? "v" + l.version : "기획·운영 기록"}{" "}
                    / {p.name}
                  </small>
                  <strong>{l.title || l.task || "개발 기록"}</strong>
                </summary>
                {expanded.has(key) && (
                  <>
                    <LogContent log={l} />
                    <a
                      href={routeHash({ view: "project", projectId: p.id })}
                      className="text-link"
                    >
                      프로젝트 보기 ↗
                    </a>
                  </>
                )}
              </details>
            ))}
            {logs.length > limit && (
              <button
                className="primary-link"
                onClick={() => setLimit((n) => n + 20)}
              >
                기록 더 보기 · {logs.length - limit}개 남음
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
