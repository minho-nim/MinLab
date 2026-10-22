import assert from 'node:assert/strict';
import test from 'node:test';
import type { Project } from '../types';
import { connectChoicePilotOnce } from './projectLinkMigration';

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
