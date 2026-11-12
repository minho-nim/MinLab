import type { Project, WorkLog } from "../types";

export const capabilities = [
  {
    id: "planning",
    name: "기획 및 문제 정의",
    description: "요구사항을 정리하고 기능을 설계한 기록입니다.",
    match: /요구사항|문제 정의|기획|요구|설계/,
  },
  {
    id: "development",
    name: "구현 및 개발",
    description: "기능을 추가하거나 수정한 기록입니다.",
    match: /구현|개발|추가|연동/,
  },
  {
    id: "experience",
    name: "UX/UI 설계",
    description: "화면 구성과 사용 흐름을 손본 기록입니다.",
    match: /UX|UI|화면|사용성|레이아웃/i,
  },
  {
    id: "validation",
    name: "검증 및 개선",
    description: "오류를 고치고 테스트한 기록입니다.",
    match: /테스트|검증|오류|수정/,
  },
] as const;

export function capabilityEvidence(projects: Project[], index: number) {
  const capability = capabilities[index] || capabilities[0];
  const source = (log: WorkLog) =>
    [
      ["변경 내용", log.content || log.task],
      ["수정 이유", log.reason || log.issues],
      ["해결 방법", log.solution],
      ["테스트 결과", log.testResult],
      ["수정 제목", log.title],
    ]
      .flatMap(([label, text]) =>
        (text || "")
          .split(/\n+/)
          .map((line) => ({ label: label!, text: line.trim() })),
      )
      .find((item) => item.text && capability.match.test(item.text));
  return projects
    .filter((p) => p.visible !== false && !p.archived)
    .flatMap((project) => {
      const logs = [...project.workLogs].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      );
      for (const log of logs) {
        const excerpt = source(log);
        if (excerpt) return [{ project, log, excerpt }];
      }
      return [];
    })
    .slice(0, 3);
}
