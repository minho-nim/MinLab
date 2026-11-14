import test from "node:test";
import assert from "node:assert/strict";
import type { Project, WorkLog } from "../types";
import { capabilities, capabilityEvidence } from "./capabilityEvidence";
import { parseRoute, routeHash } from "./navigation";
const log = (id: string, content: string, date = "2026-01-01"): WorkLog => ({
  id,
  content,
  date,
  version: "1.0.0",
  title: id,
});
const project = (
  id: string,
  workLogs: WorkLog[],
  extra: Partial<Project> = {},
): Project => ({
  id,
  name: id,
  englishName: id,
  category: "생활",
  status: "개발 중",
  description: "",
  liveUrl: "",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  techStack: [],
  keyFeatures: [],
  workLogs,
  changelog: [],
  ...extra,
});
test("capability evidence uses the latest matching original record without modifying source", () => {
  const older = log("older", "화면 레이아웃 변경", "2025-01-01"),
    newest = log("newest", "앱 실행 구현", "2026-01-01");
  const data = [project("p", [newest, older])],
    before = JSON.stringify(data);
  const evidence = capabilityEvidence(data, 2);
  assert.equal(evidence[0].log, older);
  assert.equal(evidence[0].project, data[0]);
  assert.equal(evidence[0].excerpt.text, older.content);
  assert.equal(JSON.stringify(data), before);
  assert.equal(capabilityEvidence(data, 1)[0].log, newest);
});
test("hidden, archived and unmatched projects do not become proof; future plans alone are not proof", () => {
  const rows = [
    project("hidden", [log("h", "UI 화면 개선")], { visible: false }),
    project("archived", [log("a", "UI 화면 개선")], { archived: true }),
    project(
      "future",
      [{ ...log("f", "자료 정리"), nextSteps: "UI 화면 설계" }],
      { description: "UI 설계 역량" },
    ),
  ];
  assert.deepEqual(capabilityEvidence(rows, 2), []);
});
test("same-day records use recorded timestamps, show stored field labels and keep the project order/limit", () => {
  const a = { ...log("a", "테스트 이전"), createdAt: "2026-01-01T01:00:00Z" },
    b = {
      ...log("b", "내용"),
      testResult: "오류 재현과 검증 완료",
      createdAt: "2026-01-01T02:00:00Z",
    };
  const rows = Array.from({ length: 4 }, (_, i) => project(String(i), [a, b]));
  const result = capabilityEvidence(rows, 3);
  assert.deepEqual(
    result.map((x) => x.project.id),
    ["0", "1", "2"],
  );
  assert.equal(result[0].log, b);
  assert.equal(result[0].excerpt.label, "테스트 결과");
  assert.equal(result[0].excerpt.text, b.testResult);
  assert.equal(capabilities.length, 4);
});
test("deep links round-trip exact project/record IDs and leave old routes compatible", () => {
  const route = {
    view: "project" as const,
    projectId: "프로젝트/ ?#",
    logId: '기록/" ?#&한글',
  };
  assert.deepEqual(parseRoute(routeHash(route)), route);
  assert.deepEqual(parseRoute("#/projects/p"), {
    view: "project",
    projectId: "p",
  });
  assert.deepEqual(parseRoute("#/projects/p/manage?log=other"), {
    view: "manage",
    projectId: "p",
  });
  assert.deepEqual(parseRoute("#/projects/%E0%A4"), { view: "archive" });
});

test("capabilities explain matching main projects first without filling their space with unrelated projects", () => {
  const ids = [
    "proj-minlab-ai-office",
    "proj-minially",
    "proj-1792978415000",
    "proj-crossroads-ai-verdict",
  ];
  const data = [
    project("other", [log("other-log", "화면 설계")]),
    ...ids
      .slice()
      .reverse()
      .map((id) => project(id, [log(id + "-log", "화면 설계")])),
  ];
  const before = JSON.stringify(data);
  assert.deepEqual(
    capabilityEvidence(data, 2).map((e) => e.project.id),
    [ids[1], ids[0]],
  );
  assert.equal(JSON.stringify(data), before);
  assert.deepEqual(
    capabilityEvidence(
      [data[0], project(ids[0], [log("unmatched", "자료 정리")])],
      2,
    ).map((e) => e.project.id),
    ["other"],
  );
});
