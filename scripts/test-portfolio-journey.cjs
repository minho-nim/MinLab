/* One visitor journey across the combined About, archive and detail changes. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const projectId = "proj-musclemap";
const cardSelector = `.archive-project[data-collection-key="${projectId}"]`;
async function menuNavigate(page, href) {
  const floating = page.getByRole("button", { name: "플로팅 전체 메뉴 열기" });
  if (await floating.isVisible()) {
    assert.ok((await floating.boundingBox()).height >= 44);
    if (page.viewportSize().width < 900)
      assert.equal(
        await page.locator(".floating-project-link").isVisible(),
        false,
      );
    await floating.click();
  } else
    await page
      .getByRole("button", { name: "전체 메뉴 열기", exact: true })
      .click();
  const menu = page.locator(".full-menu[open]");
  try {
    await menu.locator(`nav a[href="${href}"]`).click();
  } catch (error) {
    await page.screenshot({
      path: `test-results/integration/menu-failure-${page.viewportSize().width}.png`,
    });
    throw error;
  }
  await menu.waitFor({ state: "hidden" });
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    await fs.mkdir("test-results/integration", { recursive: true });
    for (const [width, height, reducedMotion] of [
      [1440, 1000, "no-preference"],
      [390, 844, "reduce"],
      [320, 640, "reduce"],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion,
      });
      page.setDefaultTimeout(12000);
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base);
      await page.locator(".entry-landing").waitFor();
      await page.reload();
      await page
        .getByRole("navigation", { name: "메인 화면 탐색" })
        .getByRole("link", { name: "홈", exact: true })
        .click();
      await page.locator(".home-hero").waitFor();
      await menuNavigate(page, "#/");
      const search = page.getByRole("searchbox", { name: "프로젝트 검색" });
      await search.fill("React");
      const filters = page.locator(".filter-disclosure");
      if (!(await filters.evaluate((node) => node.open)))
        await filters.locator("summary").click();
      await page
        .getByRole("combobox", { name: "기술 태그 필터" })
        .selectOption("React");
      await page
        .getByRole("combobox", { name: "프로젝트 정렬" })
        .selectOption("name");
      await page
        .getByRole("button", { name: "리스트 보기", exact: true })
        .click();
      await filters.locator("summary").click();
      const archiveHash = new URL(page.url()).hash;
      const original = await page.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      );
      const card = page.locator(cardSelector);
      await card.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () => !document.querySelector("[data-collection-moving]"),
      );
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(100);
      const archiveY = await page.evaluate(() => scrollY);
      await card.click();
      await page
        .locator(`.project-story[data-project-id="${projectId}"]`)
        .waitFor();
      const feature = page.getByRole("combobox", {
        name: "미리보기 기능 선택",
      });
      await feature.selectOption("1");
      await page.waitForFunction(
        () =>
          document.querySelector(".scene-stories .is-active")?.dataset.scene ===
          "1",
      );
      await page
        .getByRole("button", { name: "MuscleMap 화면 크게 보기" })
        .click();
      await page.locator(".media-viewer[open]").waitFor();
      await page.keyboard.press("Escape");
      await page.locator(".media-viewer").waitFor({ state: "detached" });
      assert.equal(
        await page
          .getByRole("button", { name: "MuscleMap 화면 크게 보기" })
          .evaluate((node) => node === document.activeElement),
        true,
      );
      await page.goBack();
      await page
        .locator(cardSelector + '[data-archive-return="true"]')
        .waitFor();
      assert.equal(new URL(page.url()).hash, archiveHash);
      assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - archiveY) < 12,
        "Archive position survives the detail viewer journey",
      );
      assert.equal(
        await card.evaluate((node) => node === document.activeElement),
        true,
      );
      await menuNavigate(page, "#/about");
      await page.locator(".about-page").waitFor();
      assert.equal(await page.locator("[data-archive-return]").count(), 0);
      const mainStage = page
        .locator(".about-timeline article")
        .filter({ hasText: "미노피아와 미니어리를 만들고 있습니다." });
      const mainLinks = mainStage.locator(".related-skills a");
      assert.equal(await mainLinks.count(), 2);
      for (const link of await mainLinks.all()) {
        assert.equal(await link.getAttribute("target"), "_blank");
        assert.match(
          await link.getAttribute("href"),
          /^https:\/\/(minlab-ai-office|minially)\.pages\.dev\/portfolio\/?$/,
        );
      }
      await page
        .locator(".about-ai-work")
        .getByRole("button", { name: "검증과 개선 기록 보기 ↘", exact: true })
        .click();
      const heading = page.locator(".capability-layout h3");
      await page.waitForFunction(
        () =>
          document.querySelector(".capability-layout h3") ===
          document.activeElement,
      );
      assert.equal(await heading.innerText(), "검증 및 개선");
      const record = page
        .locator(".capability-evidence a[data-record-link]")
        .first();
      const logId = await record.getAttribute("data-record-link");
      await record.click();
      await page
        .locator(
          width >= 900
            ? '.journey-desktop .journey-record[data-linked="true"]'
            : '.journey-mobile > details[data-linked="true"]',
        )
        .waitFor();
      assert.equal(
        new URLSearchParams(new URL(page.url()).hash.split("?")[1]).get("log"),
        logId,
      );
      await page.goBack();
      await page.locator(".about-page").waitFor();
      assert.ok(page.url().includes("capability=validation"));
      await page.goBack();
      await card.waitFor();
      assert.equal(new URL(page.url()).hash, archiveHash);
      assert.equal(await search.inputValue(), "React");
      assert.equal(await page.locator(".project-collection.list").count(), 1);
      assert.equal(
        await page.locator("[data-archive-return]").count(),
        0,
        "About navigation does not replay the old archive cue",
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
        original,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.deepEqual(errors, []);
      await page.screenshot({
        path: `test-results/integration/journey-${width}.png`,
      });
      await page.close();
    }
    console.log(
      "PASS: entry → home → filtered List → feature/viewer → restored archive → About main links/evidence → exact record → native back; no stale cue, overflow or source-data edits at 320/390/1440px.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
