/* Real Chromium transitions; isolated browser state, no production writes. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3013/";
    await page.goto(base + "#/home");
    await page.locator(".hero-project").first().waitFor();
    await page.waitForTimeout(800);
    const title = page.locator(".hero-copy h1>span").first();
    const before = await title.evaluate((n) => getComputedStyle(n).translate);
    await page.locator(".home-hero").dispatchEvent("pointermove", {
      pointerType: "mouse",
      clientX: 1000,
      clientY: 200,
    });
    assert.equal(
      await title.evaluate((n) => getComputedStyle(n).translate),
      before,
      "title stays still while the cursor moves",
    );
    const end = await page
      .locator("#selected-work")
      .evaluate((n) => n.getBoundingClientRect().top + scrollY - 90);
    await page.evaluate((end) => scrollTo(0, end - innerHeight * 0.4), end);
    await page.waitForTimeout(120);
    assert.equal(await page.locator(".hero-handoff").count(), 1);
    const actual = await page
      .locator(".hero-handoff>.project-media")
      .first()
      .boundingBox();
    assert.ok(actual.width > 200);
    const evidence = process.env.MINLAB_EVIDENCE_DIR || "test-results/motion";
    await fs.mkdir(evidence, { recursive: true });
    await page.screenshot({ path: evidence + "/handoff.png" });
    await page.evaluate((end) => scrollTo(0, end + 5), end);
    await page.waitForTimeout(120);
    assert.equal(
      await page.locator(".hero-handoff").count(),
      0,
      "handoff releases to real explorer",
    );
    assert.equal(
      await page
        .locator("#selected-work .showcase-image .project-media")
        .evaluate((n) => getComputedStyle(n).visibility),
      "visible",
    );
    await page.evaluate(() => {
      window.__motion = [];
      const native = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        window.__motion.push({
          named: document.querySelectorAll('[style*="view-transition-name"]')
            .length,
          kind: document.documentElement.dataset.routeMotion,
        });
        return native(update);
      };
    });
    await page.locator(".explorer-index button").nth(2).click();
    await page.waitForFunction(
      (expected) => Math.abs(scrollY - expected) < 2,
      end + 240,
    );
    const departureScroll = await page.evaluate(() => scrollY);
    await page.locator(".showcase-image").click();
    await page.locator(".project-story").waitFor();
    await page.waitForTimeout(700);
    assert.ok(
      (await page.evaluate(() => window.__motion)).some((m) => m.named === 1),
      "selected preview is named for real shared transition",
    );
    const next = page.locator(".next-project h2");
    if (await next.count()) {
      const nextName = await next.innerText();
      await page.locator(".next-project").click();
      await page
        .getByRole("heading", { name: nextName, level: 1, exact: true })
        .waitFor();
      await page.waitForTimeout(650);
      assert.ok(
        (await page.evaluate(() => window.__motion)).some(
          (m) => m.kind === "next-project",
        ),
        "next project uses the shrinking departure",
      );
      await page.goBack();
      await page.waitForTimeout(650);
    }
    await page.goBack();
    await page.locator("#selected-work").waitFor();
    await page.waitForTimeout(450);
    assert.ok(
      Math.abs((await page.evaluate(() => scrollY)) - departureScroll) < 40,
      "back restores explorer scroll",
    );
    await page.goto(base + "#/projects/proj-musclemap");
    await page.locator(".project-records-disclosure > summary").click();
    await page.locator(".journey-record").first().waitFor();
    await page.locator(".journey-record").nth(1).scrollIntoViewIfNeeded();
    await page
      .locator(".journey-record")
      .nth(1)
      .evaluate((n) =>
        scrollTo(0, scrollY + n.getBoundingClientRect().top - 140),
      );
    await page.waitForTimeout(120);
    assert.equal(
      await page
        .locator(".journey-versions button")
        .nth(1)
        .getAttribute("aria-current"),
      "true",
      "native scroll selects reading stage",
    );
    await page.locator(".journey-versions button").first().click();
    await page.waitForTimeout(120);
    assert.equal(
      await page
        .locator(".journey-versions button")
        .first()
        .getAttribute("aria-current"),
      "true",
      "direct choice and scroll agree",
    );
    await page.screenshot({ path: evidence + "/journey.png" });
    await page.evaluate(() => {
      location.hash = "#/about";
      setTimeout(() => {
        location.hash = "#/home";
      }, 20);
      setTimeout(() => {
        location.hash = "#/";
      }, 40);
    });
    await page.getByRole("searchbox", { name: "프로젝트 검색" }).waitFor();
    await page.waitForTimeout(700);
    assert.ok(page.url().endsWith("#/"), "rapid navigation keeps latest route");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base + "#/home");
    await page.evaluate((end) => scrollTo(0, end - innerHeight * 0.4), end);
    await page.waitForTimeout(120);
    assert.equal(await page.locator(".hero-handoff").count(), 0);
    await page.evaluate(() => (document.startViewTransition = undefined));
    await page.goto(base + "#/home");
    await page.locator('.hero-project[href^="#/projects/"]').first().click();
    await page.locator(".project-story").waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: stable title, reversible real-screen handoff, shared preview transition, native back restoration, scroll/click timeline and reduced motion.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
