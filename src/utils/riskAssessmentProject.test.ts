import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogProjects } from '../data/projectCatalog';
import { connectRiskAssessmentProjectOnce } from '../data/riskAssessmentProject';

test('old AI Studio links migrate even after v1 connection, preserving project records and custom links', () => {
  const values = new Map([['minlab_risk_assessment_web_connection_v1', 'true']]);
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const project = catalogProjects().find(item => item.id === 'risk-assessment-workplan-automation')!;
  const saved = { ...project, liveUrl: 'https://ai.studio/apps/old-editor', previewUrl: 'https://ai.studio/apps/old-editor', description: '사용자 설명', promptHistory: [{ id: 'saved', date: '2026-10-23', title: '기존 기록', prompt: '기존 요청' }] };
  const migrated = connectRiskAssessmentProjectOnce([saved], storage, 'projects');
  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].liveUrl, 'https://minho-nim.github.io/MinLab/apps/work-schedule/');
  assert.equal(migrated[0].previewUrl, migrated[0].liveUrl);
  assert.equal(migrated[0].description, '사용자 설명');
  assert.deepEqual(migrated[0].promptHistory, saved.promptHistory);
  assert.deepEqual(connectRiskAssessmentProjectOnce(migrated, storage, 'projects'), migrated);
  const custom = { ...saved, liveUrl: 'https://example.com/custom', previewUrl: 'https://example.com/custom' };
  values.delete('minlab_risk_assessment_web_connection_v2');
  assert.equal(connectRiskAssessmentProjectOnce([custom], storage, 'projects')[0].liveUrl, custom.liveUrl);
});
