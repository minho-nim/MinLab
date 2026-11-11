import test from "node:test";
import assert from "node:assert/strict";
import { catalogProjects } from "../data/projectCatalog";
import { relatedProjects, nextProject } from "./projectRelations";
import { contentChanges } from "./contentDraft";
import { queryProjects, defaultQuery } from "./archiveQuery";
import { parseImportJson } from "./storage";
import { resolveProjectMedia } from "./projectMedia";
const p = catalogProjects()[0];
test("next project uses visible stored order and ends at archive", () => {
  const all = [
    { ...p, id: "a" },
    { ...p, id: "hidden", visible: false },
    { ...p, id: "b" },
  ];
  assert.equal(nextProject(all[0], all)?.id, "b");
  assert.equal(nextProject(all[2], all), undefined);
  assert.equal(nextProject({ ...p, id: "absent" }, all), undefined);
});
test("related projects do not invent relevance from a shared generic framework", () => {
  const current = {
    ...p,
    id: "a",
    category: "alpha",
    description: "전혀다른 문제",
    techStack: ["React"],
    keyFeatures: [],
  };
  const other = {
    ...current,
    id: "b",
    category: "beta",
    description: "관련없는 내용",
  };
  assert.deepEqual(relatedProjects(current, [current, other]), []);
  assert.equal(
    relatedProjects({ ...current, relatedProjectIds: ["b"] }, [other])[0].id,
    "b",
  );
  const same = { ...other, id: "same", category: "alpha" };
  assert.equal(relatedProjects(current, [other, same])[0].id, "same");
});
test("feature keywords are searchable and filterable without mutating source order", () => {
  const project = { ...p, keyFeatures: ["specific-function"] };
  const all = [project];
  assert.equal(
    queryProjects(all, { ...defaultQuery, q: "specific-function" }).length,
    1,
  );
  assert.equal(
    queryProjects(all, { ...defaultQuery, tag: "specific-function" }).length,
    1,
  );
  assert.equal(all[0], project);
});
test("import rejects duplicate project IDs and preserves optional version-bound screens", () => {
  assert.equal(parseImportJson(JSON.stringify([p, p])).success, false);
  const value = {
    ...p,
    screenshots: [
      {
        id: "screen",
        url: "https://example.com/app.webp",
        label: "실제 화면",
        version: "1.0.0",
      },
    ],
    visible: false,
  };
  const parsed = parseImportJson(JSON.stringify([value]));
  assert.equal(parsed.success, true);
  assert.equal(parsed.projects![0].visible, false);
  assert.equal(resolveProjectMedia(parsed.projects![0])[0].version, "1.0.0");
});
test("draft review distinguishes added, removed, edited and ordered records", () => {
  const before = [
    { ...p, id: "one" },
    { ...p, id: "two" },
  ];
  const after = [
    { ...before[1], description: "edit" },
    { ...p, id: "three" },
  ];
  const diff = contentChanges(before, after);
  assert.deepEqual(
    diff.added.map((p) => p.id),
    ["three"],
  );
  assert.deepEqual(
    diff.removed.map((p) => p.id),
    ["one"],
  );
  assert.deepEqual(
    diff.changed.map((p) => p.id),
    ["two"],
  );
  assert.ok(diff.reordered);
  assert.deepEqual(before[1].workLogs, p.workLogs);
});
