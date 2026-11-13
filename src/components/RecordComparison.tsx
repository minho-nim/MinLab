import { useEffect, useRef, useState } from "react";
import type { WorkLog } from "../types";

const fields: [string, (record: WorkLog) => string | undefined][] = [
  ["변경 사항", (record) => record.content || record.task],
  ["수정 이유", (record) => record.reason || record.issues],
  ["해결 방법", (record) => record.solution],
  ["테스트 결과", (record) => record.testResult],
  ["다음 작업", (record) => record.nextSteps],
];
const normalized = (value: string | undefined) =>
  (value || "").replace(/\r\n?/g, "\n").trim();

export function RecordComparison({
  current,
  logs,
  value,
  onChange,
}: {
  current: WorkLog;
  logs: WorkLog[];
  value: string;
  onChange: (id: string) => void;
}) {
  const picker = useRef<HTMLSelectElement>(null);
  const [differentOnly, setDifferentOnly] = useState(false);
  const [swapped, setSwapped] = useState(false);
  const other = logs.find(
    (record) => record.id === value && record.id !== current.id,
  );
  useEffect(() => {
    setDifferentOnly(false);
    setSwapped(false);
  }, [value, current.id]);
  if (logs.length < 2) return null;
  const pair = other ? (swapped ? [other, current] : [current, other]) : [];
  const shown = fields.filter(
    ([, get]) =>
      !differentOnly ||
      (other && normalized(get(current)) !== normalized(get(other))),
  );
  return (
    <div className="record-comparison-picker">
      <label className="log-select">
        다른 기록과 비교
        <select
          ref={picker}
          aria-label="개발 기록 비교"
          value={other ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">비교할 기록 선택</option>
          {logs
            .filter((record) => record.id !== current.id)
            .map((record) => (
              <option key={record.id} value={record.id}>
                {record.date} / {record.version || "버전 미지정"} /{" "}
                {record.title || record.task || "개발 기록"}
              </option>
            ))}
        </select>
      </label>
      {other && (
        <div className="version-comparison" aria-label="선택한 개발 기록 비교">
          <header className="comparison-heading">
            <h4>기록 비교</h4>
            <button
              onClick={() => {
                onChange("");
                picker.current?.focus({ preventScroll: true });
                picker.current?.scrollIntoView({
                  block: "nearest",
                  behavior: "instant",
                });
              }}
            >
              비교 닫기
            </button>
          </header>
          <div className="comparison-options">
            <button
              aria-pressed={differentOnly}
              onClick={() => setDifferentOnly(!differentOnly)}
            >
              다른 항목만 보기
            </button>
            <button aria-pressed={swapped} onClick={() => setSwapped(!swapped)}>
              순서 바꾸기
            </button>
          </div>
          <p className="comparison-note">
            기록된 텍스트를 비교합니다. 앞뒤 공백과 줄바꿈 형식만 다른 경우는
            같은 내용으로 봅니다.
          </p>
          <div className="comparison-record-headings">
            {pair.map((record) => (
              <article key={record.id}>
                <small>
                  {record.id === current.id ? "현재 기록" : "비교 기록"} ·{" "}
                  {record.date} · {record.version || "버전 미지정"}
                </small>
                <p>{record.title || record.task || "개발 기록"}</p>
              </article>
            ))}
          </div>
          {!shown.length && (
            <p className="comparison-equal" role="status">
              비교한 항목의 내용이 모두 같습니다.
            </p>
          )}
          {shown.map(([label, get]) => (
            <section key={label}>
              <h4>
                {label}
                <span className="comparison-field-state">
                  {normalized(get(current)) === normalized(get(other))
                    ? "동일"
                    : "내용 다름"}
                </span>
              </h4>
              <div>
                {pair.map((record) => (
                  <article key={record.id}>
                    <small>
                      {record.id === current.id ? "현재 기록" : "비교 기록"} ·{" "}
                      {record.date} · {record.version || "버전 미지정"}
                    </small>
                    <p>{get(record) || "기록 없음"}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
