/* Read-only, isolated browser contexts. Uses the real bundled project/record IDs. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
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
      `back restores About reading position: before=${aboutY}, after=${await p.evaluate(()=>scrollY)}, header=${await p.locator(".smart-header").evaluate(n=>n.getBoundingClientRect().height)}`,
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
      "PASS: real capability excerpts, exact record URLs, desktop/mobile focus and expansion, refresh, repeated explicit links, About selection/back restoration, missing-record recovery and unchanged source data.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
