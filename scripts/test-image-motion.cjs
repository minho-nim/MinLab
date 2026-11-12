/* Actual compositor styles and state changes; isolated browser storage. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const digest = (value) =>
  createHash("sha256")
    .update(value || "")
    .digest("hex");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence = process.env.MINLAB_EVIDENCE_DIR || "test-results/image-motion";
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
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "no-preference",
    });
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "#/home");
    const media = page.locator(".hero-main-image .project-media");
    await page.waitForFunction(
      () =>
        document.querySelector(".hero-main-image .project-media")?.dataset
          .mediaState === "ready",
    );
    let original = await page.evaluate(() =>
      localStorage.getItem("minlab_projects_data_v2"),
    );
    const driftBefore = await page
      .locator(".hero-main-image")
      .evaluate((el) => getComputedStyle(el).translate);
    await page.waitForTimeout(300);
    assert.notEqual(
      await page
        .locator(".hero-main-image")
        .evaluate((el) => getComputedStyle(el).translate),
      driftBefore,
      "visible product screens drift",
    );
    const box = await media.boundingBox();
    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.25);
    await page.waitForFunction(
      () =>
        document.querySelector(".hero-main-image .project-media")?.dataset
          .mediaInteracting === "true",
    );
    await page.waitForTimeout(250);
    assert.notEqual(
      await media
        .locator(".media-current")
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
      "pointer gives the real screen depth",
    );
    assert.equal(
      await page
        .locator(".hero-main-image")
        .evaluate((el) => getComputedStyle(el).animationPlayState),
      "paused",
      "drift holds still while inspecting a screen",
    );
    assert.equal(
      await media.evaluate((el) => getComputedStyle(el, "::after").opacity),
      "1",
    );
    await page.screenshot({ path: evidence + "/home-depth-1440.png" });
    await page.mouse.move(12, 12);
    await page.waitForFunction(
      () =>
        !document.querySelector(".hero-main-image .project-media")?.dataset
          .mediaInteracting,
    );
    await page
      .getByRole("button", { name: "움직임 멈추기", exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.visualMotion),
      "paused",
    );
    assert.equal(
      await media
        .locator(".media-current")
        .evaluate((el) => getComputedStyle(el).transform),
      "none",
    );
    assert.equal(
      await page
        .locator(".hero-main-image")
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    assert.equal(
      digest(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
      ),
      digest(original),
    );
    await page.reload();
    original = await page.evaluate(() =>
      localStorage.getItem("minlab_projects_data_v2"),
    );
    await page
      .getByRole("button", { name: "움직임 재생", exact: true })
      .waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.dataset.visualMotion),
      "paused",
      "pause survives route/reload",
    );
    await page
      .getByRole("button", { name: "움직임 재생", exact: true })
      .click();
    const choices = page.locator(".explorer-index button");
    await choices.first().click();
    const preview = page.locator(".explorer-preview .project-media");
    await page.waitForFunction(
      () =>
        document.querySelector(".explorer-preview .project-media")?.dataset
          .mediaState === "ready",
    );
    const first = await preview.locator(".media-current").getAttribute("src");
    await choices.nth(1).click();
    await page.waitForFunction((src) => {
      const node = document.querySelector(".explorer-preview .project-media");
      return (
        node?.dataset.mediaState === "ready" &&
        node.querySelector(".media-current")?.getAttribute("src") !== src
      );
    }, first);
    assert.equal(
      await preview.locator(".media-outgoing").count(),
      1,
      "project selection crossfades from the actual previous screen",
    );
    assert.equal(
      await preview.locator(".media-outgoing").getAttribute("aria-hidden"),
      "true",
    );
    await page.screenshot({ path: evidence + "/project-crossfade-1440.png" });
    await page.evaluate(() =>
      scrollTo(0, document.documentElement.scrollHeight),
    );
    await page.waitForFunction(
      () =>
        document.querySelector(".hero-main-image .project-media")?.dataset
          .mediaVisible === "false",
    );
    assert.equal(
      await page
        .locator(".hero-main-image")
        .evaluate((el) => getComputedStyle(el).animationPlayState),
      "paused",
      "offscreen loops stop",
    );
    await page.goto(base + "#/projects/proj-musclemap");
    await page.locator(".scene-tabs button").first().click();
    const screen = page.locator(".browser-showcase .project-media");
    await page.waitForFunction(
      () =>
        document.querySelector(".browser-showcase .project-media")?.dataset
          .mediaState === "ready",
    );
    const scene = await screen.locator(".media-current").getAttribute("src");
    await page.locator(".scene-tabs button").nth(1).click();
    await page.waitForFunction((src) => {
      const node = document.querySelector(".browser-showcase .project-media");
      return (
        node?.dataset.mediaState === "ready" &&
        node.querySelector(".media-current")?.getAttribute("src") !== src
      );
    }, scene);
    assert.equal(
      await screen.locator(".media-outgoing").count(),
      1,
      "feature selection keeps the outgoing screen during transition",
    );
    assert.equal(
      digest(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
      ),
      digest(original),
    );
    assert.deepEqual(errors, []);
    await page.close();
    for (const reduced of ["no-preference", "reduce"]) {
      const mobile = await browser.newPage({
        viewport: { width: 390, height: 900 },
        hasTouch: true,
        isMobile: true,
        reducedMotion: reduced,
      });
      mobile.setDefaultTimeout(10000);
      await mobile.goto(base + "#/home");
      const target = mobile.locator(".hero-mobile-featured .project-media");
      await target.waitFor();
      await mobile.waitForFunction(
        () =>
          document.querySelector(".hero-mobile-featured .project-media")
            ?.dataset.mediaState === "ready",
      );
      await target.dispatchEvent("pointermove", {
        pointerType: "touch",
        clientX: 180,
        clientY: 300,
      });
      assert.equal(
        await target.getAttribute("data-media-interacting"),
        null,
        "touch does not tilt screens",
      );
      if (reduced === "reduce") {
        assert.ok(
          await mobile
            .getByRole("button", { name: "움직임 줄임", exact: true })
            .isDisabled(),
        );
        await target.dispatchEvent("pointermove", {
          pointerType: "mouse",
          clientX: 200,
          clientY: 300,
        });
        assert.equal(await target.getAttribute("data-media-interacting"), null);
      }
      assert.ok(
        await mobile.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const selectedBefore = await mobile
        .locator(".hero-mobile-caption strong")
        .innerText();
      const homeUrl = mobile.url();
      const bounds = await target.boundingBox();
      const cdp = await mobile.context().newCDPSession(mobile);
      const y = bounds.y + bounds.height / 2;
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 300, y, id: 1 }],
      });
      await mobile.waitForTimeout(60);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: 100, y: y + 3, id: 1 }],
      });
      await mobile.waitForTimeout(80);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await mobile.waitForFunction(
        (name) =>
          document.querySelector(".hero-mobile-caption strong")?.textContent !==
          name,
        selectedBefore,
      );
      assert.equal(
        mobile.url(),
        homeUrl,
        "swipe selects a real project without opening its link",
      );
      // Finish viewing this transition before a separate deliberate touch gesture.
      await mobile.waitForFunction(
        () =>
          document.querySelector(".hero-mobile-featured .project-media")
            ?.dataset.mediaState === "ready",
      );
      await mobile
        .locator(".hero-mobile-featured .media-outgoing")
        .waitFor({ state: "detached" });
      await mobile.screenshot({ path: `${evidence}/home-390-${reduced}.png` });
      const link = await mobile.locator(".hero-mobile-featured").boundingBox();
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: link.x + link.width / 2, y: link.y + link.height / 2, id: 1 },
        ],
      });
      await mobile.waitForTimeout(80);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await mobile
        .locator(".project-story")
        .waitFor()
        .catch(() => {
          throw new Error(
            "Tap after swipe did not reach detail: " +
              reduced +
              " " +
              mobile.url(),
          );
        });
      assert.notEqual(
        mobile.url(),
        homeUrl,
        "a subsequent deliberate tap still opens the project",
      );
      await cdp.detach();
      await mobile.close();
    }
    console.log(
      "PASS: live depth/light, bounded visible drift, project/feature crossfades, pause persistence, offscreen stop, touch/reduced-motion and unchanged records.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
