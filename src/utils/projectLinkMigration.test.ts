import assert from 'node:assert/strict';
import test from 'node:test';
import type { Project } from '../types';
import { connectChoicePilotOnce } from './projectLinkMigration';
import { connectNutriFitOnce } from '../data/nutriFitProject';

const DATA_KEY = 'test-projects';
const makeStorage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    values,
  };
};

const choicePilot: Project = {
  id: 'proj-1792563333333', name: 'ChoicePilot', englishName: 'ChoicePilot',
  status: '개발 중', category: '도구', description: '기존 사용자 설명',
  keyFeatures: ['기존 기능'], techStack: ['React'], liveUrl: '', githubUrl: '',
  workLogs: [], changelog: [],
  promptHistory: [{ id: 'prompt-1', title: '기존 기록', date: '2026-10-21', prompt: '기존 프롬프트' }],
  createdAt: '2026-10-21', updatedAt: '2026-10-21',
};

test('connects existing ChoicePilot and persists links without changing records', () => {
  const storage = makeStorage();
  const other = { ...choicePilot, id: 'other', name: 'Other project' };
  const result = connectChoicePilotOnce([choicePilot, other], storage, DATA_KEY);
  assert.equal(result.length, 2);
  assert.strictEqual(result[1], other);
  assert.deepEqual(result[0], {
    ...choicePilot,
    previewUrl: 'https://minho-nim.github.io/ChoicePilot/',
    liveUrl: 'https://minho-nim.github.io/ChoicePilot/',
    githubUrl: 'https://github.com/minho-nim/ChoicePilot',
  });
  assert.deepEqual(JSON.parse(storage.getItem(DATA_KEY)!), result);
  assert.equal(choicePilot.liveUrl, '');
});

test('preserves custom URLs and respects edits after the initial connection', () => {
  const storage = makeStorage();
  const custom = {
    ...choicePilot, liveUrl: 'https://example.com/app',
    previewUrl: 'https://preview.example.com', githubUrl: 'https://github.com/example/custom',
  };
  assert.deepEqual(connectChoicePilotOnce([custom], storage, DATA_KEY), [custom]);
  const edited = [{ ...custom, previewUrl: '', liveUrl: '', githubUrl: '' }];
  assert.strictEqual(connectChoicePilotOnce(edited, storage, DATA_KEY), edited);
});

test('can connect a later import by name and leaves unrelated projects alone', () => {
  const storage = makeStorage();
  const unrelated = [{ ...choicePilot, id: 'other', name: 'Other project' }];
  assert.strictEqual(connectChoicePilotOnce(unrelated, storage, DATA_KEY), unrelated);
  assert.equal(storage.values.size, 0);
  const imported = { ...choicePilot, id: 'imported-id', name: ' choicepilot ' };
  assert.equal(connectChoicePilotOnce([imported], storage, DATA_KEY)[0].previewUrl, 'https://minho-nim.github.io/ChoicePilot/');
});

test('does not discard project data when migration storage is unavailable', () => {
  const projects = [choicePilot];
  const unavailable = {
    getItem: () => { throw new Error('Storage unavailable'); },
    setItem: () => { throw new Error('Storage unavailable'); },
  };
  assert.strictEqual(connectChoicePilotOnce(projects, unavailable, DATA_KEY), projects);
});

test('replaces retired NutriFit login links in existing browser data without duplicating the project', () => {
  const storage = makeStorage();
  storage.setItem('minlab_nutrifit_connection_v1', 'true');
  const old = { ...choicePilot, id: 'proj-1792558759961', name: '개인 식단 관리', englishName: 'NutriFit', githubUrl: 'https://github.com/minho-nim/NutriFit', liveUrl: 'https://nutrifit-minho.smokyaphid66.chatgpt.site', previewUrl: 'https://nutrifit-minho.smokyaphid66.chatgpt.site/' };
  const connected = connectNutriFitOnce([old], storage, DATA_KEY);
  assert.equal(connected.length, 1);
  assert.equal(connected[0].liveUrl, 'https://minho-nim.github.io/NutriFit-web/');
  assert.equal(connected[0].previewUrl, 'https://minho-nim.github.io/NutriFit-web/');
  assert.deepEqual(connected[0].promptHistory, old.promptHistory);
  assert.equal(connected[0].id, old.id);
  assert.equal(storage.getItem('minlab_nutrifit_connection_v2'), 'true');
  // A later import of the retired link must also be repaired.
  assert.equal(connectNutriFitOnce([old], storage, DATA_KEY)[0].liveUrl, connected[0].liveUrl);
});

test('NutriFit repair preserves custom links and subsequent intentional edits', () => {
  const storage = makeStorage();
  const custom = { ...choicePilot, id: 'nutrifit', name: 'NutriFit', liveUrl: 'https://custom.example/app', previewUrl: 'https://preview.example/app' };
  const connected = connectNutriFitOnce([custom], storage, DATA_KEY);
  assert.equal(connected[0].liveUrl, custom.liveUrl);
  assert.equal(connected[0].previewUrl, custom.previewUrl);
  const cleared = [{ ...connected[0], liveUrl: '', previewUrl: '' }];
  assert.strictEqual(connectNutriFitOnce(cleared, storage, DATA_KEY), cleared);
});
