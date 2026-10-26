import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDocumentFields, readWordTables } from './docxTables';
import { DOMParser } from '@xmldom/xmldom';
import { parseWorkPlanText, processSinglePlan } from './parser';

test('first-row job title supplies Excel contents without contract/worker summaries', () => {
  const fields = extractDocumentFields([[['ㅁ작업명', '케이블 포설 및 접속 작업']]]);
  const parsed = { ...parseWorkPlanText('ㅇ목적 : 다른 목적'), ...fields };
  assert.equal(processSinglePlan(parsed, 'test.docx', []).contents, '케이블 포설 및 접속 작업');
  assert.equal(parsed.작업명, '다른 목적');
});
test('workers use header columns including reordered columns, spaced labels and repeated company values', () => {
  const fields = extractDocumentFields([
    [['작업명 : 원본 작업명']],
    [['연 락 처', '회사명', 'R&R', '이름', '연락처'], ['연 락 처', '예시A', '시공 총괄', '담당A', '02-000-0000'], ['연 락 처', '예시A', '현장 운영', '담당B', '']],
    [['이름', '연락처', 'R&R', '회사명'], ['담당C', '010-0000-0000', '특수 역할', '예시B']],
  ]);
  assert.equal(fields.documentTitle, '원본 작업명');
  assert.deepEqual(fields.workers, [
    { company: '예시A', rr: '시공 총괄', name: '담당A', phone: '02-000-0000' },
    { company: '예시A', rr: '현장 운영', name: '담당B', phone: '' },
    { company: '예시B', rr: '특수 역할', name: '담당C', phone: '010-0000-0000' },
  ]);
});
test('phone numbers in unrelated tables are not inferred as workers', () => {
  assert.deepEqual(extractDocumentFields([[['고객센터', '02-000-0000']]]).workers, []);
});

test('actual company in the merged header is accepted and propagated from Word XML', () => {
  const cell = (text: string, props = '') => `<w:tc><w:tcPr>${props}</w:tcPr><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
  const row = (...cells: string[]) => `<w:tr>${cells.join('')}</w:tr>`;
  const mergeStart = '<w:vMerge w:val="restart"/>';
  const mergeContinue = '<w:vMerge/>';
  const span = '<w:gridSpan w:val="2"/>';
  const xml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl>${
    row(cell('연 락 처', mergeStart), cell('시험 업체', mergeStart), cell('R&amp;R'), cell('이름'), cell('연락처', span)) +
    row(cell('', mergeContinue), cell('', mergeContinue), cell('관리감독자'), cell('담당가'), cell('010-0000-0001', span)) +
    row(cell('', mergeContinue), cell('', mergeContinue), cell('작업자'), cell('담당나'), cell('010-0000-0002', span)) +
    row(cell('작업양호 판단기준'), cell('작업 완료', '<w:gridSpan w:val="5"/>')) +
    row(cell('10:00'), cell('내용'), cell('담당'), cell('비고'))
  }</w:tbl></w:body></w:document>`;
  const tables = readWordTables(new DOMParser().parseFromString(xml, 'application/xml') as unknown as Document);
  const fields = extractDocumentFields(tables);
  assert.deepEqual(fields.workers, [
    { company: '시험 업체', rr: '관리감독자', name: '담당가', phone: '010-0000-0001' },
    { company: '시험 업체', rr: '작업자', name: '담당나', phone: '010-0000-0002' },
  ]);
});

test('literal company header inherited through a merge does not hide populated names', () => {
  const fields = extractDocumentFields([[
    ['연락처', '회사명', 'R&R', '이름', '연락처'],
    ['연락처', '회사명', '관리감독자', '담당가', '010-0000-0001'],
    ['연락처', '회사명', '작업자', '담당나', '010-0000-0002'],
    ['연락처', '회사명', '작업자', '', ''],
    ['작업양호 판단기준', '내용', '내용', '내용', '내용'],
  ]]);
  assert.equal(fields.workers.length, 2);
  assert.equal(fields.workers[0].company, '');
  assert.match(fields.workerExtractionReason, /회사명/);
});

test('blank roster and missing header have distinct extraction reasons', () => {
  assert.match(extractDocumentFields([[['회사명', 'R&R', '이름', '연락처'], ['', '작업자', '', '']]]).workerExtractionReason, /입력된 작업자가 없습니다/);
  assert.match(extractDocumentFields([[['비상 연락', '010-0000-0000']]]).workerExtractionReason, /머리글/);
});

test('matching explains absent list, absent document fields, no match and ambiguity', () => {
  const parsed = parseWorkPlanText('ㅇ근거 : 시험 공사\nㅇ작업번호 : A1');
  assert.match(processSinglePlan(parsed, 'a.docx', []).matchFailureReason || '', /계약목록/);
  assert.match(processSinglePlan(parseWorkPlanText(''), 'a.docx', [{ 계약번호: '1', 계약명: '시험 공사' }]).matchFailureReason || '', /찾지 못했습니다/);
  assert.match(processSinglePlan(parsed, 'a.docx', [{ 계약번호: '1', 계약명: '다른 계약' }]).matchFailureReason || '', /일치하는 항목이 없습니다/);
  const duplicate = [{ 계약번호: '1', 계약명: '시험 공사' }, { 계약번호: '2', 계약명: '시험 공사' }];
  assert.match(processSinglePlan(parsed, 'a.docx', duplicate).matchFailureReason || '', /2건/);
  assert.equal(processSinglePlan({ ...parsed, 계약번호: '2' }, 'a.docx', duplicate).계약번호, '2');
  assert.equal(processSinglePlan({ ...parsed, 계약번호: '2' }, 'a.docx', duplicate).매칭상태, '✅ 성공');
});
