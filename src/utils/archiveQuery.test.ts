import assert from "node:assert/strict";
import test from "node:test";
import {
  archiveHash,
  defaultQuery,
  queryProjects,
  readArchiveQuery,
} from "./archiveQuery";
import { parseRoute, routeHash } from "./navigation";
import { catalogProjects } from "../data/projectCatalog";
test("search, tags, combined filters and view mode survive encoded URL roundtrip", () => {
  const query = {
    ...defaultQuery,
    q: "React & 한글?",
    category: "업무 자동화",
    status: "개발 중",
    tag: "TypeScript",
    sort: "latest",
    layout: "list",
  };
  assert.deepEqual(readArchiveQuery(archiveHash(query)), query);
  assert.deepEqual(
    readArchiveQuery("#/?sort=unknown&layout=unsafe"),
    defaultQuery,
  );
});
test("search covers description, name, tags; filters combine without mutating original order or data", () => {
  const projects = catalogProjects();
  const original = JSON.stringify(projects);
  assert.ok(
    queryProjects(projects, { ...defaultQuery, q: "musclemap" }).some(
      (p) => p.id === "proj-musclemap",
    ),
  );
  assert.ok(
    queryProjects(projects, { ...defaultQuery, q: "자주 쓰는 문구" }).some(
      (p) => p.id === "proj-minially",
    ),
  );
  assert.equal(
    queryProjects(projects, {
      ...defaultQuery,
      category: "일정 관리",
      tag: "PWA",
      q: "React",
    }).length,
    1,
  );
  assert.equal(
    queryProjects(projects, {
      ...defaultQuery,
      category: "일정 관리",
      status: "보류",
    }).length,
    0,
  );
  assert.equal(
    queryProjects(projects, { ...defaultQuery, q: "없는 프로젝트 이름" })
      .length,
    0,
  );
  queryProjects(projects, { ...defaultQuery, sort: "name" });
  queryProjects(projects, { ...defaultQuery, sort: "latest" });
  assert.equal(JSON.stringify(projects), original);
});
test("home, about, admin and existing project routes remain linkable", () => {
  for (const view of ["home", "about", "admin"] as const)
    assert.deepEqual(parseRoute(routeHash({ view })), { view });
});
test("broad groups combine categories while legacy category links keep their exact meaning", () => {
  const projects = catalogProjects();
  const before = JSON.stringify(projects);
  const games = queryProjects(projects, { ...defaultQuery, group: "games" });
  assert.ok(games.some((p) => p.id === "proj-crossroads-ai-verdict"));
  assert.ok(games.some((p) => p.id === "proj-snake-race"));
  assert.ok(!games.some((p) => p.id === "proj-minially"));
  const legacy = readArchiveQuery(
    "#/?category=" + encodeURIComponent("스토리 게임"),
  );
  assert.equal(legacy.group, "");
  assert.ok(
    queryProjects(projects, legacy).every((p) => p.category === "스토리 게임"),
  );
  assert.equal(readArchiveQuery("#/?group=invalid").group, "");
  const grouped = { ...defaultQuery, group: "life", q: "달력", layout: "list" };
  assert.deepEqual(readArchiveQuery(archiveHash(grouped)), grouped);
  assert.equal(JSON.stringify(projects), before);
});
