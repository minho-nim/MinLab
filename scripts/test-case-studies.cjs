/* Real rendered project content. Isolated storage, no production writes. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence = process.env.MINLAB_EVIDENCE_DIR || "test-results/case-studies";
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
    for (const width of [320, 390, 768, 1024, 1440]) {
      const p = await browser.newPage({
        viewport: { width, height: width === 320 ? 568 : 1000 },
        reducedMotion: "reduce",
      });
      p.setDefaultTimeout(10000);
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(base);
      await p
        .getByRole("heading", { name: "MinLab 둘러보기", exact: true })
        .waitFor();
      assert.equal(await p.locator("dialog[open]").count(), 0);
      await p
        .getByRole("navigation", { name: "메인 화면 탐색" })
        .getByRole("link", { name: "홈", exact: true })
        .click();
      await p.locator(".home-hero").waitFor();
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      const raw = await p.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      );
      assert.equal(
        await p
          .locator(
            width >= 900 ? ".hero-project" : ".hero-thumbnail-track button",
          )
          .count(),
        2,
      );
      await p.goto(base + "#/projects/proj-crossroads-ai-verdict");
      await p.locator(".scene-tabs button").last().waitFor();
      assert.equal(await p.locator(".scene-tabs button").count(), 5);
      const seen = [];
      for (const index of [0, 2, 4, 1, 3]) {
        await p.locator(".scene-tabs button").nth(index).click();
        await p.waitForFunction(
          (i) =>
            document.querySelector(".scene-current select")?.value ===
              String(i) &&
            document.querySelector(".scene-stories .is-active")?.dataset
              .scene === String(i),
          index,
        );
        await p.waitForTimeout(150);
        assert.equal(
          await p.locator(".scene-current select").inputValue(),
          String(index),
        );
        const img = p.locator(".browser-showcase img.media-current");
        await img.waitFor();
        await p.waitForFunction(
          () =>
            document.querySelector(".browser-showcase .project-media")?.dataset
              .mediaState === "ready",
        );
        seen.push(await img.getAttribute("src"));
      }
      assert.equal(new Set(seen).size, 5);
      await p.mouse.wheel(0, -20);
      await p.locator('.scene-stories [data-scene="1"]').evaluate((n) => {
        const preview = document.querySelector(".browser-showcase");
        const h = preview.getBoundingClientRect().height;
        const top = parseFloat(getComputedStyle(preview).top) || 0;
        const anchor = matchMedia("(max-width:899px)").matches
          ? Math.min(
              innerHeight * 0.8,
              Math.max(innerHeight * 0.35, h + top + 24),
            )
          : innerHeight * 0.35;
        scrollTo(0, scrollY + n.getBoundingClientRect().top - anchor + 24);
      });
      await p.waitForFunction(
        () =>
          document.querySelector(".scene-stories .is-active")?.dataset.scene ===
          "1",
      );
      const expand = p.locator(".browser-showcase .media-expand");
      const imageBox = await p
        .locator(".browser-showcase img.media-current")
        .boundingBox();
      const expandBox = await expand.boundingBox();
      assert.ok(
        expandBox.y >= imageBox.y + imageBox.height - 1,
        "Expand control must not cover the app screen",
      );
      await expand.click();
      const dialog = p.getByRole("dialog", {
        name: "MINOVA(미노바)",
        exact: true,
      });
      await dialog.waitFor();
      const close = dialog.getByRole("button", {
        name: "화면 미리보기 닫기",
        exact: true,
      });
      assert.ok(await close.isVisible());
      const closeBox = await close.boundingBox();
      assert.ok(
        closeBox.y >= 0 &&
          closeBox.y + closeBox.height <= (await p.evaluate(() => innerHeight)),
      );
      await p.keyboard.press("ArrowRight");
      await p.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached" });
      assert.equal(
        await p
          .locator(".browser-showcase .media-expand")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      assert.equal(await p.locator(".project-making article").count(), 3);
      assert.ok(
        !(await p.locator("#project-problem").innerText()).includes(
          "사용자 요청",
        ),
      );
      await p.locator("#project-showcase").scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${evidence}/minova-${width}.png` });
      assert.ok(
        await p.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await p.goto(base + "#/projects/proj-snake-race");
      await p.locator(".feature-showcase").waitFor();
      assert.equal(
        await p.locator(".scene-tabs,.scene-controls,.scene-progress").count(),
        0,
      );
      await p.goto(base + "#/projects/proj-1792978415000");
      await p
        .getByRole("heading", { name: "Valumin", exact: true, level: 1 })
        .waitFor();
      assert.equal(await p.locator(".scene-tabs button").count(), 4);
      assert.ok(
        (await p.locator(".scene-notice").allTextContents()).some((t) =>
          t.includes("WorthIt"),
        ),
      );
      await p.goto(base + "#/about");
      await p.locator(".about-timeline article").first().waitFor();
      assert.ok(
        (
          await p
            .locator(".about-timeline article")
            .first()
            .locator(".related-skills a")
            .first()
            .getAttribute("href")
        ).includes("risk-assessment-workplan-automation"),
      );
      await p
        .getByRole("button", { name: "기획 및 문제 정의 ↗", exact: true })
        .click();
      await p.locator(".capability-narrative").first().waitFor();
      assert.equal(
        await p.evaluate(() => localStorage.getItem("minlab_projects_data_v2")),
        raw,
      );
      assert.deepEqual(errors, []);
      await p.close();
    }
    const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    await p.goto(base + "#/");
    await p.locator(".archive-project").first().waitFor();
    await p.reload();
    await p.locator(".archive-project").first().waitFor();
    const original = await p.evaluate(() =>
      localStorage.getItem("minlab_projects_data_v2"),
    );
    await p.evaluate(() =>
      localStorage.setItem(
        "minlab_portfolio_order_v1",
        JSON.stringify(["proj-musclemap", "proj-crossroads-ai-verdict"]),
      ),
    );
    await p.reload();
    assert.equal(
      await p.locator(".archive-project").first().getAttribute("href"),
      "#/projects/proj-musclemap",
    );
    await p.locator(".archive-project").first().click();
    assert.equal(
      await p.locator(".next-project").getAttribute("href"),
      "#/projects/proj-crossroads-ai-verdict",
    );
    await p.reload();
    assert.equal(
      await p.evaluate(() => localStorage.getItem("minlab_projects_data_v2")),
      original,
    );
    await p.close();
    console.log(
      "PASS: entry preserved, two representatives, five distinct MINOVA scenes, scroll/click sync, viewer Escape/focus, single scene controls omitted, Valumin naming, About evidence, explicit order and unchanged raw data at 320/390/768/1024/1440px.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
