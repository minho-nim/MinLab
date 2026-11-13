import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Project, WorkLog } from "../types";
import { LogContent } from "./VersionJournal";
import { mediaFor, ProjectMedia } from "./ProjectMedia";
import { RecordComparison } from "./RecordComparison";
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
  const [query, setQuery] = useState("");
  const search = useRef<HTMLInputElement>(null);
  const term = query.trim().toLowerCase();
  const visible = term
    ? logs.filter((item) =>
        [
          item.title,
          item.task,
          item.version,
          item.version ? "v" + item.version : "",
          item.date,
          item.content,
          item.reason,
          item.issues,
          item.solution,
          item.testResult,
          item.nextSteps,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : logs;
  const linked = logs.find((item) => item.id === linkedLogId);
  const [selected, setSelected] = useState(linked?.id || logs[0]?.id || "");
  const [compare, setCompare] = useState("");
  const [compareAt, setCompareAt] = useState(logs[0]?.id || "");
  useLayoutEffect(() => {
    setQuery("");
    setCompare("");
    if (linked) setSelected(linked.id);
  }, [linked?.id, linkedLogId]);
  const log =
    visible.find((item) => item.id === selected) || visible[0] || logs[0];
  const versions = useRef<HTMLElement>(null);
  const records = useRef(new Map<string, HTMLElement>());
  const recordList = useRef<HTMLDivElement>(null);
  const mobileList = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!matchMedia("(min-width:900px)").matches) return;
        const nodes = Array.from(
          recordList.current?.querySelectorAll<HTMLElement>(
            ".journey-record",
          ) || [],
        );
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
  }, [project.id, query]);
  useEffect(() => {
    const nav = versions.current;
    const button = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (nav && button)
      nav.scrollTo({
        top: button.offsetTop - nav.offsetTop - 12,
        behavior: "instant",
      });
  }, [log?.id, query]);
  useEffect(() => {
    const media = matchMedia("(min-width:900px)");
    const reveal = () => {
      if (media.matches || !compare) return;
      const node = Array.from(
        mobileList.current?.querySelectorAll<HTMLDetailsElement>(
          "details[data-log]",
        ) || [],
      ).find((item) => item.dataset.log === compareAt);
      if (node) node.open = true;
    };
    reveal();
    media.addEventListener("change", reveal);
    return () => media.removeEventListener("change", reveal);
  }, [compare, compareAt]);
  const resetSearch = () => {
    setQuery("");
    search.current?.focus({ preventScroll: true });
  };
  const comparison = (item: WorkLog) => (
    <RecordComparison
      current={item}
      logs={logs}
      value={item.id === compareAt ? compare : ""}
      onChange={(id) => {
        setCompare(id);
        setCompareAt(item.id);
      }}
    />
  );
  if (!log)
    return (
      <p className="muted-copy">
        {linkedLogId ? "이 개발일지를 찾을 수 없습니다. " : ""}등록된 개발일지가
        없습니다.
      </p>
    );
  return (
    <div className="development-journey">
      {linkedLogId && !linked && (
        <p className="record-link-missing" role="status">
          이 개발일지를 찾을 수 없습니다. 아래 목록에서 다른 기록을 선택해
          주세요.
        </p>
      )}
      <div className="journey-tools">
        <label>
          기록 찾기
          <input
            ref={search}
            type="search"
            aria-label="개발일지 검색"
            placeholder="제목, 버전, 날짜, 작업 내용으로 검색"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCompare("");
            }}
          />
        </label>
        {query && visible.length > 0 && (
          <button onClick={resetSearch}>검색 초기화</button>
        )}
        <p role="status">
          총 {logs.length}개 중 {visible.length}개의 기록
        </p>
      </div>
      {!visible.length ? (
        <div className="journey-empty">
          <p>맞는 개발일지가 없습니다.</p>
          <button onClick={resetSearch}>검색 초기화</button>
        </div>
      ) : (
        <>
          <div className="journey-desktop">
            <nav
              className="journey-versions"
              ref={versions}
              aria-label="개발 버전 선택"
            >
              {visible.map((l) => (
                <button
                  key={l.id}
                  aria-current={log.id === l.id ? "true" : undefined}
                  onClick={() => {
                    setSelected(l.id);
                    setCompare("");
                    requestAnimationFrame(() =>
                      records.current.get(l.id)?.scrollIntoView({
                        block: "start",
                        behavior: "instant",
                      }),
                    );
                  }}
                >
                  <small>
                    {l.date} · {l.version || "버전 미지정"}
                    {l.id === logs[0]?.id ? " · 최신 기록" : ""}
                  </small>
                  <strong>{l.title || l.task || "개발 기록"}</strong>
                </button>
              ))}
            </nav>
            <div className="journey-records" ref={recordList}>
              {visible.map((item) => {
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
                        {project.name} · 선택한 개발일지
                      </p>
                    )}
                    <LogContent log={item} expanded={item.id === linked?.id} />
                    {itemScreen >= 0 && (
                      <ProjectMedia
                        project={project}
                        index={itemScreen}
                        zoomable
                      />
                    )}
                    {comparison(item)}
                  </article>
                );
              })}
            </div>
          </div>
          <div className="journey-mobile" ref={mobileList}>
            {visible.map((l, i) => (
              <details
                key={l.id}
                data-log={l.id}
                data-linked={l.id === linked?.id ? "true" : undefined}
                open={
                  l.id === linked?.id || ((!linked || !!term) && i === 0)
                    ? true
                    : undefined
                }
              >
                <summary>
                  {l.id === linked?.id && (
                    <span className="record-link-label">
                      {project.name} · 선택한 개발일지
                    </span>
                  )}
                  <small>
                    {l.date} · {l.version || "버전 미지정"}
                  </small>
                  <strong>{l.title || l.task || "개발 기록"}</strong>
                </summary>
                <LogContent log={l} expanded={l.id === linked?.id} />
                {comparison(l)}
              </details>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
