import test from "node:test";
import assert from "node:assert/strict";
import { projectCaseStudies } from "../data/projectCaseStudies";
import { bundledScreens } from "./projectMedia";
import { publicProject } from "./publicProjects";
import { catalogProjects } from "../data/projectCatalog";
import snapshot from "../data/archiveSnapshot.json";
import { parseImportJson } from "./storage";
import { orderPortfolioProjects, parsePortfolioOrder } from "./homeProjects";

test("MINOVA scenes use five different genuine captures with action, outcome and design intent", () => {
  const scenes = bundledScreens["proj-crossroads-ai-verdict"];
  assert.equal(scenes.length, 5);
  assert.equal(new Set(scenes.map((s) => s.src)).size, 5);
  assert.ok(scenes.every((s) => s.action && s.outcome && s.rationale));
  assert.match(scenes[4].notice!, /자동 진행/);
  assert.match(
    projectCaseStudies["proj-crossroads-ai-verdict"].remaining,
    /모든 분기/,
  );
  assert.equal(
    projectCaseStudies["proj-crossroads-ai-verdict"].process!.length,
    3,
  );
});
test("public Valumin naming changes presentation only and retains historical records and backup compatibility", () => {
  const p = {
    ...catalogProjects().find((p) => p.id === "proj-1792978415000")!,
    name: "WorthIt",
    workLogs: [
      {
        id: "history",
        date: "2026-10-26",
        title: "WorthIt 이전 개발명",
        content: "원본 기록",
      },
    ],
  };
  const before = JSON.stringify(p);
  const view = publicProject(p);
  assert.equal(view.name, "Valumin");
  assert.equal(view.englishName, "Valumin");
  assert.equal(view.workLogs, p.workLogs);
  assert.equal(JSON.stringify(p), before);
  assert.equal(
    parseImportJson(JSON.stringify([p])).projects![0].workLogs[0].title,
    p.workLogs[0].title,
  );
  assert.ok(bundledScreens[p.id].some((s) => s.notice?.includes("WorthIt")));
});
test("only known default public copy is shortened; custom descriptions and project IDs survive", () => {
  const original = snapshot.find((p) => p.id === "proj-1792485558773")!;
  const view = publicProject(original as any);
  assert.equal(view.name, "MinLab");
  assert.equal(view.id, original.id);
  const custom = {
    ...original,
    name: "사용자 제목",
    description: "사용자가 직접 적은 긴 소개",
  };
  assert.equal(publicProject(custom as any).description, custom.description);
  assert.equal(publicProject(custom as any).name, custom.name);
  assert.equal(
    projectCaseStudies["proj-1792645542246"].implementation.includes("구상 중"),
    true,
  );
});
test("an explicit administrator order wins without changing the saved source array", () => {
  const projects = catalogProjects();
  const before = JSON.stringify(projects);
  const order = [projects.at(-1)!.id, projects[0].id];
  assert.deepEqual(parsePortfolioOrder(JSON.stringify(order)), order);
  assert.equal(parsePortfolioOrder('["same","same"]'), undefined);
  assert.deepEqual(
    orderPortfolioProjects(projects, order)
      .slice(0, 2)
      .map((p) => p.id),
    order,
  );
  assert.equal(JSON.stringify(projects), before);
});
