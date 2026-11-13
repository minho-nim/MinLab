/* Uses isolated browser contexts: never edits the user's saved browser data. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
function originalFields(actual, original) {
  if (Array.isArray(original)) {
    assert.equal(actual.length, original.length);
    return actual.map((item, i) => originalFields(item, original[i]));
  }
  if (original && typeof original === "object")
    return Object.fromEntries(
      Object.keys(original).map((key) => [
        key,
        originalFields(actual?.[key], original[key]),
      ]),
    );
  return actual;
}
const base = process.env.MINLAB_TEST_URL || "http://localhost:3000/";
const evidence = process.env.MINLAB_EVIDENCE_DIR || "test-results";
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
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.getByRole("heading", { name: /필요한 걸 만들고/ }).waitFor();
    assert.equal(
      await page.getByRole("button", { name: "안내 닫기" }).count(),
      0,
    );
    await page.locator(".home-hero img").first().waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${evidence}/home-desktop.png` });
    const before = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("minlab_projects_data_v2")),
    );
    assert.ok(before.length > 0);
    assert.equal(await page.locator("iframe").count(), 0);
    await page.locator(".explorer-index button").nth(0).click();
    const first = await page.locator(".preview-copy h3").innerText();
    await page.mouse.wheel(0, 80);
    await page.waitForTimeout(200);
    assert.equal(
      await page.locator(".preview-copy h3").innerText(),
      first,
      "small wheel delta stays on current project",
    );
    await page.mouse.wheel(0, 550);
    await page.waitForTimeout(400);
    assert.notEqual(await page.locator(".preview-copy h3").innerText(), first);
    await page.mouse.wheel(0, -550);
    await page.waitForTimeout(400);
    assert.equal(await page.locator(".preview-copy h3").innerText(), first);
    await page.goto(base + "#/");
    await page.getByRole("searchbox", { name: "프로젝트 검색" }).fill("React");
    await page.getByRole("button", { name: "리스트 보기" }).click();
    await page.locator(".filter-disclosure summary").click();
    await page
      .getByRole("combobox", { name: "기술 태그 필터" })
      .selectOption("TypeScript");
    assert.ok(
      page.url().includes("q=React") && page.url().includes("layout=list"),
    );
    assert.equal(await page.locator(".text-project .project-media").count(), 0);
    const count = await page.locator(".archive-project").count();
    assert.ok(count > 0);
    const last = page.locator(".archive-project").last();
    await last.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    const previousScroll = await page.evaluate(() => scrollY);
    const url = page.url();
    await last.click();
    await page.locator(".project-intro h1").waitFor();
    assert.equal(await page.locator("iframe").count(), 0);
    await page.goBack();
    await page.getByRole("searchbox", { name: "프로젝트 검색" }).waitFor();
    await page.waitForTimeout(350);
    assert.equal(page.url(), url);
    assert.equal(
      await page.getByRole("searchbox", { name: "프로젝트 검색" }).inputValue(),
      "React",
    );
    assert.ok(
      Math.abs((await page.evaluate(() => scrollY)) - previousScroll) < 80,
      `archive scroll restored: before=${previousScroll}, after=${await page.evaluate(() => scrollY)}`,
    );
    await page
      .getByRole("searchbox", { name: "프로젝트 검색" })
      .fill("결과없음_검증");
    await page
      .getByRole("heading", { name: "검색 결과가 없습니다." })
      .waitFor();
    await page.getByRole("button", { name: "전체 프로젝트 보기" }).click();
    assert.equal(await page.locator(".archive-project").count(), before.length);
    await page.goto(base + "#/development-log");
    await page.locator(".version-index button").first().click();
    assert.ok(await page.locator(".journal-detail .log-content").innerText());
    const recordedProject = before.find((p) => p.workLogs.length > 0);
    await page
      .getByRole("combobox", { name: "개발일지 프로젝트" })
      .selectOption(recordedProject.id);
    const originalLog = [...recordedProject.workLogs].sort((a, b) =>
      b.date.localeCompare(a.date),
    )[0];
    await page.locator(".journal-detail .log-original summary").click();
    assert.equal(
      await page
        .locator(".journal-detail .log-original > div")
        .first()
        .locator("p")
        .textContent(),
      originalLog.content || originalLog.task,
    );
    const originalReason = originalLog.reason || originalLog.issues;
    if (originalReason)
      assert.ok(
        (
          await page.locator(".journal-detail .log-original").textContent()
        ).includes(originalReason),
      );
    const versionOption = recordedProject.workLogs.find(
      (l) => l.version,
    )?.version;
    if (versionOption) {
      await page
        .getByRole("combobox", { name: "개발일지 버전" })
        .selectOption(versionOption);
      assert.equal(
        await page.locator(".version-index button").count(),
        recordedProject.workLogs.filter((l) => l.version === versionOption)
          .length,
      );
    }
    await page.goto(base + "#/development-log?tab=prompts");
    assert.ok((await page.locator("main").innerText()).includes("프롬프트"));
    assert.equal(
      await page
        .getByRole("button", { name: "새 프롬프트", exact: true })
        .count(),
      0,
    );
    await page.locator(".prompt-original summary").first().click();
    assert.ok(
      await page.locator(".prompt-original[open] p").first().textContent(),
    );
    await page.goto(base + "#/admin");
    await page
      .getByRole("searchbox", { name: "관리할 프로젝트 검색" })
      .fill("없는프로젝트_관리검색");
    assert.equal(await page.locator(".admin-projects article").count(), 0);
    await page
      .getByRole("searchbox", { name: "관리할 프로젝트 검색" })
      .fill("");
    assert.equal(
      await page.locator(".admin-projects article").count(),
      before.length,
    );
    await page.getByRole("button", { name: "+ 프로젝트 등록" }).click();
    await page
      .getByRole("textbox", { name: "프로젝트명", exact: true })
      .fill("브라우저 회귀 검증");
    await page
      .getByRole("textbox", { name: "프로젝트 소개", exact: true })
      .fill("격리된 테스트 컨텍스트의 임시 데이터");
    await page.getByRole("button", { name: "초안 저장", exact: true }).click();
    await page
      .locator(".admin-projects article")
      .filter({ hasText: "브라우저 회귀 검증" })
      .getByRole("button", { name: "수정", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "프로젝트명", exact: true })
      .fill("브라우저 회귀 검증 수정");
    await page.getByRole("button", { name: "초안 저장", exact: true }).click();
    await page
      .locator(".admin-projects article")
      .filter({ hasText: "브라우저 회귀 검증 수정" })
      .getByRole("button", { name: "수정", exact: true })
      .click();
    await page
      .getByLabel("프로젝트 이미지 업로드")
      .setInputFiles("docs/screenshots/v2/home-desktop.webp");
    await page
      .getByText("브라우저에 저장된 업로드 이미지", { exact: true })
      .waitFor();
    await page
      .getByRole("textbox", { name: "이미지 1 설명" })
      .fill("회귀 검증용 실제 화면");
    await page
      .getByRole("button", { name: "이미지 URL 추가", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "이미지 2 설명" })
      .fill("로딩 실패 검증");
    await page
      .getByRole("textbox", { name: "이미지 2 주소" })
      .fill("/media/missing-regression.webp");
    await page.getByRole("button", { name: "초안 저장", exact: true }).click();
    const temporaryId = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("minlab_content_draft_v2")).find(
          (p) => p.name === "브라우저 회귀 검증 수정",
        ).id,
    );
    await page
      .getByRole("button", {
        name: "브라우저 회귀 검증 수정 표시순 내리기",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "브라우저 회귀 검증 수정 표시순 올리기",
        exact: true,
      })
      .click();
    await page.goto(base + "#/development-log?edit=1&project=" + temporaryId);
    await page
      .getByRole("button", { name: "새 개발 기록", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "기록 제목", exact: true })
      .fill("격리된 브라우저 테스트 기록");
    await page
      .getByRole("textbox", { name: "작업 내용", exact: true })
      .fill("브라우저 테스트에서만 생성하는 임시 기록");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.goto(
      base + "#/development-log?project=" + temporaryId + "&tab=prompts&edit=1",
    );
    if (
      await page
        .getByRole("button", { name: "관리자 · 상세 기록 편집", exact: true })
        .count()
    )
      await page
        .getByRole("button", { name: "관리자 · 상세 기록 편집", exact: true })
        .click();
    await page
      .getByRole("button", { name: "새 프롬프트", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "작업 제목", exact: true })
      .fill("격리된 브라우저 테스트 요청");
    await page
      .getByRole("textbox", { name: "작업 프롬프트", exact: true })
      .fill("테스트 컨텍스트에만 임시 요청을 보관하세요.");
    await page.getByRole("button", { name: "저장", exact: true }).click();
    await page.goto(base + "#/admin");
    const edited = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("minlab_content_draft_v2")),
    );
    assert.equal(edited.length, before.length + 1);
    assert.equal(edited[0].id, temporaryId);
    assert.equal(edited[0].workLogs.length, 1);
    assert.equal(edited[0].promptHistory.length, 1);
    for (const original of before)
      assert.deepEqual(
        edited.find((p) => p.id === original.id),
        original,
        "existing records remain byte-for-byte equivalent",
      );
    assert.deepEqual(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("minlab_projects_data_v2")),
      ),
      before,
      "drafts do not change visitor data",
    );
    await page.getByRole("button", { name: /변경 사항 검토/ }).click();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "승인하고 이 브라우저에 적용", exact: true })
      .click();
    await page.goto(base + "#/projects/" + temporaryId);
    await page
      .locator(".scene-tabs")
      .getByRole("button", { name: "로딩 실패 검증", exact: true })
      .click();
    await page
      .locator(".browser-showcase .media-empty")
      .getByText("이미지를 불러오지 못했습니다.", { exact: true })
      .waitFor();
    await page
      .locator(".scene-tabs")
      .getByRole("button", { name: "회귀 검증용 실제 화면", exact: true })
      .click();
    assert.equal(
      await page
        .locator(".browser-showcase img.media-current")
        .evaluate((el) => getComputedStyle(el).objectFit),
      "contain",
    );
    await page.goto(base + "#/admin");
    await page
      .getByRole("navigation", { name: "관리자 메뉴" })
      .getByRole("button", { name: "백업·복원", exact: true })
      .click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "JSON 파일 다운로드", exact: true })
      .click();
    const download = await downloadPromise;
    const backup = JSON.parse(await fs.readFile(await download.path(), "utf8"));
    assert.deepEqual(backup, edited);
    await page
      .getByRole("button", { name: "복원 (Import)", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "JSON 텍스트" })
      .fill(JSON.stringify(before));
    page.once("dialog", (dialog) => dialog.accept());
    await page
      .getByRole("button", {
        name: "가져올 데이터 검증 및 변경 미리보기",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "백업 생성 후 복원 적용", exact: true })
      .click();
    await page.getByRole("button", { name: /변경 사항 검토/ }).click();
    page.once("dialog", (d) => d.accept());
    await page
      .getByRole("button", { name: "승인하고 이 브라우저에 적용", exact: true })
      .click();
    await page.waitForFunction(
      (n) =>
        JSON.parse(localStorage.getItem("minlab_projects_data_v2")).length ===
        n,
      before.length,
    );
    assert.deepEqual(
      originalFields(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("minlab_projects_data_v2")),
        ),
        before,
      ),
      before,
    );
    // Delete only the explicitly created test record, then restore original snapshot.
    await page.getByRole("button", { name: "+ 프로젝트 등록" }).click();
    await page
      .getByRole("textbox", { name: "프로젝트명", exact: true })
      .fill("삭제 검증용 임시 프로젝트");
    await page.getByRole("button", { name: "초안 저장", exact: true }).click();
    await page
      .locator(".admin-projects article")
      .filter({ hasText: "삭제 검증용 임시 프로젝트" })
      .getByRole("button", { name: "삭제", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "삭제 확인" })
      .getByRole("button", { name: "삭제", exact: true })
      .click();
    assert.deepEqual(
      originalFields(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("minlab_projects_data_v2")),
        ),
        before,
      ),
      before,
    );
    const floatingMenu = page.getByRole("button", {
      name: "플로팅 전체 메뉴 열기",
      exact: true,
    });
    if (await floatingMenu.count()) await floatingMenu.click();
    else
      await page
        .getByRole("button", { name: "전체 메뉴 열기", exact: true })
        .click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert.equal(errors.length, 0, errors.join("\n"));
    await page.goto(base + "#/projects/proj-musclemap");
    await page.locator(".scene-tabs button").nth(1).click();
    await page.waitForTimeout(700);
    assert.ok(
      (
        await page
          .locator(".browser-showcase img.media-current")
          .getAttribute("src")
      ).includes("musclemap-map"),
    );
    await page.locator(".journey-versions button").nth(1).click();
    assert.equal(
      await page.locator(".journey-versions [aria-current=true]").count(),
      1,
    );
    await page
      .locator(".journey-record")
      .nth(1)
      .getByRole("combobox", { name: "개발 기록 비교" })
      .selectOption({ index: 1 });
    assert.equal(
      await page
        .locator(".journey-desktop .version-comparison section")
        .count(),
      5,
    );
    const lastProject = before.filter((p) => p.visible !== false).at(-1);
    await page.goto(base + "#/projects/" + lastProject.id);
    await page
      .getByRole("heading", { name: lastProject.name, exact: true, level: 1 })
      .waitFor();
    assert.equal(
      await page.locator(".next-project").getAttribute("href"),
      await page.evaluate(
        () => sessionStorage.getItem("minlab_last_archive") || "#/",
      ),
    );
    await page.goto(base + "#/admin");
    await page.getByRole("button", { name: "+ 프로젝트 등록" }).click();
    await page
      .getByRole("textbox", { name: "프로젝트명", exact: true })
      .fill("저장하지 않을 입력");
    page.once("dialog", (d) => d.dismiss());
    await page.keyboard.press("Escape");
    assert.equal(
      await page.getByRole("dialog", { name: "프로젝트 편집" }).count(),
      1,
    );
    page.once("dialog", (d) => d.accept());
    await page.keyboard.press("Escape");
    assert.equal(
      await page.getByRole("dialog", { name: "프로젝트 편집" }).count(),
      0,
    );
    await context.close();
    for (const width of [320, 375, 390, 768, 1280, 1440]) {
      const mobile = await browser.newContext({
        viewport: { width, height: 844 },
        isMobile: width < 900,
        hasTouch: width < 900,
        reducedMotion: "reduce",
      });
      const p = await mobile.newPage();
      for (const hash of [
        "#/home",
        "#/",
        "#/projects/proj-musclemap",
        "#/development-log",
        "#/about",
        "#/admin",
      ]) {
        await p.goto(base + hash);
        await p.locator("main").waitFor();
        await p.waitForTimeout(150);
        const bounds = await p.evaluate(() => ({
          body: document.documentElement.scrollWidth,
          view: document.documentElement.clientWidth,
          inner: innerWidth,
        }));
        assert.ok(
          bounds.body <= width + 1 && bounds.inner <= width + 1,
          `${width} ${hash}: overflow ${JSON.stringify(bounds)}`,
        );
        assert.equal(await p.locator("iframe").count(), 0);
        if (width === 390 || width === 1280)
          await p.screenshot({
            path: `${evidence}/${width}-${hash.replace(/[^a-z]/g, "")}.png`,
            fullPage: true,
          });
      }
      await p.goto(base + "#/home");
      await p.locator(".home-hero").waitFor();
      if (width < 900) {
        const choices = p
          .getByRole("navigation", { name: "첫 화면 프로젝트 선택" })
          .getByRole("button");
        const secondName = (
          await choices.nth(1).getAttribute("aria-label")
        ).replace(" 화면 선택", "");
        await choices.nth(1).scrollIntoViewIfNeeded();
        const homeUrl = p.url();
        await choices.nth(1).click();
        assert.equal(
          await p.locator(".hero-mobile-caption strong").innerText(),
          secondName,
        );
        assert.equal(
          p.url(),
          homeUrl,
          "thumbnail selection keeps visitors on home",
        );
        assert.equal(await choices.nth(1).getAttribute("aria-pressed"), "true");
        const large = await p
          .locator(".hero-mobile-featured>.project-media")
          .boundingBox();
        assert.ok(
          large.width > width * 0.8,
          "mobile product preview uses full content width",
        );
        await choices.nth(1).press("End");
        assert.equal(await choices.last().getAttribute("aria-pressed"), "true");
        await choices.last().press("Home");
        assert.equal(
          await choices.first().getAttribute("aria-pressed"),
          "true",
        );
        await p.locator(".preview-copy h3").scrollIntoViewIfNeeded();
        await p.waitForTimeout(200);
        const box = await p.locator(".preview-copy h3").boundingBox();
        const cdp = await mobile.newCDPSession(p);
        const y = box.y + Math.min(15, box.height / 2);
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: [{ x: box.x + box.width * 0.8, y, id: 1 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: box.x + box.width * 0.2, y, id: 1 }],
        });
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
        await p.waitForTimeout(100);
        assert.equal(
          await p
            .locator(".explorer-index button")
            .nth(1)
            .getAttribute("aria-current"),
          "true",
          "touch swipe advances one project",
        );
        await p.getByRole("button", { name: "다음 대표 프로젝트" }).click();
        assert.equal(
          await p.locator(".explorer-index [aria-current]").count(),
          1,
        );
      }
      assert.equal(
        await p
          .locator(".hero-copy h1>span")
          .first()
          .evaluate((el) => getComputedStyle(el).animationName),
        "none",
      );
      if (width < 900) {
        await p.goto(base + "#/projects/proj-musclemap");
        await p.locator(".scene-tabs button").nth(1).click();
        await p.waitForTimeout(100);
        assert.equal(
          await p
            .locator(".scene-tabs button")
            .nth(1)
            .getAttribute("aria-pressed"),
          "true",
        );
        const pinned = await p.locator(".browser-showcase").boundingBox();
        const pinnedTop = await p
          .locator(".browser-showcase")
          .evaluate((node) => parseFloat(getComputedStyle(node).top));
        const chapters = await p.locator(".project-chapters").boundingBox();
        assert.ok(
          Math.abs(pinned.y - pinnedTop) < 3 &&
            pinned.y >= chapters.y + chapters.height + 8,
          "selected mobile scene stays pinned below chapter navigation",
        );
        assert.ok(
          (
            await p
              .locator(".browser-showcase img.media-current")
              .getAttribute("src")
          ).includes("musclemap-map"),
        );
      }
      await mobile.close();
    }
    console.log(
      "PASS: real data, wheel thresholds, archive URL/back/scroll, logs/prompts, CRUD, backup/restore, menu keyboard, touch swipe, image upload/failure/fit and backup, reduced motion, 320/375/390/768/1280/1440px layouts.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
