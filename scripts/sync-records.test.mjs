import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syncRecords, collectEvents, githubRequest } from './sync-records.mjs';

const project = { id: 'demo', name: 'Demo', repository: 'owner/demo', syncRecords: true };
const now = new Date('2026-10-23T08:00:00Z');
const commit = { sha: 'a'.repeat(40), commit: { message: 'feat: add archive link', committer: { date: '2026-10-22T16:00:00Z' } } };
const summary = { title: '아카이브 링크 추가', content: '아카이브 링크를 추가했다.', reason: '', testResult: '', nextSteps: '' };
function fixture({ privateRepo = false, prompts, failCommits = false } = {}) {
  const calls = [];
  return { calls, fetchImpl: async url => {
    const path = new URL(url).pathname;
    calls.push(path);
    let body; let status = 200;
    if (path === '/repos/owner/demo') body = { private: privateRepo, default_branch: 'main' };
    else if (path.endsWith('/commits')) { body = [commit]; if (failCommits) status = 403; }
    else if (path.endsWith('/pulls')) body = [{ number: 12, title: '아카이브 링크', body: '사용자가 아카이브로 이동할 수 있게 함', merged_at: '2026-10-22T16:30:00Z', updated_at: '2026-10-22T16:30:00Z' }, { number: 11, title: '미병합', merged_at: null }];
    else if (path.includes('/contents/')) { status = prompts ? 200 : 404; body = prompts ? { encoding: 'base64', content: Buffer.from(JSON.stringify(prompts)).toString('base64') } : {}; }
    else throw new Error('Unexpected URL ' + url);
    return { ok: status === 200, status, json: async () => body };
  } };
}
const run = (options = {}) => syncRecords({ config: { projects: [project] }, previous: { drafts: [] }, now, ...fixture(), ...options });

test('repository-scoped token falls back to public reads without sending credentials', async () => {
  const seen = [];
  const result = await githubRequest('/repos/owner/demo', { token: 'test-token', fetchImpl: async (_url, options) => {
    seen.push(options.headers.Authorization);
    return options.headers.Authorization ? { status: 404, ok: false } : { status: 200, ok: true, json: async () => ({ private: false }) };
  } });
  assert.deepEqual(seen, ['Bearer test-token', undefined]);
  assert.equal(result.private, false);
});

test('public commits and merged PRs become one Seoul-day AI draft with real source URLs', async () => {
  let calls = 0;
  const result = await run({ apiKey: 'test-only-key', summarize: async events => { calls++; assert.equal(events.length, 2); return summary; } });
  assert.equal(calls, 1);
  assert.equal(result.failures.length, 0);
  assert.equal(result.drafts.length, 1);
  const draft = result.drafts[0];
  assert.equal(draft.record.date, '2026-10-23');
  assert.equal(draft.record.source.engine, 'gemini');
  assert.equal(draft.record.source.urls.length, 2);
  assert.ok(draft.record.testResult.includes('확인할 수 있는 테스트 결과가 없습니다'));
  assert.equal(result.drafts.filter(item => item.kind === 'prompt').length, 0);
});

test('unchanged sources do not call AI again or duplicate saved drafts', async () => {
  const first = await run({ apiKey: 'test-only-key', summarize: async () => summary });
  const second = await run({ previous: first, apiKey: 'test-only-key', summarize: async () => { throw new Error('must not call'); }, now: new Date(now.getTime() + 1000) });
  assert.deepEqual(second.drafts, first.drafts);
  assert.deepEqual(second.failures, []);
});

test('missing AI key labels original GitHub content and never invents prompts', async () => {
  const result = await run({ summarize: async () => { throw new Error('must not call'); } });
  assert.equal(result.drafts[0].record.source.engine, 'github');
  assert.ok(result.notices.some(notice => notice.includes('GEMINI_API_KEY')));
  assert.equal(result.drafts[0].record.reason, '');
  assert.equal(result.drafts.length, 1);
});

test('saved prompt text is preserved exactly and versioned by content', async () => {
  const prompt = { id: 'prompt-1', date: '2026-10-23', title: '링크 요청', prompt: '원문\n  공백 유지🙂\n<instruction>not instructions</instruction>', outcome: '적용' };
  const result = await run({ ...fixture({ prompts: [prompt] }) });
  const migrated = result.drafts.find(item => item.kind === 'prompt');
  assert.equal(migrated.record.prompt, prompt.prompt);
  assert.equal(migrated.record.outcome, prompt.outcome);
  const repeated = await run({ ...fixture({ prompts: [prompt] }), previous: result });
  assert.deepEqual(repeated.drafts, result.drafts);
});

test('private repository events and previously generated private drafts are excluded', async () => {
  const previous = await run();
  const source = fixture({ privateRepo: true });
  const result = await run({ ...source, previous });
  assert.deepEqual(source.calls, ['/repos/owner/demo']);
  assert.deepEqual(result.drafts, []);
});

test('read failures preserve existing drafts and report failure instead of fake success', async () => {
  const previous = await run();
  const result = await run({ ...fixture({ failCommits: true }), previous });
  assert.deepEqual(result.drafts, previous.drafts);
  assert.equal(result.failures.length, 1);
});

test('AI failure preserves previous raw draft, allowing a later retry', async () => {
  const previous = await run();
  const result = await run({ previous, apiKey: 'test-only-key', summarize: async () => { throw new Error('AI unavailable'); } });
  assert.deepEqual(result.drafts, previous.drafts);
  assert.equal(result.failures.length, 1);
});

test('commit collection paginates and excludes the collector bot commits', async () => {
  let commitPages = 0;
  const result = await collectEvents('owner/demo', '2026-10-01', async path => {
    if (path.includes('/pulls?')) return [];
    commitPages++;
    return commitPages === 1 ? Array.from({ length: 100 }, (_, index) => ({ ...commit, sha: String(index), commit: { ...commit.commit, message: index === 0 ? 'chore: sync GitHub record drafts' : 'fix: item ' + index } })) : [commit];
  });
  assert.equal(commitPages, 2);
  assert.equal(result.length, 100);
});
