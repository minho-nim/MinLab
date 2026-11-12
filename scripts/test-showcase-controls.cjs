/* Feature navigation uses real project content and isolated browser storage. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence =
  process.env.MINLAB_EVIDENCE_DIR || "test-results/showcase-controls";
const digest = (s) =>
  createHash("sha256")
    .update(s || "")
    .digest("hex");
async function swipe(page, box, vertical = false) {
  const cdp = await page.context().newCDPSession(page);
  const x = box.x + box.width * 0.8,
    y = box.y + box.height * 0.5;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 1 }],
  });
  await page.waitForTimeout(60);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      {
        x: vertical ? x : box.x + box.width * 0.2,
        y: vertical ? y - 100 : y + 3,
        id: 1,
      },
    ],
  });
  await page.waitForTimeout(80);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
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
    await fs.mkdir(evidence, { recursive: true });
    for (const width of [1440, 390, 320]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        hasTouch: width < 900,
        isMobile: width < 900,
        reducedMotion: "reduce",
      });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(() => {
        const scroll = window.scrollTo.bind(window);
        window.__sceneScrolls = [];
        window.scrollTo = (...args) => {
          if (typeof args[0] === "object") window.__sceneScrolls.push(args[0]);
          scroll(...args);
        };
      });
      await page.goto(base + "#/projects/proj-musclemap");
      const select = page.getByRole("combobox", { name: "미리보기 기능 선택" });
      await select.waitFor();
      const saved = digest(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
      );
      const hash = page.url();
      const buttons = page.locator(".scene-tabs button");
      const count = await buttons.count();
      assert.ok(count >= 2);
      await buttons.first().click();
      await buttons.first().press("ArrowRight");
      assert.equal(await select.inputValue(), "1");
      assert.ok(
        await buttons.nth(1).evaluate((el) => el === document.activeElement),
      );
      await buttons.nth(1).press("End");
      assert.equal(await select.inputValue(), String(count - 1));
      await buttons.last().press("Home");
      assert.equal(await select.inputValue(), "0");
      await select.selectOption("1");
      await page.waitForFunction(
        () =>
          document.querySelector(".scene-stories .is-active")?.dataset.scene ===
          "1",
      );
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
          ),
      );
      await page.waitForFunction(
        () =>
          document.querySelector(".browser-showcase .project-media")?.dataset
            .mediaState === "ready",
      );
      assert.ok(
        await page
          .locator(".browser-showcase .media-outgoing")
          .evaluateAll((nodes) =>
            nodes.every((node) => getComputedStyle(node).display === "none"),
          ),
        "reduced motion never covers the newly selected screen with its predecessor",
      );
      assert.ok(
        (await page.locator(".scene-position").innerText()).includes(
          "02 / " + String(count).padStart(2, "0"),
        ),
      );
      assert.equal(page.url(), hash);
      const size = await select.boundingBox();
      assert.ok(
        size.height >= 44 && size.width > 75,
        "the sticky selector remains usable",
      );
      await page.screenshot({ path: `${evidence}/controls-${width}.png` });
      if (width < 900) {
        const selected = await buttons.nth(1).boundingBox(),
          track = await page.locator(".scene-tabs").boundingBox();
        assert.ok(
          selected.x >= track.x - 1 && selected.x < track.x + track.width,
          "the selected horizontal item is reachable",
        );
        await select.selectOption("0");
        await page.waitForFunction(
          () =>
            document.querySelector(".scene-stories .is-active")?.dataset
              .scene === "0",
        );
        const stage = page.locator(".scene-preview-stage");
        await swipe(page, await stage.boundingBox());
        await page.waitForFunction(
          () => document.querySelector(".scene-current select")?.value === "1",
        );
        assert.equal(page.url(), hash, "swiping stays on the current project");
        await page.evaluate(() => {
          window.addEventListener(
            "touchstart",
            () => {
              window.__sceneScrolls = [];
            },
            { once: true, capture: true },
          );
        });
        await swipe(page, await stage.boundingBox(), true);
        assert.equal(
          await page.evaluate(() => window.__sceneScrolls.length),
          0,
          "vertical touch scroll is not hijacked",
        );
        await select.selectOption("0");
        await page.locator(".browser-showcase .media-expand").click();
        const viewer = page.getByRole("dialog", {
          name: "MuscleMap",
          exact: true,
        });
        await viewer
          .getByRole("navigation", { name: "미리보기 화면 선택" })
          .getByRole("button")
          .first()
          .click();
        await swipe(
          page,
          await viewer.locator(".media-viewer-stage").boundingBox(),
        );
        await page.waitForFunction(() =>
          document
            .querySelector(".media-viewer img")
            ?.getAttribute("src")
            ?.includes("musclemap-map"),
        );
        assert.equal(
          await page.locator(".scene-current select").inputValue(),
          "0",
          "viewer gestures do not advance the underlying story",
        );
        await page.keyboard.press("Escape");
        await viewer.waitFor({ state: "detached" });
      }
      await select.selectOption(String(count - 1));
      assert.equal(
        await page.locator(".scene-stories article").count(),
        count,
        "all feature descriptions remain accessible",
      );
      await page.evaluate(() => {
        window.__sceneScrolls = [];
        const buttons = document.querySelectorAll(".scene-tabs button");
        buttons[0].click();
        buttons[1].click();
        window.dispatchEvent(new WheelEvent("wheel", { deltaY: 10 }));
      });
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      assert.equal(
        await page.evaluate(() => window.__sceneScrolls.length),
        0,
        "user scroll cancels queued jumps",
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.equal(
        digest(
          await page.evaluate(() =>
            localStorage.getItem("minlab_projects_data_v2"),
          ),
        ),
        saved,
      );
      const plainId = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("minlab_projects_data_v2")).find(
            (p) => p.name === "ChoicePilot",
          ).id,
      );
      await page.goto(base + "#/projects/" + plainId);
      const plain = page.getByRole("combobox", { name: "미리보기 기능 선택" });
      const total = await plain.locator("option").count();
      assert.ok(total > 2);
      await plain.selectOption(String(total - 1));
      await page.locator(".browser-showcase .scene-no-image").waitFor();
      assert.equal(await page.locator(".scene-stories article").count(), total);
      if (width < 900) {
        const last = await page
          .locator(".scene-tabs button")
          .last()
          .boundingBox();
        const track = await page.locator(".scene-tabs").boundingBox();
        assert.ok(last.x >= track.x - 1 && last.x < track.x + track.width);
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "PASS: sticky selection, keyboard Home/End/arrows, horizontal tabs, touch/vertical scroll, nested viewer, cancelled jumps and unchanged URL/records (320/390/1440px).",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
