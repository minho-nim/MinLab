import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_PROJECTS } from '../data/initialData';
import { connectBackupSnapshotOnce } from './backupSnapshot';
import { parseImportJson } from './storage';
import { connectNutriFitOnce } from '../data/nutriFitProject';
import { connectCatalogOnce } from '../data/projectCatalog';

function storageFixture() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

test('published snapshot retains all five projects, ten work logs and seven prompt originals', () => {
  const parsed = parseImportJson(JSON.stringify(INITIAL_PROJECTS));
  assert.equal(parsed.success, true);
  assert.equal(parsed.projects!.length, 5);
  assert.equal(parsed.projects!.reduce((sum, project) => sum + project.workLogs.length, 0), 10);
  assert.equal(parsed.projects!.reduce((sum, project) => sum + (project.promptHistory?.length || 0), 0), 7);
  const nutrition = parsed.projects!.find(project => project.id === 'proj-1792558759961')!;
  assert.ok(nutrition.githubUrl?.endsWith('/NutriFit'));
  assert.ok(nutrition.liveUrl.startsWith('https://'));
  assert.equal(nutrition.promptHistory!.length, 6);
});

test('snapshot imports once without resurrecting subsequent user deletions', () => {
  const storage = storageFixture();
  const first = connectBackupSnapshotOnce([], storage, 'projects');
  assert.equal(first.length, 5);
  assert.deepEqual(connectBackupSnapshotOnce([], storage, 'projects'), []);
});

test('merging older NutriFit alias keeps both histories and newer browser edits without duplicate projects', () => {
  const storage = storageFixture();
  const nutrition = INITIAL_PROJECTS.find(project => project.id === 'proj-1792558759961')!;
  const local = { ...nutrition, id: 'nutrifit', name: '내 식단 앱', updatedAt: '2026-10-23T08:00:00Z', workLogs: [{ id: 'local-note', date: '2026-10-23', title: '새 작업', content: '브라우저에서 작성' }], promptHistory: [{ id: 'local-prompt', date: '2026-10-23', title: '새 프롬프트', prompt: '원문' }] };
  const merged = connectBackupSnapshotOnce([local], storage, 'projects');
  const target = merged.find(project => project.id === nutrition.id)!;
  assert.equal(merged.length, 5);
  assert.equal(target.name, local.name);
  assert.equal(target.workLogs.length, nutrition.workLogs.length + 1);
  assert.equal(target.promptHistory!.length, nutrition.promptHistory!.length + 1);
  const connected = connectCatalogOnce(connectNutriFitOnce(merged, storage, 'projects'), storage, 'projects');
  assert.equal(connected.length, 5);
  assert.equal(connected.filter(project => project.githubUrl?.endsWith('/NutriFit')).length, 1);
});

test('storage failure leaves the existing in-memory projects unchanged', () => {
  const local = [INITIAL_PROJECTS[0]];
  const result = connectBackupSnapshotOnce(local, { getItem: () => null, setItem: () => { throw new Error('Storage full'); } }, 'projects');
  assert.equal(result, local);
});
