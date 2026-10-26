import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const dayInSeoul = value => new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
const optionalText = value => typeof value === 'string' ? value : '';
const requiredText = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(label + ' 항목이 비어 있습니다.');
  return value;
};

/** Convert explicitly authored Codex records. Never infer logs or prompts from commits. */
export function compileCodexRecords({ config, journal }) {
  if (journal?.version !== 1 || !Array.isArray(journal.records)) throw new Error('Codex 기록 파일은 version: 1, records 배열 형식이어야 합니다.');
  const since = config.recordsSince || '';
  if (since && !Number.isFinite(Date.parse(since))) throw new Error('recordsSince 날짜 형식 오류');
  const archiveRepository = config.recordsRepository;
  if (typeof archiveRepository !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(archiveRepository)) throw new Error('recordsRepository 저장소 이름 형식 오류');
  const fileUrl = 'https://github.com/' + archiveRepository + '/blob/main/.minlab/records.json';
  const drafts = [];
  const seen = new Set();
  let generatedAt = since || '1970-01-01T00:00:00.000Z';
  for (const entry of journal.records) {
    const project = config.projects.find(project => project.id === entry.projectId);
    if (!project) throw new Error('등록되지 않은 대상 프로젝트: ' + entry.projectId);
    requiredText(entry.id, '기록 ID');
    if (typeof entry.recordedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(entry.recordedAt) || !Number.isFinite(Date.parse(entry.recordedAt))) throw new Error('recordedAt은 시간대가 있는 ISO 8601 시각이어야 합니다.');
    const id = 'codex:' + project.id + ':' + entry.id;
    if (seen.has(id)) throw new Error('중복 기록 ID: ' + entry.id);
    seen.add(id);
    if (since && Date.parse(entry.recordedAt) <= Date.parse(since)) continue;
    if (Date.parse(entry.recordedAt) > Date.parse(generatedAt)) generatedAt = entry.recordedAt;
    const date = entry.date || dayInSeoul(entry.recordedAt);
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date + 'T00:00:00Z')) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) throw new Error('date는 실제 YYYY-MM-DD 날짜여야 합니다.');
    const title = requiredText(entry.title, '작업 제목');
    const summary = requiredText(entry.summary, '요약');
    if (!Array.isArray(entry.changes) || !entry.changes.length || !entry.changes.every(item => typeof item === 'string' && item.trim())) throw new Error('changes는 주요 변경 내용의 문자열 배열이어야 합니다.');
    const urls = entry.urls || [];
    if (!Array.isArray(urls) || !urls.every(url => typeof url === 'string' && /^https:\/\/github\.com\//.test(url))) throw new Error('관련 출처는 GitHub HTTPS 주소만 허용합니다.');
    const record = {
      id, date, title, version: optionalText(entry.version),
      content: '요약\n' + summary + '\n\n주요 변경\n' + entry.changes.map(item => '- ' + item).join('\n'),
      reason: optionalText(entry.reason),
      testResult: optionalText(entry.testResult) || '미실행: 별도로 확인한 결과 없음.',
      nextSteps: optionalText(entry.nextSteps), createdAt: entry.recordedAt,
    };
    const sourceFor = value => ({ repository: project.repository, fingerprint: digest(value), urls: [...new Set([fileUrl, ...urls])], engine: 'codex', generatedAt: entry.recordedAt });
    drafts.push({ kind: 'log', projectId: project.id, record: { ...record, source: sourceFor(record) } });
    if (entry.prompts !== undefined && !Array.isArray(entry.prompts)) throw new Error('prompts는 배열이어야 합니다.');
    const promptIds = new Set();
    for (const prompt of entry.prompts || []) {
      requiredText(prompt.id, '프롬프트 ID');
      if (promptIds.has(prompt.id)) throw new Error('중복 프롬프트 ID: ' + prompt.id);
      promptIds.add(prompt.id);
      const item = { id: id + ':prompt:' + prompt.id, date, title: requiredText(prompt.title, '프롬프트 제목'), prompt: requiredText(prompt.prompt, '프롬프트 원문'), outcome: optionalText(prompt.outcome) };
      drafts.push({ kind: 'prompt', projectId: project.id, record: { ...item, source: sourceFor(item) } });
    }
  }
  drafts.sort((a, b) => b.record.date.localeCompare(a.record.date) || a.record.id.localeCompare(b.record.id));
  return {
    version: 1, recordsSince: since, generatedAt, drafts,
    notices: [],
  };
}

async function main() {
  const root = resolve(import.meta.dirname, '..');
  const config = JSON.parse(await readFile(resolve(root, 'archive.config.json'), 'utf8'));
  const journal = JSON.parse(await readFile(resolve(root, '.minlab/records.json'), 'utf8'));
  const feed = compileCodexRecords({ config, journal });
  const outputPath = resolve(root, 'public/data/github-drafts.json');
  const output = JSON.stringify(feed, null, 2) + '\n';
  let existing = '';
  try { existing = await readFile(outputPath, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing !== output) { await mkdir(dirname(outputPath), { recursive: true }); await writeFile(outputPath, output); }
  console.log('Codex 개발일지 ' + feed.drafts.filter(item => item.kind === 'log').length + '건 · 프롬프트 ' + feed.drafts.filter(item => item.kind === 'prompt').length + '건 반영');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error('Codex 기록 반영 오류: ' + error.message); process.exitCode = 1; });
