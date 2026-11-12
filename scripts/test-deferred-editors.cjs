/* Run against `vite preview --base=/MinLab/ --port 3018` after a build. */
/* Isolated contexts never read or modify the user's browser data. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");

const base = process.env.MINLAB_TEST_URL || "http://127.0.0.1:3018/MinLab/";
const editorAsset =
  /\/(?:ProjectModal|ProjectDetail|WorkLogModal|JsonBackupModal|DeleteConfirmModal|DevelopmentLogView|MediaLibrary|RemoteStudio)-[^/]+\.js/;
const projectAsset = /\/assets\/ProjectModal-[^/]+\.js$/;

(async () => {
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
      });
      page.setDefaultTimeout(10000);
      const requests = [];
      const errors = [];
      page.on("request", (request) => {
        if (request.resourceType() === "script") requests.push(request.url());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base);
      await page.getByRole("heading", { name: /필요한 걸 만들고/ }).waitFor();
      assert.ok(
        requests.some((url) => /\/assets\/.*\.js/.test(url)),
        "test uses the production build",
      );
      assert.ok(
        !requests.some((url) => editorAsset.test(url)),
        "home does not request editor code",
      );
      await page.goto(base + "#/admin");
      const trigger = page.getByRole("button", { name: "+ 프로젝트 등록" });
      await trigger.waitFor();
      assert.ok(
        !requests.some((url) => projectAsset.test(url)),
        "dashboard does not load an unopened form",
      );

      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      await page.route(projectAsset, async (route) => {
        await gate;
        await route.continue();
      });
      await trigger.click();
      const loading = page.getByRole("dialog", {
        name: "편집 화면 불러오기",
        exact: true,
      });
      await loading.waitFor();
      await page.keyboard.press("Tab");
      assert.ok(
        await loading.evaluate((el) => el.contains(document.activeElement)),
        "loading dialog keeps keyboard focus",
      );
      await page.keyboard.press("Escape");
      await loading.waitFor({ state: "detached" });
      assert.ok(await trigger.evaluate((el) => el === document.activeElement));
      release();
      await trigger.click();
      const input = page.getByRole("textbox", {
        name: "프로젝트명",
        exact: true,
      });
      await input.waitFor();
      assert.ok(
        await input.evaluate((el) =>
          el.closest('[role="dialog"]').contains(document.activeElement),
        ),
      );
      await page.keyboard.press("Escape");
      await input.waitFor({ state: "hidden" });
      assert.ok(await trigger.evaluate((el) => el === document.activeElement));

      await page
        .getByRole("navigation", { name: "관리자 메뉴" })
        .getByRole("button", { name: "백업·복원", exact: true })
        .click();
      const backup = page.getByRole("dialog", { name: "데이터 백업 및 복원" });
      await backup.waitFor();
      await backup
        .getByRole("button", { name: "복원 (Import)", exact: true })
        .click();
      const jsonInput = backup.getByRole("textbox", { name: "JSON 텍스트" });
      await jsonInput.fill("아직 적용하지 않은 입력");
      await backup.getByRole("button", { name: "닫기", exact: true }).click();
      await page
        .getByRole("navigation", { name: "관리자 메뉴" })
        .getByRole("button", { name: "백업·복원", exact: true })
        .click();
      assert.equal(
        await jsonInput.inputValue(),
        "아직 적용하지 않은 입력",
        "closing and reopening retains existing backup form state",
      );
      assert.deepEqual(errors, []);
      await page.close();
    }

    const page = await browser.newPage({ reducedMotion: "reduce" });
    page.setDefaultTimeout(10000);
    await page.route(projectAsset, (route) => route.abort("failed"));
    await page.goto(base + "#/admin");
    const saved = await page.evaluate(() =>
      localStorage.getItem("minlab_projects_data_v2"),
    );
    await page.getByRole("button", { name: "+ 프로젝트 등록" }).click();
    const failure = page.getByRole("dialog", { name: "편집 화면 연결 오류" });
    await failure.waitFor();
    await failure.getByRole("button", { name: "화면 다시 불러오기" }).waitFor();
    await page.keyboard.press("Escape");
    await failure.waitFor({ state: "hidden" });
    await page.evaluate(() => {
      location.hash = "#/home";
    });
    await page.getByRole("heading", { name: /필요한 걸 만들고/ }).waitFor();
    assert.equal(
      await page.evaluate(() =>
        localStorage.getItem("minlab_projects_data_v2"),
      ),
      saved,
    );
    await page.close();
    console.log(
      "PASS: production editor requests, slow-load cancellation/focus, preserved backup form and recoverable load failure (desktop/mobile).",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
