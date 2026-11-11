import test from "node:test";
import assert from "node:assert/strict";
import { catalogProjects } from "../data/projectCatalog";
import { selectHomeProjects } from "./homeProjects";
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
