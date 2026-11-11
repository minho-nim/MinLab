import test from "node:test";
import assert from "node:assert/strict";
import { parseImportJson } from "./storage";
import { catalogProjects } from "../data/projectCatalog";
import {
  parseScreenshots,
  resolveProjectMedia,
  imageUrl,
} from "./projectMedia";
test("media, chosen cover and feature links survive the existing JSON backup roundtrip", () => {
  const p = {
    ...catalogProjects()[0],
    screenshots: [
      {
        id: "screen-a",
        url: "https://example.com/real.png",
        label: "실제 화면",
        fit: "contain" as const,
        featureId: "feature-1",
      },
      {
        id: "screen-b",
        url: "data:image/webp;base64,YWJj",
        label: "업로드 화면",
        fit: "cover" as const,
      },
    ],
    coverImageId: "screen-b",
  };
  const result = parseImportJson(JSON.stringify([p]));
  assert.equal(result.success, true);
  const restored = result.projects![0];
  assert.deepEqual(restored.screenshots, p.screenshots);
  assert.equal(restored.coverImageId, p.coverImageId);
  assert.equal(resolveProjectMedia(restored)[0].id, "screen-b");
});
test("old backups keep their shape and bundled images use the production base path", () => {
  const p = catalogProjects()[0];
  const restored = parseImportJson(JSON.stringify([p])).projects![0];
  assert.equal(Object.hasOwn(restored, "screenshots"), false);
  assert.equal(Object.hasOwn(restored, "coverImageId"), false);
  const muscle = catalogProjects().find((p) => p.id === "proj-musclemap")!;
  assert.ok(
    resolveProjectMedia(muscle, "/MinLab/").every((s) =>
      s.src.startsWith("/MinLab/media/"),
    ),
  );
  assert.equal(resolveProjectMedia(muscle).length, 2);
});
test("missing media stays empty; stock thumbnail does not become a project screenshot", () => {
  const p = {
    ...catalogProjects()[0],
    thumbnailUrl: "https://images.unsplash.com/stock.jpg",
  };
  assert.deepEqual(resolveProjectMedia(p), []);
});
test("image import rejects unsafe URLs, malformed records and duplicate IDs", () => {
  assert.equal(imageUrl("javascript:alert(1)"), false);
  assert.equal(imageUrl("data:image/svg+xml;base64,YQ=="), false);
  assert.throws(() =>
    parseScreenshots([{ id: "a", url: "javascript:alert(1)", label: "bad" }]),
  );
  assert.throws(() =>
    parseScreenshots([
      { id: "a", url: "/a.webp", label: "a" },
      { id: "a", url: "/b.webp", label: "b" },
    ]),
  );
  assert.equal(
    parseImportJson(
      JSON.stringify([
        {
          ...catalogProjects()[0],
          screenshots: [{ id: "a", url: "javascript:alert(1)", label: "bad" }],
        },
      ]),
    ).success,
    false,
  );
});
