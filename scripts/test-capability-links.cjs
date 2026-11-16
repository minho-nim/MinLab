/* Read-only, isolated browser contexts. Uses the real bundled project/record IDs. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
async function verifyEvidenceScreens(page, evidence) {
  const before = await page.evaluate(() =>
    localStorage.getItem("minlab_projects_data_v2"),
  );
  for (const [capability, file] of [
    ["기획 및 문제 정의", "minoffia-pc-intake.jpg"],
    ["UX/UI 설계", "minially-pc-presets.jpg"],
  ]) {
    await page
      .getByRole("button", { name: capability + " ↗", exact: true })
      .click();
    const panel = page.locator(".capability-screen").first();
    const summary = panel.locator("summary");
    await summary.waitFor();
    assert.equal(await panel.getAttribute("open"), null);
    assert.equal(
      await panel.locator("img[src]").count(),
      0,
      "collapsed evidence screens do not request images",
    );
    await summary.press("Enter");
    await panel.locator('.project-media[data-media-state="ready"]').waitFor();
    const image = panel.locator("img.media-current");
    assert.ok((await image.getAttribute("src")).includes(file));
    assert.ok(
      (await panel.innerText()).includes("기록 당시 버전의 캡처는 아닙니다"),
    );
    const expand = panel.locator(".media-expand");
    const imageBox = await image.boundingBox();
    const buttonBox = await expand.boundingBox();
    assert.ok(
      buttonBox.y >= imageBox.y + imageBox.height - 1,
      "expand does not cover the app screen",
    );
    assert.ok((await summary.boundingBox()).height >= 44);
    await panel.screenshot({
      path: `${evidence}/screen-${file}-${page.viewportSize().width}.png`,
    });
    await expand.press("Enter");
    const viewer = page.locator(".media-viewer");
    await viewer.waitFor();
    assert.ok(
      (await viewer.locator("img.viewer-screen").getAttribute("src")).includes(
        file,
      ),
    );
    await page.keyboard.press("Escape");
    await viewer.waitFor({ state: "detached" });
    assert.equal(
      await expand.evaluate((n) => n === document.activeElement),
      true,
    );
    await summary.press("Space");
    assert.equal(await panel.getAttribute("open"), null);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
  }
  assert.equal(
    await page.evaluate(() => localStorage.getItem("minlab_projects_data_v2")),
    before,
  );
}
async function verifyAiWork(page, evidence) {
  const work = page.locator(".about-ai-work");
  await work.waitFor();
  const stage = page.locator(".about-timeline article").filter({ has: work });
  assert.equal(
    await stage.locator(".related-skills a, img").count(),
    0,
    "AI explanation must not repeat project cards",
  );
  assert.deepEqual(await work.locator("dt").allTextContents(), [
    "직접 정한 기준",
    "AI에 맡긴 일",
    "결과를 검토한 방식",
  ]);
  await stage.screenshot({
    path: `${evidence}/ai-work-${page.viewportSize().width}.png`,
  });
  const original = await page.evaluate(() =>
    localStorage.getItem("minlab_projects_data_v2"),
  );
  for (const [name, id, heading] of [
    ["기획 기준과 기록 보기 ↘", "planning", "기획 및 문제 정의"],
    ["구현한 기록 보기 ↘", "development", "구현 및 개발"],
    ["검증과 개선 기록 보기 ↘", "validation", "검증 및 개선"],
  ]) {
    const button = work.getByRole("button", { name, exact: true });
    await button.scrollIntoViewIfNeeded();
    await button.press("Enter");
    const title = page.locator(".capability-layout h3");
    await page.waitForFunction(
      (text) =>
        document.querySelector(".capability-layout h3")?.textContent === text &&
        document.activeElement ===
          document.querySelector(".capability-layout h3"),
      heading,
    );
    assert.ok(page.url().includes(`capability=${id}`));
    assert.equal(
      await page
        .getByRole("button", { name: heading + " ↗", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.ok(
      (await title.boundingBox()).y >= 64,
      "Focused evidence heading clears the header",
    );
    const record = page.locator(".capability-evidence article").first();
    assert.ok(await record.isVisible());
    const href = await record
      .locator("a[data-record-link]")
      .getAttribute("href");
    assert.equal(
      new URLSearchParams(href.split("?")[1]).get("log"),
      await record.getAttribute("data-evidence-log"),
    );
  }
  assert.equal(
    await page.evaluate(() => localStorage.getItem("minlab_projects_data_v2")),
    original,
  );
}
(async () => {
  const b = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3013/",
    evidence = process.env.MINLAB_EVIDENCE_DIR || "test-results/capabilities";
  await fs.mkdir(evidence, { recursive: true });
  const errors = [];
  try {
    const p = await b.newPage({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(base + "#/about");
    await p.reload();
    await verifyAiWork(p, evidence);
    await verifyEvidenceScreens(p, evidence);
    await p.getByRole("button", { name: "UX/UI 설계 ↗", exact: true }).click();
    assert.ok(p.url().includes("capability=experience"));
    const card = p.locator(".capability-evidence article").first();
    await card.waitFor();
    const id = await card.getAttribute("data-evidence-log"),
      link = card.locator("a[data-record-link]"),
      href = await link.getAttribute("href");
    assert.equal(new URLSearchParams(href.split("?")[1]).get("log"), id);
    const original = await p.evaluate(() =>
      localStorage.getItem("minlab_projects_data_v2"),
    );
    await link.scrollIntoViewIfNeeded();
    await p.waitForTimeout(80);
    const aboutY = await p.evaluate(() => scrollY);
    await p.screenshot({ path: evidence + "/about-desktop.png" });
    await link.click();
    const target = p.locator(
      ".journey-desktop .journey-record[data-linked=true]",
    );
    await target.waitFor();
    await p.waitForTimeout(150);
    assert.equal(await target.getAttribute("data-log"), id);
    assert.equal(
      await target.locator(".log-original").getAttribute("open"),
      "",
    );
    assert.ok(
      await target.evaluate((n) => n.contains(document.activeElement)),
      "arrival focuses the exact record",
    );
    assert.equal(
      await p.locator(".chapter-list [aria-current=location]").innerText(),
      "개발 기록",
    );
    assert.ok(
      await target.evaluate(
        (n) => Math.abs(n.getBoundingClientRect().top - 116) < 4,
      ),
      "linked record clears the header",
    );
    await p.screenshot({ path: evidence + "/record-desktop.png" });
    await p.goBack();
    await p
      .getByRole("button", { name: "UX/UI 설계 ↗", exact: true })
      .waitFor();
    await p.waitForTimeout(150);
    assert.equal(
      await p
        .getByRole("button", { name: "UX/UI 설계 ↗", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    assert.ok(
      Math.abs((await p.evaluate(() => scrollY)) - aboutY) < 12,
      `back restores About reading position: before=${aboutY}, after=${await p.evaluate(() => scrollY)}, header=${await p.locator(".smart-header").evaluate((n) => n.getBoundingClientRect().height)}`,
    );
    await link.click();
    await target.waitFor();
    await p.waitForTimeout(120);
    await p
      .locator("#project-result")
      .evaluate((n) =>
        n.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await p.waitForTimeout(80);

    await p.goto(base + "#/about?capability=experience");
    await link.waitFor();
    await link.click();
    await target.waitFor();
    await p.waitForTimeout(120);
    assert.ok(
      await target.evaluate(
        (n) => Math.abs(n.getBoundingClientRect().top - 116) < 4,
      ),
      "explicit link revisits the record rather than its old later scroll position",
    );
    await p.reload();
    await target.waitFor();
    await p.waitForTimeout(120);
    assert.equal(await target.getAttribute("data-log"), id);
    assert.ok(
      (await p.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      )) === original,
      "reading does not edit project data after existing startup migrations",
    );
    // A copied URL opens the exact mobile accordion, including the complete stored record.
    const mobile = await b.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        reducedMotion: "reduce",
      }),
      m = await mobile.newPage();
    m.on("pageerror", (e) => errors.push(e.message));
    await m.goto(base + "#/about");
    await verifyAiWork(m, evidence);
    await verifyEvidenceScreens(m, evidence);
    await m.goto(base + href);
    const detail = m.locator(".journey-mobile>details[data-linked=true]");
    await detail.waitFor();
    await m.waitForTimeout(120);
    assert.equal(await detail.getAttribute("data-log"), id);
    assert.equal(await detail.getAttribute("open"), "");
    assert.equal(
      await detail.locator(".log-original").getAttribute("open"),
      "",
    );
    assert.ok(
      await detail.evaluate(
        (n) => Math.abs(n.getBoundingClientRect().top - 124) < 4,
      ),
    );
    assert.ok(
      await m.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await m.screenshot({ path: evidence + "/record-mobile.png" });
    await m.reload();
    await detail.waitFor();
    await m.waitForTimeout(120);
    assert.equal(await detail.getAttribute("data-log"), id);
    await m.goto(
      base +
        href.split("?")[0] +
        "?log=" +
        encodeURIComponent('missing/" 기록 #'),
    );
    await m
      .getByText(
        "이 개발일지를 찾을 수 없습니다. 아래 목록에서 다른 기록을 선택해 주세요.",
        { exact: true },
      )
      .waitFor();
    assert.equal(await m.locator("[data-linked=true]").count(), 0);
    await p.goto(base + "#/about?capability=validation");
    await p
      .getByRole("button", { name: "검증 및 개선 ↗", exact: true })
      .waitFor();
    await p.goto(base + "#/about?capability=experience");
    await p.waitForFunction(() =>
      [...document.querySelectorAll('[aria-label="역량 선택"] button')].some(
        (n) =>
          n.textContent.includes("UX/UI") &&
          n.getAttribute("aria-pressed") === "true",
      ),
    );
    await mobile.close();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: record-matched screens with deferred loading and viewer focus, real capability excerpts, exact record URLs, desktop/mobile focus and expansion, refresh, repeated explicit links, About selection/back restoration, missing-record recovery and unchanged source data.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
