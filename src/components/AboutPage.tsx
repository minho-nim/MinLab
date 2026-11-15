import {
  projectDestination,
  projectLinkLabel,
} from "../utils/projectDestinations";
import { useState, useEffect, useRef } from "react";
import type { Project } from "../types";
import { routeHash } from "../utils/navigation";
import { ProjectMedia, mediaFor } from "./ProjectMedia";
import { safeRead, safeWrite } from "../utils/archiveQuery";
import { capabilities, capabilityEvidence } from "../utils/capabilityEvidence";
import { primaryProjectIds } from "../utils/homeProjects";
import { motionAllowed } from "../utils/visualMotion";
const aiWork = [
  {
    title: "직접 정한 기준",
    description:
      "미노피아는 배정·실행·승인을 구분하고, 미니어리는 달력에서 바로 일정과 할 일을 등록하도록 방향을 정했습니다.",
    capability: "planning",
    action: "기획 기준과 기록 보기",
  },
  {
    title: "AI에 맡긴 일",
    description:
      "정리한 요구사항을 바탕으로 화면과 기능을 구현하도록 요청합니다. 오류가 나면 어떤 조작에서 발생했는지 설명하고 수정을 요청합니다.",
    capability: "development",
    action: "구현한 기록 보기",
  },
  {
    title: "결과를 검토한 방식",
    description:
      "직접 써 보고 오류를 고친 기록을 남깁니다. 미니어리의 등록·설정 오류처럼 다시 확인한 내용과 아직 확인하지 못한 내용을 구분합니다.",
    capability: "validation",
    action: "검증과 개선 기록 보기",
  },
] as const;
const introKey = "minlab_about_intro_v1";
const defaultIntro =
  "통신·데이터센터 구축 프로젝트에서 일정과 공정, 품질, 사업 관리를 맡아왔습니다. 미노피아와 미니어리는 AI와 대화하며 만듭니다. 직접 써 보고 필요한 기능을 더하거나 불편한 부분을 고칩니다.";
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
  const capabilityHeading = useRef<HTMLHeadingElement>(null);
  const chooseCapability = (index: number, reveal = false) => {
    if (index < 0 || index >= capabilities.length) return;
    setCapability(index);
    if (!editing)
      history.replaceState(
        null,
        "",
        "#/about?" +
          new URLSearchParams({
            capability: capabilities[index].id,
          }).toString(),
      );
    if (reveal)
      requestAnimationFrame(() => {
        capabilityHeading.current?.focus({ preventScroll: true });
        capabilityHeading.current?.scrollIntoView({
          block: "start",
          behavior: motionAllowed() ? "smooth" : "instant",
        });
      });
  };
  const [introReview, setIntroReview] = useState(false);
  const [saved, setSaved] = useState(false);
  const experiences = [
    {
      label: "현장 경험",
      title: "통신·데이터센터 프로젝트를 관리했습니다.",
      description:
        "일정과 공정, 품질, 사업 관리를 맡았습니다. 반복해서 옮기던 문서 정보를 정리하는 업무 자동화 도구로 연결했습니다.",
      match: (p: Project) => p.id === "risk-assessment-workplan-automation",
    },
    {
      label: "메인 프로젝트",
      title: "미노피아와 미니어리를 만들고 있습니다.",
      description:
        "미노피아에서는 AI에게 맡긴 일과 결과를 확인하고, 미니어리에서는 일정과 할 일을 관리합니다.",
      match: (p: Project) => primaryProjectIds.some((id) => id === p.id),
    },
    {
      label: "AI 활용",
      title: "AI와 만들고, 직접 확인합니다.",
      description:
        "무엇을 만들지 정하고, 구현을 요청한 뒤, 돌아온 결과를 검토합니다.",
      match: null,
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
              {item.match ? (
                <div className="related-skills">
                  {projects
                    .filter(item.match)
                    .slice(0, 2)
                    .map((p) => (
                      <a {...projectDestination(p.id)} key={p.id}>
                        {mediaFor(p).length > 0 && <ProjectMedia project={p} />}
                        <div>
                          <strong>{p.name} ↗</strong>
                          <small>{projectLinkLabel(p.id)}</small>
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
              ) : (
                <dl className="capability-narrative about-ai-work">
                  {aiWork.map((work) => (
                    <div key={work.title}>
                      <dt>{work.title}</dt>
                      <dd>{work.description}</dd>
                      <dd>
                        <button
                          type="button"
                          className="text-link"
                          aria-controls="capability-evidence"
                          onClick={() =>
                            chooseCapability(
                              capabilities.findIndex(
                                (c) => c.id === work.capability,
                              ),
                              true,
                            )
                          }
                        >
                          {work.action} ↘
                        </button>
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
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
                onClick={() => chooseCapability(i)}
              >
                {c.name} ↗
              </button>
            ))}
          </nav>
          <div>
            <h3 ref={capabilityHeading} tabIndex={-1}>
              {capabilities[capability].name}
            </h3>
            <p>{capabilities[capability].description}</p>
            <div
              id="capability-evidence"
              className="capability-evidence"
              role="region"
              aria-label={capabilities[capability].name + " 관련 개발일지"}
            >
              {evidence.map(({ project: p, log, excerpt, narrative }) => (
                <article key={p.id} data-evidence-log={log.id}>
                  <a {...projectDestination(p.id)}>
                    <strong>{p.name} ↗</strong>
                    <small>{projectLinkLabel(p.id)}</small>
                  </a>
                  <p>{p.description}</p>
                  {narrative && (
                    <dl className="capability-narrative">
                      {[
                        ["다룬 문제", narrative.problem],
                        ["정한 기준", narrative.criterion],
                        ["구현·검토", narrative.work],
                      ].map(([label, text]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{text}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className="capability-record-title">
                    {log.title || log.task || "개발 기록"}
                  </p>
                  <small>
                    {log.date} · {log.version || "버전 미지정"}
                  </small>
                  {!narrative && excerpt.label !== "수정 제목" && (
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
