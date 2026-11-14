/* Production image requests and real interactions in isolated browser contexts. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence = process.env.MINLAB_EVIDENCE_DIR || "test-results/media";
const sameSize = (a, b) => {
  assert.ok(Math.abs(a.width - b.width) < 1, "image area keeps its width");
  assert.ok(Math.abs(a.height - b.height) < 1, "image area keeps its height");
};
(async () => {
  await fs.mkdir(evidence, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        reducedMotion: "reduce",
        hasTouch: width < 900,
      });
      page.setDefaultTimeout(10000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(/\/media\/.*\.webp$/, async (route) => {
        await gate;
        await route.continue();
      });
      await page.goto(base + "#/home", { waitUntil: "domcontentloaded" });
      const primary = page.locator('.home-hero img[fetchpriority="high"]');
      await primary.waitFor();
      assert.equal(
        await primary.count(),
        1,
        "one primary image has high priority",
      );
      assert.equal(
        await page
          .locator(
            width < 900 ? ".hero-project-cloud" : ".hero-mobile-showcase",
          )
          .count(),
        0,
        "hidden responsive images are not mounted",
      );
      const wrapper =
        width < 900
          ? page.locator(".hero-mobile-featured>.project-media")
          : page.locator(".hero-main-image .project-media");
      const before = await wrapper.boundingBox();
      assert.equal(await wrapper.getAttribute("data-media-state"), "loading");
      release();
      await page.waitForFunction(
        () =>
          document
            .querySelector('.home-hero img[fetchpriority="high"]')
            ?.closest(".project-media").dataset.mediaState === "ready",
      );
      sameSize(before, await wrapper.boundingBox());
      await page.setViewportSize({
        width: width < 900 ? 1100 : 390,
        height: 900,
      });
      await page
        .locator(width < 900 ? ".hero-project-cloud" : ".hero-mobile-showcase")
        .waitFor();
      assert.equal(
        await page.locator('.home-hero img[fetchpriority="high"]').count(),
        1,
      );
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "#/projects/proj-musclemap");
      const expand = page.locator(".browser-showcase .media-expand");
      await expand.scrollIntoViewIfNeeded();
      const scroll = await page.evaluate(() => scrollY);
      const hash = await page.evaluate(() => location.hash);
      const saved = await page.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      );
      await expand.click();
      const viewer = page.getByRole("dialog", {
        name: "MuscleMap",
        exact: true,
      });
      await viewer.waitFor();
      await viewer
        .getByRole("navigation", { name: "미리보기 화면 선택" })
        .getByRole("button")
        .first()
        .click();
      const first = await viewer.locator(".media-viewer-stage img").getAttribute("src");
      await viewer
        .getByRole("button", { name: "다음 화면", exact: true })
        .click();
      const second = await viewer.locator(".media-viewer-stage img").getAttribute("src");
      assert.notEqual(second, first);
      await page.keyboard.press("ArrowLeft");
      await page.waitForFunction(
        (src) =>
          document.querySelector(".media-viewer-stage img")?.getAttribute("src") ===
          src,
        first,
      );
      assert.equal(await viewer.locator(".media-viewer-stage img").getAttribute("src"), first);
      const stage = viewer.locator(".media-viewer-stage");
      if (width < 900) {
        const bounds = await stage.boundingBox();
        const cdp = await page.context().newCDPSession(page);
        const y = bounds.y + bounds.height / 2;
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: 300, y }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: 100, y: y + 5 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await cdp.detach();
        await page.waitForFunction(
          (src) =>
            document.querySelector(".media-viewer-stage img")?.getAttribute("src") ===
            src,
          second,
        );
        assert.equal(
          await viewer.locator(".media-viewer-stage img").getAttribute("src"),
          second,
          "horizontal swipe selects another screen",
        );
      }
      await viewer
        .getByRole("button", { name: "화면 확대", exact: true })
        .click();
      assert.equal(
        await viewer
          .getByRole("button", { name: "화면에 맞추기", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await viewer
        .getByRole("button", { name: "화면에 맞추기", exact: true })
        .waitFor();
      if (width >= 900) {
        const bounds = await stage.boundingBox();
        await page.mouse.move(
          bounds.x + bounds.width * 0.7,
          bounds.y + bounds.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          bounds.x + bounds.width * 0.4,
          bounds.y + bounds.height / 2,
          { steps: 5 },
        );
        await page.mouse.up();
        assert.ok(
          (await stage.evaluate((el) => el.scrollLeft)) > 0,
          "drag pans the enlarged real screen",
        );
      }
      await viewer
        .getByRole("button", { name: "화면에 맞추기", exact: true })
        .click();
      await viewer
        .getByRole("navigation", { name: "미리보기 화면 선택" })
        .getByRole("button")
        .first()
        .click();
      assert.equal(await viewer.locator(".media-viewer-stage img").getAttribute("src"), first);
      await page.screenshot({ path: `${evidence}/viewer-${width}.png` });
      assert.ok(
        await viewer.evaluate((el) => el.contains(document.activeElement)),
      );
      await page.keyboard.press("Escape");
      await viewer.waitFor({ state: "detached" });
      assert.ok(await expand.evaluate((el) => el === document.activeElement));
      assert.equal(await page.evaluate(() => location.hash), hash);
      assert.ok(
        Math.abs((await page.evaluate(() => scrollY)) - scroll) < 2,
        "closing keeps reading position",
      );
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
        saved,
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    // Unique fixture images establish that distant cards are not fetched up front.
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(10000);
    await page.goto(base + "#/home");
    await page.getByRole("heading", { name: /필요한 걸 만들고/ }).waitFor();
    await page.evaluate(() => {
      const projects = JSON.parse(
        localStorage.getItem("minlab_projects_data_v2"),
      );
      const fixtures = Array.from({ length: 12 }, (_, i) => ({
        ...projects[0],
        id: "media-check-" + i,
        name: "이미지 검사 " + i,
        thumbnailUrl: "",
        screenshots: [
          {
            id: "fixture",
            url: "/MinLab/image-check/" + i + ".png",
            label: "격리된 이미지 검사",
            fit: "contain",
          },
        ],
        coverImageId: "fixture",
        workLogs: [],
        promptHistory: [],
        changelog: [],
        visible: true,
        archived: false,
      }));
      localStorage.setItem(
        "minlab_projects_data_v2",
        JSON.stringify([...fixtures, ...projects]),
      );
    });
    const requested = [];
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(/\/image-check\/\d+\.png$/, async (route) => {
      const n = Number(
        route
          .request()
          .url()
          .match(/(\d+)\.png$/)[1],
      );
      requested.push(n);
      if (n === 0) await gate;
      if (n === 11) return route.abort("failed");
      await route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jN1kAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    });
    await page.goto(base + "#/?layout=grid", { waitUntil: "domcontentloaded" });
    await page.reload({ waitUntil: "domcontentloaded" });
    const first = page.locator(
      '.archive-project[href$="/media-check-0"] .project-media',
    );
    await first.waitFor();
    await first.scrollIntoViewIfNeeded();
    const firstSize = await first.boundingBox();
    assert.ok(
      !requested.includes(11),
      "distant card has not requested its image",
    );
    release();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-project-media="media-check-0"]').dataset
          .mediaState === "ready",
    );
    sameSize(firstSize, await first.boundingBox());
    const last = page.locator('[data-project-media="media-check-11"]');
    const size = await last.boundingBox();
    await last.scrollIntoViewIfNeeded();
    await last
      .getByText("이미지를 불러오지 못했습니다.", { exact: true })
      .waitFor();
    sameSize(size, await last.boundingBox());
    await page.route(/\/media\/musclemap-map\.webp$/, (route) =>
      route.abort("failed"),
    );
    await page.goto(base + "#/projects/proj-musclemap");
    await page.locator(".scene-tabs button").first().click();
    await page.locator(".browser-showcase .media-expand").click();
    const viewer = page.getByRole("dialog", { name: "MuscleMap", exact: true });
    await viewer
      .getByRole("navigation", { name: "미리보기 화면 선택" })
      .getByRole("button")
      .last()
      .click();
    await viewer
      .getByText("이미지를 불러오지 못했습니다. 다른 화면을 선택해 보세요.", {
        exact: true,
      })
      .waitFor();
    await viewer
      .getByRole("button", { name: "이전 화면", exact: true })
      .click();
    await viewer.locator(".media-viewer-stage img").waitFor();
    await page.keyboard.press("Escape");
    await viewer.waitFor({ state: "detached" });
    await page.close();
    console.log(
      "PASS: responsive image priority, deferred requests, stable loading/error areas, full-screen keyboard/swipe/zoom and preserved route/scroll/data.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
