import test from 'node:test';
import assert from 'node:assert/strict';
import { extractDocumentFields } from './docxTables';
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
