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
    queryProjects(projects, { ...defaultQuery, q: "반복 입력" }).some(
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
