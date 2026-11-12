/* API-contract test, not a substitute for live Supabase Auth/RLS verification. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  try {
    const p = await b.newPage({
      viewport: { width: 1280, height: 1000 },
      reducedMotion: "reduce",
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let published = null,
      draft = [],
      about = null,
      revision = 0,
      conflict = false,
      denied = false;
    const calls = [];
    await p.route("https://minlab-test.supabase.co/**", async (route) => {
      const request = route.request(),
        url = new URL(request.url()),
        path = url.pathname,
        body = request.postDataJSON();
      calls.push({
        path,
        body,
        authorization: request.headers().authorization,
      });
      let status = 200,
        value = null;
      if (path === "/auth/v1/token")
        value = {
          access_token: "fake-admin-token",
          refresh_token: "fake-refresh",
          expires_in: 3600,
        };
      else if (path === "/auth/v1/logout") value = {};
      else if (path.endsWith("/portfolio_public"))
        value = published ? [{ content: published, about }] : [];
      else if (path.endsWith("/portfolio_drafts"))
        value = denied ? [] : [{ content: draft, about, revision }];
      else if (path.endsWith("/portfolio_backups"))
        value = [
          {
            id: 1,
            content: draft,
            about,
            revision,
            source: "draft",
            recorded_at: "2026-11-12T01:00:00Z",
          },
        ];
      else if (path.endsWith("/save_portfolio_draft")) {
        assert.equal(
          request.headers().authorization,
          "Bearer fake-admin-token",
        );
        if (conflict || body.expected_revision !== revision) {
          status = 409;
          value = { message: "revision_conflict" };
        } else {
          draft = body.payload;
          about = body.about_text;
          value = ++revision;
        }
      } else if (path.endsWith("/publish_portfolio_draft")) {
        assert.equal(body.expected_revision, revision);
        published = draft.filter((x) => x.visible !== false && !x.archived);
        value = ++revision;
      } else throw Error("Unexpected mock route " + path);
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
        headers: { "access-control-allow-origin": "*" },
      });
    });
    const base = process.env.MINLAB_REMOTE_TEST_URL || "http://127.0.0.1:3014/";
    await p.goto(base + "#/admin");
    await p
      .getByRole("button", { name: "관리자 로그인", exact: true })
      .waitFor();
    assert.equal(
      await p
        .getByRole("button", { name: "+ 프로젝트 등록", exact: true })
        .count(),
      0,
      "editor hidden before admin membership",
    );
    await p
      .getByRole("textbox", { name: "이메일", exact: true })
      .fill("admin@example.test");
    await p.getByLabel("비밀번호", { exact: true }).fill("fixture-only");
    await p.getByRole("button", { name: "관리자 로그인", exact: true }).click();
    await p
      .getByRole("button", { name: "서버 초안 저장", exact: true })
      .waitFor();
    await p.getByRole("button", { name: "소개 편집", exact: true }).click();
    await p
      .getByLabel("소개 문구 (이 브라우저에 저장)", { exact: true })
      .fill("서버에 저장할 실제 소개 문구 테스트");
    await p
      .getByRole("button", { name: "소개 초안 저장 ↗", exact: true })
      .click();
    await p
      .getByRole("button", { name: "서버 초안 저장", exact: true })
      .click();
    await p
      .getByText("서버 초안을 저장했습니다. 공개 내용은 유지됩니다.", {
        exact: true,
      })
      .waitFor();
    assert.ok(draft.length > 0);
    assert.equal(about, "서버에 저장할 실제 소개 문구 테스트");
    assert.equal(published, null, "draft save does not publish");
    await p
      .getByRole("button", { name: "공개 전 변경 검토", exact: true })
      .click();
    await p
      .getByRole("heading", { name: "공개 변경 사항", exact: true })
      .waitFor();
    p.once("dialog", (d) => d.accept());
    await p
      .getByRole("button", { name: "승인하고 서버에 공개", exact: true })
      .click();
    await p
      .getByText("서버 공개 반영을 완료했습니다.", { exact: true })
      .waitFor();
    assert.ok(published.length > 0);
    conflict = true;
    await p
      .getByRole("button", { name: "서버 초안 저장", exact: true })
      .click();
    await p
      .getByRole("alert")
      .filter({ hasText: "다른 창에서 내용이 바뀌었습니다" })
      .waitFor();
    assert.equal(revision, 2, "conflict does not overwrite remote state");
    await p.locator(".remote-backups summary").click();
    await p.getByRole("button", { name: "최근 백업 조회" }).click();
    await p.getByRole("button", { name: "이 백업 불러오기" }).waitFor();
    await p.getByRole("button", { name: "로그아웃", exact: true }).click();
    await p
      .getByRole("button", { name: "관리자 로그인", exact: true })
      .waitFor();
    assert.equal(
      await p.evaluate(() => sessionStorage.getItem("minlab_admin_session")),
      null,
    );
    denied = true;
    await p.getByLabel("비밀번호", { exact: true }).fill("fixture-only");
    await p.getByRole("button", { name: "관리자 로그인", exact: true }).click();
    await p
      .getByRole("alert")
      .filter({ hasText: "관리자 권한 또는 초기 테이블 설정" })
      .waitFor();
    assert.equal(
      await p
        .getByRole("button", { name: "+ 프로젝트 등록", exact: true })
        .count(),
      0,
    );
    await p.goto(base + "#/about");
    await p
      .getByText("서버에 저장할 실제 소개 문구 테스트", { exact: true })
      .waitFor();
    assert.ok(
      calls.some(
        (c) => c.path.endsWith("/portfolio_public") && !c.authorization,
      ),
      "publishable key is not sent as a fake JWT",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS (mock API only): admin gate, About + project draft persistence, explicit publish, conflict recovery, backup listing, logout, denied membership and visitor public read.",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
