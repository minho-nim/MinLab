import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoute, routeHash, type ArchiveRoute } from './navigation';
import { parseDraftFeed, projectForDraft, isDraftSaved } from './githubDrafts';
import { parseImportJson } from './storage';
import { catalogProjects, connectCatalogOnce } from '../data/projectCatalog';

const source = { fingerprint: 'abc', repository: 'minho-nim/ChoicePilot', urls: ['https://github.com/minho-nim/ChoicePilot/commit/abc'], engine: 'gemini' as const, generatedAt: '2026-10-23T01:00:00Z' };
const log = { id: 'github:ChoicePilot:2026-10-23', title: '작업 초안', date: '2026-10-23', content: '변경 내용', source };
const draft = { kind: 'log' as const, projectId: 'old-id', record: log };

test('permalinks round-trip including Korean IDs and refreshable record filters', () => {
  const routes: ArchiveRoute[] = [{ view: 'archive' }, { view: 'project', projectId: '한글 / ? &' }, { view: 'manage', projectId: 'project-1' }, { view: 'records', projectId: 'project 1', tab: 'prompts' }];
  for (const route of routes) assert.deepEqual(parseRoute(routeHash(route)), route);
  assert.deepEqual(parseRoute('#/projects/%not-valid'), { view: 'archive' });
});

test('draft provenance survives backup import and later deduplicates accepted records', () => {
  const project = catalogProjects().find(item => item.name === 'ChoicePilot')!;
  const parsed = parseImportJson(JSON.stringify([{ ...project, workLogs: [log], promptHistory: [{ id: 'prompt-1', title: '실제 요청', date: '2026-10-23', prompt: '원문', source: { ...source, engine: 'github' } }] }]));
  assert.equal(parsed.success, true);
  assert.deepEqual(parsed.projects![0].workLogs[0].source, source);
  assert.equal(parsed.projects![0].promptHistory![0].source?.engine, 'github');
  assert.equal(isDraftSaved(parsed.projects!, draft), true);
  assert.equal(isDraftSaved(parsed.projects!, { ...draft, record: { ...log, source: { ...source, fingerprint: 'new' } } }), false);
});

test('source repository matches a user project even when IDs differ', () => {
  const project = { ...catalogProjects().find(item => item.name === 'ChoicePilot')!, id: 'custom-user-id' };
  assert.equal(projectForDraft([project], draft)?.id, 'custom-user-id');
  assert.equal(projectForDraft([{ ...project, isSample: true }], draft), undefined);
});

test('draft feed rejects unsafe source links and accepts exact prompt originals', () => {
  assert.throws(() => parseDraftFeed({ version: 1, drafts: [{ ...draft, record: { ...log, source: { ...source, urls: ['javascript:alert(1)'] } } }] }));
  const prompt = { id: 'p-1', title: '프롬프트', date: '2026-10-23', prompt: '원문\n  공백', source: { ...source, engine: 'github' } };
  const result = parseDraftFeed({ version: 1, drafts: [{ kind: 'prompt', projectId: 'id', record: prompt }] });
  assert.equal(result.drafts[0].kind, 'prompt');
  assert.equal((result.drafts[0].record as typeof prompt).prompt, prompt.prompt);
});

test('catalog connection preserves local edits and does not resurrect later deletions', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const existing = { ...catalogProjects()[0], description: '사용자 설명', workLogs: [log] };
  const merged = connectCatalogOnce([existing], storage, 'test-projects');
  assert.deepEqual(merged[0], existing);
  assert.equal(merged.length, catalogProjects().length);
  assert.deepEqual(connectCatalogOnce([existing], storage, 'test-projects'), [existing]);
});
