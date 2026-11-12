/* Isolated browser contexts; chapter controls never write project records or route hashes. */
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
  const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3013/";
  const evidence = process.env.MINLAB_EVIDENCE_DIR || "test-results/chapters";
  await fs.mkdir(evidence, { recursive: true });
  const errors = [];
  try {
    const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "#/projects/proj-musclemap");
    await p.locator(".chapter-list button").last().waitFor();
    const originalHash = await p.evaluate(() => location.hash),
      originalData = await p.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      );
    const nav = p.getByRole("navigation", {
      name: "프로젝트 목차",
      exact: true,
    });
    assert.equal(await nav.getByRole("button").count(), 5);
    assert.equal(await p.locator(".chapter-toggle").isVisible(), false);
    for (const label of ["기능", "문제 해결", "개발 기록", "결과", "개요"]) {
      await nav.getByRole("button", { name: label, exact: true }).click();
      await p.waitForTimeout(120);
      assert.equal(
        await nav.locator('[aria-current="location"]').innerText(),
        label,
      );
      const target = await nav
        .getByRole("button", { name: label, exact: true })
        .getAttribute("aria-controls");
      assert.ok(
        await p.evaluate(
          (id) => document.getElementById(id).contains(document.activeElement),
          target,
        ),
        "selection focuses target heading",
      );
    }
    await p
      .locator("#project-development")
      .evaluate((n) =>
        n.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await p.waitForTimeout(120);
    assert.equal(
      await nav.locator('[aria-current="location"]').innerText(),
      "개발 기록",
      "native scroll follows current reading section",
    );
    const rail = await p.locator(".project-chapters").boundingBox(),
      content = await p.locator(".journey-record").first().boundingBox();
    assert.ok(
      rail.x >= content.x + content.width + 16,
      "desktop rail reserves its own space",
    );
    await p.screenshot({ path: evidence + "/desktop.png" });
    assert.equal(
      await p.evaluate(() => location.hash),
      originalHash,
      "chapter selection keeps project history route",
    );
    assert.equal(
      await p.evaluate(() => localStorage.getItem("minlab_projects_data_v2")),
      originalData,
      "chapter navigation does not edit project data",
    );
    for (const width of [320, 390, 768, 1100]) {
      const context = await browser.newContext({
        viewport: { width, height: 844 },
        hasTouch: true,
        reducedMotion: "reduce",
      });
      const m = await context.newPage();
      m.on("pageerror", (e) => errors.push(e.message));
      await m.goto(base + "#/projects/proj-musclemap");
      const toggle = m.locator(".chapter-toggle");
      await toggle.waitFor();
      const list = m.getByRole("navigation", {
        name: "프로젝트 목차",
        exact: true,
      });
      assert.equal(await list.isVisible(), false);
      await toggle.tap();
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      await m.keyboard.press("Escape");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.ok(await toggle.evaluate((n) => n === document.activeElement));
      await toggle.tap();
      await m.touchscreen.tap(5, 240);
      assert.equal(
        await toggle.getAttribute("aria-expanded"),
        "false",
        "outside tap closes the nonmodal menu",
      );
      await toggle.tap();
      await list.getByRole("button", { name: "개발 기록", exact: true }).tap();
      await m.waitForTimeout(120);
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await toggle.locator("strong").innerText(), "개발 기록");
      await toggle.tap();
      await list.getByRole("button", { name: "기능", exact: true }).tap();
      await m.waitForTimeout(120);
      assert.equal(await toggle.locator("strong").innerText(), "기능");
      assert.ok(
        await m.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "no horizontal overflow",
      );
      if (width === 390) await m.screenshot({ path: evidence + "/mobile.png" });
      await context.close();
    }
    const sample = await p.evaluate(
      () => JSON.parse(localStorage.getItem("minlab_projects_data_v2"))[0],
    );
    const emptyContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await emptyContext.addInitScript(
      (project) =>
        localStorage.setItem(
          "minlab_projects_data_v2",
          JSON.stringify([
            {
              ...project,
              id: "chapter-empty-fixture",
              name: "기록 없는 테스트",
              screenshots: [],
              thumbnailUrl: "",
              coverImageId: "",
              keyFeatures: [],
              workLogs: [],
              changelog: [],
              promptHistory: [],
            },
          ]),
        ),
      sample,
    );
    const empty = await emptyContext.newPage();
    empty.on("pageerror", (e) => errors.push(e.message));
    await empty.goto(base + "#/projects/chapter-empty-fixture");
    await empty.locator(".chapter-toggle").click();
    await empty
      .getByRole("navigation", { name: "프로젝트 목차", exact: true })
      .getByRole("button", { name: "기능", exact: true })
      .click();
    await empty.waitForFunction(
      () =>
        document.querySelector(".chapter-toggle strong")?.textContent ===
        "기능",
    );
    assert.equal(
      await empty.locator("#project-showcase.showcase-empty").count(),
      1,
      "empty showcase keeps a real chapter target",
    );
    await emptyContext.close();
    // Smooth scrolling keeps focus on the requested heading; unsupported motion remains usable.
    await p.emulateMedia({ reducedMotion: "no-preference" });
    await nav.getByRole("button", { name: "문제 해결", exact: true }).click();
    await p.waitForFunction(
      () =>
        document.querySelector('.chapter-list [aria-current="location"]')
          ?.textContent === "문제 해결",
      undefined,
      { timeout: 3000 },
    );
    assert.equal(
      await nav.locator('[aria-current="location"]').innerText(),
      "문제 해결",
      JSON.stringify(
        await p
          .locator(".project-chapter-target")
          .evaluateAll((ns) =>
            ns.map((n) => ({ id: n.id, y: n.getBoundingClientRect().top })),
          ),
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: five chapter targets, native scroll sync, keyboard focus/Escape, outside touch, closed mobile disclosure, desktop spacing, reduced/smooth motion, unchanged history/data and 320–1440 px layouts.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
