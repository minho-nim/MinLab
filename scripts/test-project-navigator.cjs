/* Native links and visible source order remain the navigation contract. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence =
  process.env.MINLAB_EVIDENCE_DIR || "test-results/project-navigator";
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
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({
        viewport: { width, height: 1000 },
        reducedMotion: "reduce",
      });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(base + "#/?layout=list&sort=name");
      const saved = await page.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      );
      const visible = JSON.parse(saved).filter((p) => p.visible !== false);
      const middle = visible[Math.floor(visible.length / 2)];
      await page
        .locator(
          '.archive-project[href="#/projects/' +
            encodeURIComponent(middle.id) +
            '"]',
        )
        .click();
      const menu = page.locator(".mini-project-menu");
      await menu.scrollIntoViewIfNeeded();
      assert.equal(await menu.evaluate((el) => el.open), width >= 900);
      if (width < 900) await menu.locator("summary").click();
      const track = page.getByRole("navigation", {
        name: "프로젝트 미니 내비게이터",
      });
      const links = track.locator(":scope>a");
      assert.equal(await links.count(), visible.length);
      const current = track.locator('[aria-current="page"]');
      await page.waitForFunction(() => {
        const track = document.querySelector(".mini-project-track"),
          card = track?.querySelector('[aria-current="page"]');
        if (!card) return false;
        const a = track.getBoundingClientRect(),
          b = card.getBoundingClientRect();
        return b.left >= a.left - 1 && b.right <= a.right + 1;
      });
      const href = await current.getAttribute("href");
      await current.focus();
      await page.keyboard.press("End");
      assert.equal(
        await links.last().evaluate((el) => el === document.activeElement),
        true,
      );
      assert.equal(await current.getAttribute("href"), href);
      assert.ok(page.url().includes(encodeURIComponent(middle.id)));
      await page.keyboard.press("Home");
      assert.equal(
        await links.first().evaluate((el) => el === document.activeElement),
        true,
      );
      await page
        .getByRole("button", { name: "프로젝트 탐색기 오른쪽으로" })
        .click();
      await page.waitForFunction(
        () => document.querySelector(".mini-project-track").scrollLeft > 0,
      );
      await page.screenshot({ path: `${evidence}/rail-${width}.png` });
      const target = await links.first().getAttribute("href");
      await links.first().focus();
      await page.keyboard.press("Enter");
      await page.waitForURL((url) => url.hash === target);
      await page.goBack();
      await page.waitForURL((url) => url.hash === href);
      const last = visible[visible.length - 1];
      await page.goto(base + "#/projects/" + encodeURIComponent(last.id));
      await page.locator(".next-project").click();
      await page.waitForURL(
        (url) =>
          url.hash.includes("layout=list") && url.hash.includes("sort=name"),
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
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
    console.log(
      "PASS: visible project order, responsive disclosure/current position, keyboard rail navigation, scroll controls, native links/back, last-project archive state and unchanged records.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
