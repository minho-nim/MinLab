import { useEffect, useRef, useState } from "react";
import type { Project, WorkLog } from "../types";
import { LogContent } from "./VersionJournal";
import { mediaFor, ProjectMedia } from "./ProjectMedia";
const fields: [string, (l: WorkLog) => string | undefined][] = [
  ["변경 사항", (l) => l.content || l.task],
  ["수정 이유", (l) => l.reason || l.issues],
  ["해결 방법", (l) => l.solution],
  ["테스트 결과", (l) => l.testResult],
  ["다음 작업", (l) => l.nextSteps],
];
export function DevelopmentJourney({ project }: { project: Project }) {
  const logs = [...project.workLogs].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
  const [selected, setSelected] = useState(logs[0]?.id || "");
  const [compare, setCompare] = useState("");
  const index = logs.findIndex((l) => l.id === selected);
  const log = logs[index] || logs[0];
  const older = logs.filter((l) => l.id !== log?.id);
  const comparison = logs.find((l) => l.id === compare);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setSelected((e.target as HTMLElement).dataset.log || "");
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 },
    );
    panel.current
      ?.querySelectorAll("[data-log]")
      .forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [project.id]);
  if (!log) return <p className="muted-copy">등록된 개발일지가 없습니다.</p>;
  const screen = mediaFor(project).findIndex(
    (s) => s.version && s.version === log.version,
  );
  return (
    <div className="development-journey">
      <div className="journey-desktop">
        <nav className="journey-versions" aria-label="개발 버전 선택">
          {logs.map((l, i) => (
            <button
              key={l.id}
              aria-current={log.id === l.id ? "true" : undefined}
              onClick={() => {
                setSelected(l.id);
                setCompare("");
              }}
            >
              <small>
                {l.date} · {l.version || "버전 미지정"}
                {i === 0 ? " · 최신 기록" : ""}
              </small>
              <strong>{l.title || l.task || "개발 기록"}</strong>
            </button>
          ))}
        </nav>
        <div className="journey-record" key={log.id}>
          <LogContent log={log} />
          {screen >= 0 && <ProjectMedia project={project} index={screen} />}
          <label className="log-select">
            다른 기록과 비교
            <select
              aria-label="개발 기록 비교"
              value={compare}
              onChange={(e) => setCompare(e.target.value)}
            >
              <option value="">비교할 기록 선택</option>
              {older.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.date} / {l.version || "버전 미지정"} /{" "}
                  {l.title || "개발 기록"}
                </option>
              ))}
            </select>
          </label>
          {comparison && (
            <div className="version-comparison">
              <p>기록 원문 비교 · 추가/삭제를 추정하지 않습니다.</p>
              {fields.map(([name, get]) => (
                <section key={name}>
                  <h4>{name}</h4>
                  <div>
                    <article>
                      <small>
                        {comparison.date} · {comparison.version}
                      </small>
                      <p>{get(comparison) || "기록 없음"}</p>
                    </article>
                    <article>
                      <small>
                        {log.date} · {log.version}
                      </small>
                      <p>{get(log) || "기록 없음"}</p>
                    </article>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="journey-mobile" ref={panel}>
        {logs.map((l, i) => (
          <details key={l.id} data-log={l.id} open={i === 0 ? true : undefined}>
            <summary>
              <small>
                {l.date} · {l.version || "버전 미지정"}
              </small>
              <strong>{l.title || l.task || "개발 기록"}</strong>
            </summary>
            <LogContent log={l} />
          </details>
        ))}
      </div>
    </div>
  );
}
