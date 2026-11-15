/* Real supplied captures and preserved record-only MinLab data, isolated storage. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const siteId = "proj-1792485558773";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    await fs.mkdir("test-results/feature-screens", { recursive: true });
    for (const width of [390, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base + "#/");
      await page.reload();
      await page.locator(".archive-project").first().waitFor();
      assert.equal(
        await page
          .locator(`.archive-project[data-collection-key="${siteId}"]`)
          .count(),
        0,
      );
      const raw = await page.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      );
      const site = JSON.parse(raw).find((p) => p.id === siteId);
      assert.ok(
        site.workLogs.length && site.promptHistory.length,
        "Site records stay in the original data",
      );
      await page.goto(base + "#/projects/proj-1792563333333");
      const select = page.getByRole("combobox", { name: "미리보기 기능 선택" });
      await select.waitFor();
      assert.equal(await select.locator("option").count(), 6);
      const screens = [];
      for (let index = 0; index < 6; index++) {
        await select.selectOption(String(index));
        const img = page.locator(".browser-showcase img.media-current");
        await img.waitFor();
        await page.waitForFunction(
          () =>
            document.querySelector(".browser-showcase .project-media")?.dataset
              .mediaState === "ready",
        );
        screens.push(await img.getAttribute("src"));
        assert.equal(await page.locator(".scene-no-image").count(), 0);
      }
      assert.equal(
        new Set(screens).size,
        6,
        "Every ChoicePilot feature has its own real capture",
      );
      await page.goto(base + "#/projects/risk-assessment-workplan-automation");
      await page
        .getByRole("combobox", { name: "미리보기 기능 선택" })
        .selectOption("4");
      await page
        .locator(
          '.browser-showcase img.media-current[src*="schedule-export.jpg"]',
        )
        .waitFor();
      await page.waitForFunction(
        () =>
          document.querySelector(".browser-showcase .project-media")?.dataset
            .mediaState === "ready",
      );
      assert.equal(await page.locator(".scene-no-image").count(), 0);
      await page.goto(
        base +
          `#/projects/${siteId}?log=` +
          encodeURIComponent(site.workLogs[0].id),
      );
      await page
        .getByRole("heading", { name: "MinLab 변경사항", exact: true })
        .waitFor();
      assert.equal(
        await page
          .locator(".feature-showcase,.project-intro,.project-connections")
          .count(),
        0,
      );
      await page
        .locator(
          width >= 900
            ? '.journey-desktop [data-linked="true"]'
            : '.journey-mobile > details[data-linked="true"]',
        )
        .waitFor();
      await page
        .getByRole("link", { name: "작업 프롬프트 보기", exact: true })
        .click();
      await page.locator(".prompt-public article").first().waitFor();
      assert.equal(
        await page.locator(".prompt-public article").count(),
        site.promptHistory.length,
      );
      assert.equal(
        await page
          .getByRole("combobox", { name: "기록 대상 프로젝트" })
          .inputValue(),
        siteId,
      );
      await page.screenshot({
        path: `test-results/feature-screens/site-records-${width}.png`,
      });
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
        raw,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "PASS: six distinct ChoicePilot feature captures and real schedule export screen; MinLab excluded from the archive, old linked-record URLs and full prompts preserved; original data unchanged at 390/1440px.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
