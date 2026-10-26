import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { buildKissWorkbook, DEFAULT_KISS_CALENDAR, kissDate, readKissAccounts, validateKissExport } from './kissExport';
import template from './kissTemplate.json';
import type { KissExcelOptions, ProcessedItem } from '../types';

const options: KissExcelOptions = { calTitle: DEFAULT_KISS_CALENDAR, createId: 'account1', schUserIdList: 'account1; account2', alldayYn: 'N' };
const item = {
  id: '1', 파일명: '작업절차서.docx', 매칭상태: '✅ 성공', schTitle: '전기 공사',
  contents: 'DOCX 첫칸 작업명 <&> "내용"\n다음 줄', startDate: '2026.10.26 09:15:00', endDate: '2026.10.26 18:00',
} as ProcessedItem;

test('server workbook preserves three sheet names, hidden state, headers and native formatting', async () => {
  const data = await buildKissWorkbook([item], options);
  const wb = XLSX.read(data);
  assert.deepEqual(wb.SheetNames, ['일정리스트', 'dropdown_hidden', '캘린더 참여자']);
  assert.equal(wb.Workbook?.Sheets?.[1].Hidden, 2);
  const ws = wb.Sheets['일정리스트'];
  assert.equal(ws.A7.v, DEFAULT_KISS_CALENDAR);
  assert.equal(ws.C7.v, item.contents);
  assert.equal(ws.D7.v, '2026.10.26 09:15');
  assert.equal(ws.D7.t, 's');
  assert.equal(ws.H7.v, 'N');
  assert.equal(ws.A3?.v || '', '');
  assert.match(ws.A2.v, /5\. 종일 일정/);
  assert.equal(ws.AB1.v, 'Y');
  assert.equal(ws.AB2.v, 'N');
  const zip = await JSZip.loadAsync(data);
  for (const name of ['xl/styles.xml', 'xl/theme/theme1.xml', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels'] as const) {
    assert.equal(await zip.file(name)!.async('string'), template[name]);
  }
  const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
  assert.match(sheet, /dataValidations count="4"/);
  assert.match(sheet, /<c r="D7"[^>]*t="s"><v>\d+<\/v><\/c>/);
  assert.match(sheet, /dropdown_hidden!\$A\$1:\$A\$1/);
});

test('all-day uses dates only, including same-day schedules', async () => {
  const data = await buildKissWorkbook([{ ...item, endDate: item.startDate }], { ...options, alldayYn: 'Y' });
  const ws = XLSX.read(data).Sheets['일정리스트'];
  assert.equal(ws.D7.v, '2026.10.26');
  assert.equal(ws.E7.v, '2026.10.26');
  assert.equal(ws.H7.v, 'Y');
});

test('more than original ten rows extends validations and preserves each row', async () => {
  const employees = [{ 사원번호: '001', 부서명: '부서', 직급명: '', 사원명: '계정 담당자', 사원ID: 'account1' }];
  const data = await buildKissWorkbook(Array.from({ length: 30 }, (_, i) => ({ ...item, schTitle: `일정 ${i}` })), { ...options, calTitle: '123. 다른 캘린더 ' }, employees);
  const wb = XLSX.read(data);
  assert.equal(wb.Sheets['일정리스트'].B36.v, '일정 29');
  assert.equal(wb.Sheets['일정리스트'].A36.v, '123. 다른 캘린더 ');
  assert.equal(wb.Sheets.dropdown_hidden.A1.v, '123. 다른 캘린더 ');
  assert.equal(wb.Sheets['캘린더 참여자'].A3.v, '001');
  assert.deepEqual(readKissAccounts(new Uint8Array(data).buffer), { calTitle: '123. 다른 캘린더 ', employees });
  const xml = await (await JSZip.loadAsync(data)).file('xl/worksheets/sheet1.xml')!.async('string');
  assert.match(xml, /sqref="A7:A36"/);
  assert.match(xml, /sqref="H7:H36"/);
  assert.match(xml, /dimension ref="A1:AB36"/);
});

test('invalid inputs are rejected without fabricated dates, rounding or title truncation', async () => {
  for (const raw of ['미발견', '', '2026.02.30 09:00', '2026.10.26 24:00', '2026.10.26', '2026.10.26 09:00:01']) {
    assert.equal(kissDate(raw, false), null, raw);
  }
  assert.match(validateKissExport([{ ...item, startDate: '2026.10.26 09:12' }], options).join('\n'), /15분/);
  await assert.rejects(buildKissWorkbook([{ ...item, startDate: '2026.10.26 09:12' }], options), /자동 반올림/);
  assert.ok(validateKissExport([{ ...item, schTitle: '가'.repeat(65) }], options).length);
  assert.ok(validateKissExport([item], { ...options, calTitle: '(작업일정(TEST))' }).length);
});

test('selected original workbook preserves its own hidden choices and unchanged native parts', async () => {
  const original = await buildKissWorkbook(Array.from({ length: 30 }, () => item), options);
  const templateData = new Uint8Array(original).buffer;
  const output = await buildKissWorkbook([item], { ...options, templateData });
  const before = await JSZip.loadAsync(original);
  const after = await JSZip.loadAsync(output);
  for (const part of ['xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet2.xml', 'xl/_rels/workbook.xml.rels']) {
    assert.equal(await before.file(part)!.async('string'), await after.file(part)!.async('string'));
  }
  const ws = XLSX.read(output).Sheets['일정리스트'];
  assert.equal(ws.B7.v, item.schTitle);
  assert.equal(ws.B8?.v || '', '');
  assert.equal(ws.B36?.v || '', '');
  await assert.rejects(buildKissWorkbook([item], { ...options, calTitle: '999. 없는 캘린더', templateData }), /드롭다운/);
});
