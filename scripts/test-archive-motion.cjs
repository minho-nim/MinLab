/* Archive state changes on the production build, with isolated browser storage. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence =
  process.env.MINLAB_EVIDENCE_DIR || "test-results/archive-motion";
const digest = (s) =>
  createHash("sha256")
    .update(s || "")
    .digest("hex");
const moving = (page) =>
  page.locator('.project-collection[data-collection-moving="true"]');
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    await fs.mkdir(evidence, { recursive: true });
    for (const width of [1440, 390]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "no-preference",
      });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "#/?layout=grid");
      await page
        .getByRole("heading", { name: "전체 프로젝트", exact: true })
        .waitFor();
      const count = await page.locator(".archive-project").count();
      const saved = digest(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
      );
      await page
        .getByRole("button", { name: "리스트 보기", exact: true })
        .click();
      assert.equal(await page.locator(".project-collection.list").count(), 1);
      assert.equal(
        await moving(page).count(),
        1,
        "layout movement starts without delaying the actual list",
      );
      assert.ok(page.url().includes("layout=list"));
      await page.screenshot({ path: `${evidence}/grid-to-list-${width}.png` });
      await page
        .getByRole("button", { name: "그리드 보기", exact: true })
        .click();
      assert.equal(
        await page.locator(".project-collection.grid").count(),
        1,
        "a second choice interrupts the first",
      );
      await moving(page).waitFor({ state: "detached" });
      await page.locator(".filter-disclosure summary").click();
      await page
        .getByRole("combobox", { name: "프로젝트 정렬" })
        .selectOption("name");
      assert.ok(page.url().includes("sort=name"));
      assert.equal(await moving(page).count(), 1);
      await page
        .getByRole("searchbox", { name: "프로젝트 검색" })
        .fill("MuscleMap");
      assert.equal(
        await page
          .getByRole("searchbox", { name: "프로젝트 검색" })
          .inputValue(),
        "MuscleMap",
      );
      assert.equal(
        await moving(page).count(),
        0,
        "typing cancels movement and updates results immediately",
      );
      assert.ok((await page.locator(".archive-project").count()) > 0);
      assert.ok((await page.locator(".archive-project").count()) < count);
      await page
        .getByRole("searchbox", { name: "프로젝트 검색" })
        .fill("결과없음_동작검사");
      await page
        .getByRole("heading", { name: "검색 결과가 없습니다.", exact: true })
        .waitFor();
      await page.getByRole("button", { name: "전체 프로젝트 보기" }).click();
      assert.equal(await page.locator(".archive-project").count(), count);
      await moving(page).waitFor({ state: "detached" });
      await page
        .getByRole("button", { name: "리스트 보기", exact: true })
        .click();
      await moving(page).waitFor({ state: "detached" });
      if (width >= 900) {
        const card = page.locator(".archive-project.image-project").first();
        await card.scrollIntoViewIfNeeded();
        const bounds = await card.boundingBox();
        await card.hover({
          position: { x: bounds.width - 5, y: Math.min(bounds.height / 2, 30) },
        });
        const preview = page.locator(".archive-hover-preview");
        await preview.waitFor();
        const position = await preview.boundingBox();
        assert.ok(
          position.x >= 8 && position.x + position.width <= width - 7,
          "first preview appears within horizontal bounds",
        );
        assert.ok(
          position.y >= 8 && position.y + position.height <= 1000 - 7,
          "first preview fits near the cursor",
        );
        assert.ok(
          position.x > width / 2,
          "preview does not travel from the page origin",
        );
        await page.screenshot({
          path: `${evidence}/list-preview-${width}.png`,
        });
        await page.keyboard.press("Escape");
        await preview.waitFor({ state: "detached" });
      }
      await page.goto(base + "#/home");
      await page
        .getByRole("button", { name: "움직임 멈추기", exact: true })
        .click();
      await page.goto(base + "#/?layout=grid");
      await page
        .getByRole("button", { name: "리스트 보기", exact: true })
        .click();
      assert.equal(
        await moving(page).count(),
        0,
        "the existing motion preference also controls collection movement",
      );
      assert.equal(await page.locator(".archive-project").count(), count);
      assert.equal(
        digest(
          await page.evaluate(() =>
            localStorage.getItem("minlab_projects_data_v2"),
          ),
        ),
        saved,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    const page = await browser.newPage({ reducedMotion: "reduce" });
    page.setDefaultTimeout(10000);
    await page.goto(base + "#/?layout=grid");
    await page
      .getByRole("button", { name: "리스트 보기", exact: true })
      .click();
    assert.equal(await moving(page).count(), 0);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.evaluate(() => {
      window.__savedAnimate = Element.prototype.animate;
      Element.prototype.animate = undefined;
    });
    await page
      .getByRole("button", { name: "그리드 보기", exact: true })
      .click();
    assert.equal(
      await page.locator(".project-collection.grid").count(),
      1,
      "unsupported animation falls back to immediate state",
    );
    assert.equal(await moving(page).count(), 0);
    await page.evaluate(() => {
      Element.prototype.animate = window.__savedAnimate;
    });
    await page.close();
    console.log(
      "PASS: Grid/List continuity, interrupted reordering, immediate search, bounded hover preview, pause/reduced-motion/fallback and preserved records (desktop/mobile).",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
