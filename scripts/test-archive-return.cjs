/* Real archive/history navigation, isolated browser storage, no production writes. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence = "test-results/archive-return";
const projectId = "proj-musclemap";
const selector = `.archive-project[data-collection-key="${projectId}"]`;
const cueSelector = '[data-archive-return="true"]';
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
    for (const width of [1400, 400])
      for (const layout of ["grid", "list"]) {
        const reduce = !(width === 400 && layout === "grid");
        const page = await browser.newPage({
          viewport: { width, height: 1000 },
          reducedMotion: reduce ? "reduce" : "no-preference",
        });
        page.setDefaultTimeout(12000);
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const hash = `#/?q=React&tag=React&sort=name&layout=${layout}`;
        await page.goto(base + hash);
        await page.reload();
        const card = page.locator(selector);
        await card.waitFor();
        // Measure after the existing entry animation and cold font load settle.
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            document
              .querySelector(".archive-view")
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished.catch(() => {})),
          );
        });
        await card.evaluate((node) =>
          node.scrollIntoView({ block: "center", behavior: "instant" }),
        );
        await page.waitForTimeout(80);
        const before = {
          y: await page.evaluate(() => scrollY),
          rect: await card.boundingBox(),
          data: await page.evaluate(() =>
            localStorage.getItem("minlab_projects_data_v2"),
          ),
        };
        assert.ok(before.y > 0, "The fixture must exercise a scrolled archive");
        if (layout === "list" && width === 1400) await card.press("Enter");
        else await card.click();
        await page
          .locator(`.project-story[data-project-id="${projectId}"]`)
          .waitFor();
        await page.evaluate(() => scrollTo(0, 1200));
        if (!reduce) {
          await page.reload();
          await page
            .locator(`.project-story[data-project-id="${projectId}"]`)
            .waitFor();
        }
        if (width === 400 && layout === "list")
          await page.locator(".project-breadcrumb a").click();
        else await page.goBack();
        await page.locator(selector + "[data-archive-return=true]").waitFor();
        assert.equal(new URL(page.url()).hash, hash);
        assert.equal(
          await page
            .getByRole("searchbox", { name: "프로젝트 검색" })
            .inputValue(),
          "React",
        );
        assert.equal(
          await page.locator(`.project-collection.${layout}`).count(),
          1,
        );
        assert.ok(
          Math.abs((await page.evaluate(() => scrollY)) - before.y) < 12,
          "Returning must not recenter or jump the page",
        );
        assert.equal(
          await card.evaluate((n) => n === document.activeElement),
          true,
        );
        const after = await card.boundingBox();
        const afterScroll = await page.evaluate(() => scrollY);
        // Layout coordinates exclude the separately checked scroll restoration.
        before.rect.y += before.y;
        after.y += afterScroll;
        for (const field of ["x", "y", "width", "height"])
          assert.ok(
            Math.abs(after[field] - before.rect[field]) < 2,
            `Cue must not change ${field} (${width}px ${layout}: ${JSON.stringify({ before: before.rect, after, beforeScroll: before.y, afterScroll })})`,
          );
        assert.equal(await page.locator(cueSelector).count(), 1);
        assert.equal(
          await card.evaluate((n) => getComputedStyle(n).transform),
          "none",
        );
        if (reduce)
          assert.equal(
            await card.evaluate((n) => getComputedStyle(n).animationName),
            "none",
          );
        await page.screenshot({ path: `${evidence}/${layout}-${width}.png` });
        if (width === 400 && layout === "list") {
          await page
            .getByRole("searchbox", { name: "프로젝트 검색" })
            .fill("No such project");
          assert.equal(await page.locator(cueSelector).count(), 0);
        } else {
          await page.waitForFunction(
            () => !document.querySelector('[data-archive-return="true"]'),
          );
        }
        assert.equal(
          await page.evaluate(() =>
            localStorage.getItem("minlab_projects_data_v2"),
          ),
          before.data,
        );
        if (width === 1400 && layout === "grid") {
          await page.goForward();
          await page.locator(".project-story").waitFor();
          await page.goBack();
          await page.locator(selector + "[data-archive-return=true]").waitFor();
          await page.goto(base + "#/home");
          await page.locator(".home-hero").waitFor();
          await page.goto(base + hash);
          await card.waitFor();
          assert.equal(
            await page.locator(cueSelector).count(),
            0,
            "An unrelated visit must not replay an old cue",
          );
        }
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        assert.deepEqual(errors, []);
        await page.close();
      }
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1000 },
      reducedMotion: "reduce",
    });
    await page.goto(base + `#/projects/${projectId}`);
    await page.locator(".project-breadcrumb a").click();
    await page.locator(".project-collection").waitFor();
    assert.equal(
      await page.locator(cueSelector).count(),
      0,
      "Direct project entry has no archive origin",
    );
    for (const [target, ctrlKey] of [
      [page.locator('.archive-project[target="_blank"]').first(), false],
      [page.locator(selector), true],
    ]) {
      await target.evaluate((node, ctrlKey) => {
        node.addEventListener("click", (event) => event.preventDefault(), {
          once: true,
        });
        node.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
            ctrlKey,
          }),
        );
      }, ctrlKey);
      assert.equal(
        await page.evaluate(() =>
          sessionStorage.getItem("minlab_archive_origin_v1"),
        ),
        null,
        "External/modified links must not create a current-tab return context",
      );
    }
    await page.close();
    console.log(
      "PASS: Grid/List search/filter/sort and scroll restored; transient layout-stable cue and focus; detail refresh, native back/forward, breadcrumb, reduced motion, cancellation, no stale cue or modified/external-link capture; original data unchanged at 400/1400px.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
