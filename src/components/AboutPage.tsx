import { useState, useEffect, useRef } from "react";
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
  const [intro, setIntro] = useState(() =>
    safeRead(
      editing ? introKey + "_draft" : introKey,
      safeRead(introKey, defaultIntro),
    ),
  );
  const [capability, setCapability] = useState(0);
  const journey = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const o = new IntersectionObserver(
      (es) => {
        for (const e of es)
          if (e.isIntersecting)
            setStage(Number((e.target as HTMLElement).dataset.stage));
      },
      { rootMargin: "-20% 0px -45% 0px" },
    );
    journey.current
      ?.querySelectorAll("[data-stage]")
      .forEach((n) => o.observe(n));
    return () => o.disconnect();
  }, []);
  const capabilities = [
    {
      name: "기획 및 문제 정의",
      description: "필요한 기능과 사용자 문제를 정리한 기록을 살펴보세요.",
      match: /요구사항|문제 정의|기획|요구|설계/,
    },
    {
      name: "구현 및 개발",
      description: "직접 구현한 기능과 개발 과정을 확인하세요.",
      match: /구현|개발|추가|연동/,
    },
    {
      name: "UX/UI 설계",
      description: "화면 구성과 사용 흐름을 개선한 사례입니다.",
      match: /UX|UI|화면|사용성|레이아웃/,
    },
    {
      name: "검증 및 개선",
      description: "테스트 결과와 수정 근거가 남아 있는 기록입니다.",
      match: /테스트|검증|오류|수정/,
    },
  ];
  const evidence = projects
    .flatMap((p) => {
      const log = p.workLogs.find((l) =>
        capabilities[capability].match.test(
          [l.title, l.content, l.reason, l.testResult].join(" "),
        ),
      );
      return log ? [{ project: p, log }] : [];
    })
    .slice(0, 3);
  const [introReview, setIntroReview] = useState(false);
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
                safeWrite(introKey + "_draft", intro);
                setSaved(safeRead(introKey + "_draft") === intro);
              }}
            >
              소개 초안 저장 ↗
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
            <button
              className="text-link"
              onClick={() => setIntroReview(!introReview)}
            >
              소개 변경 검토
            </button>
            {introReview && (
              <div>
                <p>현재: {safeRead(introKey, defaultIntro)}</p>
                <p>초안: {intro}</p>
                <button
                  className="primary-link"
                  onClick={() => {
                    if (
                      confirm(
                        "소개 초안을 이 브라우저의 방문자 화면에 적용할까요?",
                      )
                    ) {
                      safeWrite(introKey, intro);
                      setIntroReview(false);
                    }
                  }}
                >
                  소개 승인하고 적용
                </button>
              </div>
            )}
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
      <section
        className="about-timeline"
        ref={journey}
        aria-label="경험과 성장 과정"
      >
        {experiences.map((item, i) => (
          <article
            key={item.label}
            data-stage={i}
            className={stage === i ? "is-current-stage" : ""}
          >
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
      <section className="capability-explorer">
        <header>
          <p className="eyebrow">프로젝트로 살펴보는 역량</p>
          <h2>작업의 근거를 확인하세요.</h2>
        </header>
        <div className="capability-layout">
          <nav aria-label="역량 선택">
            {capabilities.map((c, i) => (
              <button
                key={c.name}
                aria-pressed={capability === i}
                onClick={() => setCapability(i)}
              >
                {c.name} ↗
              </button>
            ))}
          </nav>
          <div>
            <h3>{capabilities[capability].name}</h3>
            <p>{capabilities[capability].description}</p>
            <div className="capability-evidence">
              {evidence.map(({ project: p, log }) => (
                <article key={p.id}>
                  <a href={routeHash({ view: "project", projectId: p.id })}>
                    <strong>{p.name} ↗</strong>
                  </a>
                  <p>{log.title || log.task || "개발 기록"}</p>
                  <small>
                    {log.date} · {log.version || "버전 미지정"}
                  </small>
                  <a
                    className="text-link"
                    href={routeHash({ view: "records", projectId: p.id })}
                  >
                    근거가 된 개발일지 읽기 ↗
                  </a>
                </article>
              ))}
              {!evidence.length && (
                <p>연결할 수 있는 개발 기록이 아직 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      </section>
      <div className="about-next">
        <p>
          현장의 문제를 발견하는 경험에서, 직접 만들고 개선하는 기록으로
          이어갑니다.
        </p>
        <a className="primary-link" href="#/development-log">
          실제 개발 과정 읽어보기 ↗
        </a>
        <a
          className="text-link"
          href="https://github.com/minho-nim"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub ↗
        </a>
      </div>
    </div>
  );
}
