import { useState } from "react";
import type { Project } from "../types";
import { routeHash } from "../utils/navigation";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
import { safeRead, safeWrite } from "../utils/archiveQuery";
const introKey = "minlab_about_intro_v1";
const defaultIntro =
  "통신·데이터센터 프로젝트 관리 경험을 바탕으로, 일상과 현장의 문제를 웹앱과 게임으로 풀어갑니다. AI를 기획·개발·검증에 활용하며 실제로 만든 결과와 개선 과정을 기록합니다.";
export function AboutPage({
  projects,
  editing = false,
}: {
  projects: Project[];
  editing?: boolean;
}) {
  const [intro, setIntro] = useState(() => safeRead(introKey, defaultIntro));
  const [saved, setSaved] = useState(false);
  const experiences = [
    {
      label: "현장 경험",
      title: "현장에서 문제를 발견합니다.",
      description:
        "통신·데이터센터 프로젝트 관리 경험. 반복되는 업무와 복잡한 정보를 정리하는 데서 출발합니다.",
      match: (p: Project) => /업무|자동화/.test(p.category),
    },
    {
      label: "독립 개발",
      title: "직접 만들며 답을 찾아갑니다.",
      description:
        "독립적인 웹앱·게임 개발. 필요한 기능을 작게 구현하고 사용 흐름을 다듬습니다.",
      match: (p: Project) => /게임|건강|운동|일정/.test(p.category),
    },
    {
      label: "AI 활용",
      title: "AI와 함께 시도하고, 기록합니다.",
      description:
        "기획부터 개발과 검증까지 AI를 활용합니다. 프로젝트별 개발일지와 작업 프롬프트에 실제 과정을 남깁니다.",
      match: (p: Project) =>
        p.workLogs.length > 0 || Boolean(p.promptHistory?.length),
    },
  ];
  return (
    <div className="about-page">
      <header className="page-heading">
        <p className="eyebrow">소개</p>
        <h1>
          만든 것들이
          <br />
          <em>나를 설명합니다.</em>
        </h1>
        {editing ? (
          <div className="about-editor">
            <label htmlFor="about-intro">소개 문구 (이 브라우저에 저장)</label>
            <textarea
              id="about-intro"
              value={intro}
              onChange={(e) => {
                setIntro(e.target.value);
                setSaved(false);
              }}
            />
            <button
              className="primary-link"
              onClick={() => {
                safeWrite(introKey, intro);
                setSaved(safeRead(introKey) === intro);
              }}
            >
              소개 저장 ↗
            </button>
            <button
              className="text-link"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify({ version: 1, intro }, null, 2)],
                  { type: "application/json" },
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "minlab-about.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              소개 JSON 내보내기
            </button>
            <label className="text-link">
              소개 JSON 가져오기
              <input
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const value = JSON.parse(await file.text());
                    if (value.version !== 1 || typeof value.intro !== "string")
                      throw Error();
                    setIntro(value.intro);
                    setSaved(false);
                  } catch {
                    alert("올바른 소개 JSON 파일이 아닙니다.");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <p role="status">
              {saved
                ? "저장되었습니다."
                : "소개 백업은 프로젝트 JSON과 별도로 내보내 주세요."}
            </p>
          </div>
        ) : (
          <p className="about-intro">{intro}</p>
        )}
      </header>
      <section className="about-timeline" aria-label="경험과 성장 과정">
        {experiences.map((item) => (
          <article key={item.label}>
            <div className="timeline-marker">
              <span>{item.label}</span>
              <i />
            </div>
            <div>
              <p className="eyebrow">{item.label}</p>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <div className="related-skills">
                {projects
                  .filter(item.match)
                  .slice(0, 2)
                  .map((p) => (
                    <a
                      href={routeHash({ view: "project", projectId: p.id })}
                      key={p.id}
                    >
                      {mediaFor(p).length > 0 && <ProjectMedia project={p} />}
                      <div>
                        <strong>{p.name} ↗</strong>
                        <p>{p.description}</p>
                        <small>
                          {p.workLogs.length
                            ? `${p.workLogs.length}개의 실제 개발 기록`
                            : p.category}
                        </small>
                      </div>
                    </a>
                  ))}
              </div>
            </div>
          </article>
        ))}
      </section>
      <div className="about-next">
        <p>
          현장의 문제를 발견하는 경험에서, 직접 만들고 개선하는 기록으로
          이어갑니다.
        </p>
        <a className="primary-link" href="#/development-log">
          실제 개발 과정 읽어보기 ↗
        </a>
      </div>
    </div>
  );
}
