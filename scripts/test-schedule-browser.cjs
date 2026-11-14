/* Real built app, synthetic files, isolated browser: no company documents or uploads. */
const { chromium } = require("playwright");
const XLSX = require("xlsx");
const JSZip = require("jszip");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { createHash } = require("node:crypto");
const base =
  process.env.MINLAB_SCHEDULE_URL ||
  "http://127.0.0.1:3018/MinLab/apps/work-schedule/";
const evidence = "test-results/work-schedule";
const xml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraph = (s) => `<w:p><w:r><w:t>${xml(s)}</w:t></w:r></w:p>`;
const table = (rows) =>
  `<w:tbl>${rows.map((row) => `<w:tr>${row.map((cell) => `<w:tc>${paragraph(cell)}</w:tc>`).join("")}</w:tr>`).join("")}</w:tbl>`;
async function documentFile(number, contract) {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${
      table([["작업명", "예시 센터 케이블 점검"]]) +
      [
        "예시 데이터 · 실제 회사 문서가 아닙니다.",
        `ㅇ작업번호 : ${number}`,
        `ㅇ근거 : ${contract}`,
        "2026.11.14 09:00 ~ 11:00",
        "위치 : 판교",
        "ㅇ목적 : 예시 센터 케이블 상태 확인",
      ]
        .map(paragraph)
        .join("") +
      table([
        ["회사명", "R&R", "이름", "연락처"],
        ["예시 시공사", "관리감독자", "예시 담당자", ""],
        ["예시 시공사", "작업자", "예시 작업자", ""],
      ])
    }<w:sectPr/></w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  const image = await page.screenshot({
    type: "jpeg",
    quality: 88,
    animations: "disabled",
  });
  await fs.writeFile(`${evidence}/${name}.jpg`, image);
  const sha256 = createHash("sha256").update(image).digest("hex");
  // Optional one-off transport through the connected GitHub log reader. Synthetic data only.
  if (process.env.MINLAB_CAPTURE_LOG === "1") {
    const encoded = image.toString("base64");
    console.log(`MINLAB_SCREEN ${name} ${image.length} ${sha256}`);
    for (let i = 0; i < encoded.length; i += 8000)
      console.log(
        `MINLAB_SCREEN_CHUNK ${name} ${i / 8000} ${encoded.slice(i, i + 8000)}`,
      );
  }
  return { name, sha256, bytes: image.length };
}
(async () => {
  await fs.mkdir(evidence, { recursive: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["계약번호", "계약명"],
      ["DEMO-2026-001", "예시 센터 점검 공사"],
    ]),
    "예시 계약목록",
  );
  const excel = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const files = [
    {
      name: "예시_점검계획서.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: await documentFile(
        "DEMO-001",
        "예시 센터 점검 공사(DEMO-2026-001)",
      ),
    },
    {
      name: "예시_미등록계약.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: await documentFile(
        "DEMO-002",
        "목록에 없는 예시 공사(DEMO-MISSING)",
      ),
    },
  ];
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  page.setDefaultTimeout(15000);
  const errors = [],
    writes = [],
    captures = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url());
  });
  try {
    await page.goto(base);
    await page
      .getByRole("button", { name: "문서 분석 센터", exact: true })
      .waitFor();
    await page
      .locator('input[type="file"][accept=".xlsx, .xls"]')
      .setInputFiles({
        name: "예시_계약목록.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: excel,
      });
    await page
      .getByRole("heading", { name: "업로드한 계약목록 (1/1건)" })
      .waitFor();
    await page
      .locator('input[type="file"][accept=".docx"]')
      .setInputFiles(files);
    await page.getByText("선택된 문서: 2개", { exact: true }).waitFor();
    captures.push(await capture(page, "schedule-import"));
    await page
      .getByRole("button", { name: "스마트 문서 매칭 실행하기", exact: true })
      .click();
    await page.getByText(/분석 완료: 2건 중 1건 매칭 성공/).waitFor();
    await page
      .getByRole("button", { name: "매칭 리스트", exact: true })
      .click();
    const rows = page.locator("tbody tr");
    assert.equal(await rows.count(), 2);
    const success = rows.filter({ hasText: "DEMO-001" });
    const failure = rows.filter({ hasText: "DEMO-002" });
    assert.match(await success.innerText(), /성공/);
    assert.match(await success.innerText(), /예시 담당자/);
    assert.match(await failure.innerText(), /일치하는 항목이 없습니다/);
    captures.push(await capture(page, "schedule-matching"));
    await success.getByRole("button", { name: "상세 보기" }).click();
    await page
      .getByRole("button", { name: "원본 DOCX 미리보기", exact: true })
      .click();
    const original = page.frameLocator(
      'iframe[title="업로드한 원본 DOCX 미리보기"]',
    );
    await original
      .getByText("예시 데이터 · 실제 회사 문서가 아닙니다.", { exact: true })
      .waitFor();
    assert.match(await original.locator("body").innerText(), /DEMO-001/);
    captures.push(await capture(page, "schedule-document"));
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    await page
      .getByRole("button", { name: "통합 공사 일정표", exact: true })
      .click();
    await page
      .getByRole("heading", {
        name: /2026년 11월 공사 작업 일정 리스트 \(총 1건\)/,
      })
      .waitFor();
    await page.getByRole("button", { name: "달력 보기", exact: true }).click();
    assert.ok((await page.locator("main").innerText()).includes("DEMO-001"));
    assert.ok(!(await page.locator("main").innerText()).includes("DEMO-002"));
    captures.push(await capture(page, "schedule-calendar"));
    assert.deepEqual(errors, []);
    assert.deepEqual(
      writes,
      [],
      "Local file analysis must not upload documents",
    );
    await fs.writeFile(
      `${evidence}/verification.json`,
      JSON.stringify(
        {
          viewport: { width: 1440, height: 1000 },
          synthetic: true,
          success: 1,
          unmatched: 1,
          errors,
          writes,
          captures,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: actual built schedule app imports synthetic Excel/DOCX, matches one contract, explains an unmatched contract, reads workers and original DOCX, and shows only the matched task in the calendar; no document upload requests.",
    );
  } catch (e) {
    await page.screenshot({ path: `${evidence}/failure.png`, fullPage: true });
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
