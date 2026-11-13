/* Real records remain immutable; only the final equality case uses local fixtures. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const evidence =
  process.env.MINLAB_EVIDENCE_DIR || "test-results/record-exploration";
const digest = (s) =>
  createHash("sha256")
    .update(s || "")
    .digest("hex");
const recordNode = (page, width, id) =>
  page.locator(
    (width >= 900
      ? ".journey-desktop .journey-record"
      : ".journey-mobile>details") +
      "[data-log=" +
      JSON.stringify(id) +
      "]",
  );
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
      await page.goto(base + "#/home");
      await page.locator(".home-hero").waitFor();
      const project = await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("minlab_projects_data_v2"))
            .filter((p) => p.visible !== false && p.workLogs.length >= 3)
            .sort((a, b) => b.workLogs.length - a.workLogs.length)[0],
      );
      await page.goto(base + "#/projects/" + encodeURIComponent(project.id));
      const search = page.getByRole("searchbox", { name: "개발일지 검색" });
      await search.waitFor();
      const saved = digest(
        await page.evaluate(() =>
          localStorage.getItem("minlab_projects_data_v2"),
        ),
      );
      const scope = page.locator(
        width >= 900 ? ".journey-desktop" : ".journey-mobile",
      );
      const entries = scope.locator(
        width >= 900 ? ".journey-record" : ">details",
      );
      const ids = await entries.evaluateAll((nodes) =>
        nodes.map((n) => n.dataset.log),
      );
      assert.equal(ids.length, project.workLogs.length);
      const current = project.workLogs.find((l) => l.id === ids[0]),
        other = project.workLogs.find((l) => l.id === ids[1]);
      let node = recordNode(page, width, current.id);
      const picker = node.getByRole("combobox", { name: "개발 기록 비교" });
      await picker.selectOption(other.id);
      const panel = node.locator(".version-comparison");
      await panel.waitFor();
      assert.equal(await panel.locator("section").count(), 5);
      assert.equal(
        await panel
          .locator("section")
          .first()
          .locator("article p")
          .first()
          .textContent(),
        current.content || current.task || "기록 없음",
      );
      await panel
        .getByRole("button", { name: "순서 바꾸기", exact: true })
        .click();
      assert.ok(
        (
          await panel
            .locator(".comparison-record-headings small")
            .first()
            .textContent()
        ).startsWith("비교 기록"),
      );
      assert.equal(
        await panel
          .locator("section")
          .first()
          .locator("article p")
          .first()
          .textContent(),
        other.content || other.task || "기록 없음",
      );
      await panel
        .getByRole("button", { name: "다른 항목만 보기", exact: true })
        .click();
      const states = await panel
        .locator(".comparison-field-state")
        .allTextContents();
      assert.ok(states.every((text) => text === "내용 다름"));
      await panel.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${evidence}/comparison-${width}.png` });
      await panel
        .getByRole("button", { name: "비교 닫기", exact: true })
        .click();
      await panel.waitFor({ state: "detached" });
      assert.ok(
        await picker.evaluate((el) => el === document.activeElement),
        "closing returns focus to the comparison picker",
      );
      const sought = project.workLogs.find((l) => l.id === ids.at(-1));
      await search.fill(sought.title || sought.task);
      await recordNode(page, width, sought.id).waitFor();
      assert.ok((await entries.count()) > 0);
      await search.fill("존재하지않는_기록검색_검사");
      await page
        .locator(".journey-empty")
        .getByText("맞는 개발일지가 없습니다.", { exact: true })
        .waitFor();
      await page
        .locator(".journey-empty")
        .getByRole("button", { name: "검색 초기화", exact: true })
        .click();
      assert.ok(await search.evaluate((el) => el === document.activeElement));
      assert.equal(await entries.count(), project.workLogs.length);
      if (width >= 900) {
        await page.locator(".journey-versions button").nth(1).click();
        await page.waitForFunction(
          (id) =>
            document.querySelector(
              ".journey-versions [aria-current=true] strong",
            )?.textContent === id,
          other.title || other.task || "개발 기록",
        );
      }
      await search.fill("확인할수없는_검색어");
      await page.evaluate(
        (hash) => {
          location.hash = hash;
        },
        "#/projects/" +
          encodeURIComponent(project.id) +
          "?log=" +
          encodeURIComponent(other.id),
      );
      await page.waitForFunction(
        () =>
          document.querySelector('[aria-label="개발일지 검색"]')?.value === "",
      );
      node = recordNode(page, width, other.id);
      await node.waitFor();
      assert.equal(await node.getAttribute("data-linked"), "true");
      assert.ok(
        await node.locator(".log-original").evaluate((el) => el.open),
        "deep links still open the original record after a filtered search",
      );
      assert.ok(
        await node.evaluate((el) => el.contains(document.activeElement)),
      );
      assert.equal(
        digest(
          await page.evaluate(() =>
            localStorage.getItem("minlab_projects_data_v2"),
          ),
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
    const page = await browser.newPage({
      viewport: { width: 390, height: 900 },
      reducedMotion: "reduce",
    });
    page.setDefaultTimeout(10000);
    await page.goto(base + "#/home");
    await page.locator(".home-hero").waitFor();
    const id = await page.evaluate(() => {
      const projects = JSON.parse(
        localStorage.getItem("minlab_projects_data_v2"),
      );
      const p = projects.find((p) => p.workLogs.length > 1);
      const template = p.workLogs[0];
      p.workLogs.unshift(
        {
          id: "journey-equal-a",
          date: template.date,
          version: "sample-a",
          title: "비교 검사 A",
          content: "첫 줄\n같은 내용",
          reason: "같은 이유",
          testResult: "",
          nextSteps: "",
        },
        {
          id: "journey-equal-b",
          date: template.date,
          version: "sample-b",
          title: "비교 검사 B",
          content: "  첫 줄\r\n같은 내용 \n",
          reason: "같은 이유",
          testResult: "",
          nextSteps: "",
        },
      );
      localStorage.setItem("minlab_projects_data_v2", JSON.stringify(projects));
      return p.id;
    });
    await page.goto(base + "#/projects/" + encodeURIComponent(id));
    await page.reload();
    const source = page.locator(
      '.journey-mobile>details[data-log="journey-equal-a"]',
    );
    await source.evaluate((el) => {
      el.open = true;
    });
    await source
      .getByRole("combobox", { name: "개발 기록 비교" })
      .selectOption("journey-equal-b");
    const panel = source.locator(".version-comparison");
    await panel
      .getByRole("button", { name: "다른 항목만 보기", exact: true })
      .click();
    await panel
      .getByText("비교한 항목의 내용이 모두 같습니다.", { exact: true })
      .waitFor();
    assert.equal(await panel.locator("section").count(), 0);
    await page.close();
    console.log(
      "PASS: real record search/reset, mobile/desktop comparison, raw text, difference-only/swap/close focus, exact links after search, equality and immutable stored records.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
