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
export function DevelopmentJourney({
  project,
  linkedLogId,
}: {
  project: Project;
  linkedLogId?: string;
}) {
  const logs = [...project.workLogs].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
  );
  const linked = logs.find((item) => item.id === linkedLogId);
  const [selected, setSelected] = useState(linked?.id || logs[0]?.id || "");
  useEffect(() => {
    if (linked) setSelected(linked.id);
  }, [linked?.id]);
  const [compare, setCompare] = useState("");
  const [compareAt, setCompareAt] = useState(logs[0]?.id || "");
  const index = logs.findIndex((l) => l.id === selected);
  const log = logs[index] || logs[0];
  const comparison = logs.find((l) => l.id === compare);
  const versions = useRef<HTMLElement>(null);
  const records = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!matchMedia("(min-width:900px)").matches) return;
        const nodes = [...records.current.values()];
        if (!nodes.length) return;
        const anchor = 150;
        const bounds = nodes.map((node) => ({
          node,
          rect: node.getBoundingClientRect(),
        }));
        if (
          bounds[0].rect.top > innerHeight ||
          bounds.at(-1)!.rect.bottom < anchor
        )
          return;
        const current =
          bounds.find(
            (item) => item.rect.top <= anchor && item.rect.bottom > anchor,
          ) || bounds.find((item) => item.rect.top >= anchor);
        if (current) setSelected(current.node.dataset.log || "");
      });
    };
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [project.id]);
  useEffect(() => {
    const nav = versions.current;
    const button = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (nav && button)
      nav.scrollTo({
        top: button.offsetTop - nav.offsetTop - 12,
        behavior: "instant",
      });
  }, [selected]);
  if (!log)
    return (
      <p className="muted-copy">
        {linkedLogId ? "연결된 개발 기록을 찾을 수 없습니다. " : ""}등록된
        개발일지가 없습니다.
      </p>
    );
  return (
    <div className="development-journey">
      {linkedLogId && !linked && (
        <p className="record-link-missing" role="status">
          연결된 개발 기록을 찾을 수 없습니다. 아래에서 남아 있는 기록을
          확인하세요.
        </p>
      )}
      <div className="journey-desktop">
        <nav
          className="journey-versions"
          ref={versions}
          aria-label="개발 버전 선택"
        >
          {logs.map((l, i) => (
            <button
              key={l.id}
              aria-current={log.id === l.id ? "true" : undefined}
              onClick={() => {
                setSelected(l.id);
                setCompare("");
                requestAnimationFrame(() =>
                  records.current
                    .get(l.id)
                    ?.scrollIntoView({ block: "start", behavior: "instant" }),
                );
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
        <div className="journey-records">
          {logs.map((item) => {
            const itemScreen = mediaFor(project).findIndex(
              (s) => s.version && s.version === item.version,
            );
            return (
              <article
                className="journey-record"
                key={item.id}
                data-log={item.id}
                data-linked={item.id === linked?.id ? "true" : undefined}
                aria-label={(item.version || item.date) + " 개발 기록"}
                ref={(node) => {
                  if (node) records.current.set(item.id, node);
                  else records.current.delete(item.id);
                }}
              >
                {item.id === linked?.id && (
                  <p className="record-link-label">
                    {project.name} · 연결된 개발 기록
                  </p>
                )}
                <LogContent log={item} expanded={item.id === linked?.id} />
                {itemScreen >= 0 && (
                  <ProjectMedia project={project} index={itemScreen} />
                )}
                <label className="log-select">
                  다른 기록과 비교
                  <select
                    aria-label="개발 기록 비교"
                    value={item.id === compareAt ? compare : ""}
                    onChange={(e) => {
                      setCompare(e.target.value);
                      setCompareAt(item.id);
                    }}
                  >
                    <option value="">비교할 기록 선택</option>
                    {logs
                      .filter((l) => l.id !== item.id)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.date} / {l.version || "버전 미지정"} /{" "}
                          {l.title || "개발 기록"}
                        </option>
                      ))}
                  </select>
                </label>
                {comparison && item.id === compareAt && (
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
                              {item.date} · {item.version}
                            </small>
                            <p>{get(item) || "기록 없음"}</p>
                          </article>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
      <div className="journey-mobile">
        {logs.map((l, i) => (
          <details
            key={l.id}
            data-log={l.id}
            data-linked={l.id === linked?.id ? "true" : undefined}
            open={
              l.id === linked?.id || (!linked && i === 0) ? true : undefined
            }
          >
            <summary>
              {l.id === linked?.id && (
                <span className="record-link-label">
                  {project.name} · 연결된 개발 기록
                </span>
              )}
              <small>
                {l.date} · {l.version || "버전 미지정"}
              </small>
              <strong>{l.title || l.task || "개발 기록"}</strong>
            </summary>
            <LogContent log={l} expanded={l.id === linked?.id} />
          </details>
        ))}
      </div>
    </div>
  );
}
