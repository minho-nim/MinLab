import test from "node:test";
import assert from "node:assert/strict";
import { catalogProjects } from "../data/projectCatalog";
import {
  selectHomeProjects,
  orderPortfolioProjects,
  primaryProjectIds,
} from "./homeProjects";
const base = catalogProjects()[0];
const app = (id: string, category: string, screen = false) => ({
  ...base,
  id,
  name: id,
  category,
  liveUrl: "https://example.com/" + id,
  screen,
});
test("home mixes real app and game screens before filling different categories in stored order", () => {
  const projects = [
    app("utility", "업무"),
    app("game-one", "게임", true),
    app("game-two", "게임", true),
    app("fitness", "운동", true),
    app("calendar", "일정"),
  ];
  const result = selectHomeProjects(
    projects,
    (p) => Boolean((p as (typeof projects)[0]).screen),
    4,
  );
  assert.deepEqual(
    result.map((p) => p.id),
    ["game-one", "fitness", "utility", "calendar"],
  );
  assert.deepEqual(
    projects.map((p) => p.id),
    ["utility", "game-one", "game-two", "fitness", "calendar"],
  );
  assert.equal(result[0], projects[1]);
});
test("hidden, archived and record-only entries stay out of the home while remaining in the source archive", () => {
  const projects = [
    { ...app("hidden", "게임", true), visible: false },
    { ...app("old", "운동", true), archived: true },
    { ...app("record", "기록"), liveUrl: "" },
    app("live", "생활"),
  ];
  assert.deepEqual(
    selectHomeProjects(
      projects,
      (p) => Boolean((p as (typeof projects)[0]).screen),
      6,
    ).map((p) => p.id),
    ["live"],
  );
  assert.equal(projects.length, 4);
});
test("missing screens or games do not create placeholders or duplicate projects", () => {
  const projects = [app("one", "업무"), app("two", "업무")];
  assert.deepEqual(
    selectHomeProjects(projects, () => false, 6).map((p) => p.id),
    ["one", "two"],
  );
  assert.deepEqual(
    selectHomeProjects([], () => false, 4),
    [],
  );
  assert.deepEqual(
    selectHomeProjects(projects, () => true, 0),
    [],
  );
});
test("the requested project sequence leads the home without changing stored order or hidden choices", () => {
  const ids = [
    "proj-minlab-ai-office",
    "proj-minially",
    "proj-crossroads-ai-verdict",
    "proj-1792978415000",
  ];
  const projects = [
    app("other", "게임", true),
    ...ids
      .slice()
      .reverse()
      .map((id) => app(id, "생활", true)),
  ];
  const before = JSON.stringify(projects);
  assert.deepEqual(
    selectHomeProjects(projects, () => true, 4).map((p) => p.id),
    ids,
  );
  assert.equal(JSON.stringify(projects), before);
  projects.find((p) => p.id === ids[0])!.visible = false;
  assert.ok(
    !selectHomeProjects(projects, () => true, 4).some((p) => p.id === ids[0]),
  );
});

test("visitor order starts with the six requested projects and preserves all other positions and source data", () => {
  const projects = [
    app("proj-musclemap", "운동"),
    app("proj-snake-race", "게임"),
    app("other-one", "생활"),
    app("proj-crossroads-ai-verdict", "게임"),
    app("proj-minially", "일정"),
    app("other-two", "업무"),
    app("proj-1792978415000", "소비"),
    app("proj-minlab-ai-office", "AI"),
  ];
  const before = JSON.stringify(projects);
  assert.deepEqual(
    orderPortfolioProjects(projects).map((p) => p.id),
    [
      "proj-minlab-ai-office",
      "proj-minially",
      "proj-crossroads-ai-verdict",
      "proj-1792978415000",
      "proj-snake-race",
      "proj-musclemap",
      "other-one",
      "other-two",
    ],
  );
  assert.equal(JSON.stringify(projects), before);
  assert.deepEqual(orderPortfolioProjects([projects[2], projects[5]]), [
    projects[2],
    projects[5],
  ]);
});

test("only Minoffia and Minially are representative projects", () => {
  assert.deepEqual(primaryProjectIds, [
    "proj-minlab-ai-office",
    "proj-minially",
  ]);
  const projects = [
    app("proj-musclemap", "운동", true),
    app("proj-minially", "일정", true),
    app("proj-minlab-ai-office", "AI", true),
  ];
  assert.deepEqual(
    selectHomeProjects(projects, () => true, 2).map((p) => p.id),
    [...primaryProjectIds],
  );
});
