import { projectDestination } from "../utils/projectDestinations";
import { useState, useEffect, useRef } from "react";
import type { Project } from "../types";
import { routeHash } from "../utils/navigation";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
import { safeRead, safeWrite } from "../utils/archiveQuery";
import { capabilities, capabilityEvidence } from "../utils/capabilityEvidence";
const introKey = "minlab_about_intro_v1";
const defaultIntro =
  "통신·데이터센터 구축 프로젝트에서 일정과 공정, 품질, 사업 관리를 맡아왔습니다. 개인 프로젝트는 AI와 대화하며 만듭니다. 직접 써 보고 필요한 기능을 더하거나 불편한 부분을 고칩니다.";
export function AboutPage({
  projects,
  editing = false,
  introOverride,
  onDraft,
}: {
  projects: Project[];
  editing?: boolean;
  introOverride?: string | null;
  onDraft?: (value: string) => void;
}) {
  const [intro, setIntro] = useState(() =>
    safeRead(
      editing ? introKey + "_draft" : introKey,
      safeRead(introKey, defaultIntro),
    ),
  );
  useEffect(() => {
    if (introOverride != null) setIntro(introOverride);
  }, [introOverride]);
  const [capability, setCapability] = useState(() =>
    Math.max(
      0,
      capabilities.findIndex(
        (item) =>
          !editing &&
          item.id ===
            new URLSearchParams(location.hash.split("?")[1]).get("capability"),
      ),
    ),
  );
  useEffect(() => {
    if (editing) return;
    const restore = () => {
      if (location.hash.split("?")[0] !== "#/about") return;
      const id = new URLSearchParams(location.hash.split("?")[1]).get(
        "capability",
      );
      setCapability(
        Math.max(
          0,
          capabilities.findIndex((item) => item.id === id),
        ),
      );
    };
    addEventListener("hashchange", restore);
    return () => removeEventListener("hashchange", restore);
  }, [editing]);
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
  const evidence = capabilityEvidence(projects, capability);
  const [introReview, setIntroReview] = useState(false);
  const [saved, setSaved] = useState(false);
  const experiences = [
    {
      label: "현장 경험",
      title: "통신·데이터센터 프로젝트를 관리했습니다.",
      description: "일정과 공정, 품질, 사업 관리를 맡았습니다.",
      match: (p: Project) => /업무|자동화/.test(p.category),
    },
    {
      label: "개인 프로젝트",
      title: "일할 때나 일상에서 쓸 도구를 만듭니다.",
      description: "필요한 기능부터 만들고, 사용하면서 불편한 부분을 고칩니다.",
      match: (p: Project) => /게임|건강|운동|일정/.test(p.category),
    },
    {
      label: "AI 활용",
      title: "개발할 때 AI의 도움을 받습니다.",
      description:
        "기획을 정리하고 코드를 작성하거나 테스트할 때 활용합니다. 작업 내용과 사용한 프롬프트를 함께 남깁니다.",
      match: (p: Project) =>
        p.workLogs.length > 0 || Boolean(p.promptHistory?.length),
    },
  ];
  return (
    <div className="about-page">
      <header className="page-heading">
        <p className="eyebrow">소개</p>
        <h1>
          해온 일과
          <br />
          <em>만들고 있는 것들.</em>
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
                if (safeRead(introKey + "_draft") === intro) onDraft?.(intro);
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
                    <a {...projectDestination(p.id)} key={p.id}>
                      {mediaFor(p).length > 0 && <ProjectMedia project={p} />}
                      <div>
                        <strong>{p.name} ↗</strong>
                        <p>{p.description}</p>
                        <small>
                          {p.workLogs.length
                            ? `${p.workLogs.length}개의 개발일지`
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
          <h2>메인 프로젝트에서 한 일</h2>
          <p>
            미노피아와 미니어리를 만들며 기획하고, 구현하고, 고친 내용을
            모았습니다.
          </p>
        </header>
        <div className="capability-layout">
          <nav aria-label="역량 선택">
            {capabilities.map((c, i) => (
              <button
                key={c.name}
                aria-pressed={capability === i}
                aria-controls="capability-evidence"
                onClick={() => {
                  setCapability(i);
                  if (!editing)
                    history.replaceState(
                      null,
                      "",
                      "#/about?" +
                        new URLSearchParams({ capability: c.id }).toString(),
                    );
                }}
              >
                {c.name} ↗
              </button>
            ))}
          </nav>
          <div>
            <h3>{capabilities[capability].name}</h3>
            <p>{capabilities[capability].description}</p>
            <div
              id="capability-evidence"
              className="capability-evidence"
              role="region"
              aria-label={capabilities[capability].name + " 관련 개발일지"}
            >
              {evidence.map(({ project: p, log, excerpt }) => (
                <article key={p.id} data-evidence-log={log.id}>
                  <a {...projectDestination(p.id)}>
                    <strong>{p.name} ↗</strong>
                  </a>
                  <p>{p.description}</p>
                  <p className="capability-record-title">
                    {log.title || log.task || "개발 기록"}
                  </p>
                  <small>
                    {log.date} · {log.version || "버전 미지정"}
                  </small>
                  {excerpt.label !== "수정 제목" && (
                    <div className="evidence-excerpt">
                      <small>{excerpt.label}</small>
                      <blockquote>{excerpt.text}</blockquote>
                    </div>
                  )}
                  <a
                    className="text-link"
                    data-record-link={log.id}
                    href={routeHash({
                      view: "project",
                      projectId: p.id,
                      logId: log.id,
                    })}
                  >
                    이 개발일지 읽기 ↗
                  </a>
                </article>
              ))}
              {!evidence.length && <p>이 분야에 등록된 개발일지가 없습니다.</p>}
            </div>
          </div>
        </div>
      </section>
      <div className="about-next">
        <p>프로젝트별로 만든 기능과 수정한 내용을 정리했습니다.</p>
        <a className="primary-link" href="#/development-log">
          개발일지 보기 ↗
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
