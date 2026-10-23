import type { Project, PromptHistoryItem, WorkLog } from '../types';
import { parseRecordSource } from './recordSources';

export type GitHubDraft =
  | { kind: 'log'; projectId: string; record: WorkLog }
  | { kind: 'prompt'; projectId: string; record: PromptHistoryItem };
export interface DraftFeed { generatedAt: string; drafts: GitHubDraft[]; notices: string[]; }

export function parseDraftFeed(value: unknown): DraftFeed {
  if (!value || typeof value !== 'object') throw new Error('기록 초안 파일 형식이 올바르지 않습니다.');
  const feed = value as Record<string, unknown>;
  if (feed.version !== 1 || !Array.isArray(feed.drafts)) throw new Error('지원하지 않는 기록 초안 파일입니다.');
  const drafts: GitHubDraft[] = [];
  for (const item of feed.drafts) {
    if (!item || typeof item !== 'object' || !item.record || typeof item.projectId !== 'string') throw new Error('초안 항목을 읽지 못했습니다.');
    const record = item.record;
    const source = parseRecordSource(record.source);
    if (typeof record.id !== 'string' || typeof record.title !== 'string' || typeof record.date !== 'string' || !source) throw new Error('초안의 필수 정보가 없습니다.');
    const text = (field: unknown) => typeof field === 'string' ? field : '';
    const common = { id: record.id, title: record.title, date: record.date, source };
    if (item.kind === 'log' && typeof record.content === 'string') {
      drafts.push({ kind: 'log', projectId: item.projectId, record: { ...common, content: record.content, reason: text(record.reason), testResult: text(record.testResult), nextSteps: text(record.nextSteps), version: text(record.version), createdAt: text(record.createdAt) } });
    } else if (item.kind === 'prompt' && typeof record.prompt === 'string') {
      drafts.push({ kind: 'prompt', projectId: item.projectId, record: { ...common, prompt: record.prompt, outcome: text(record.outcome) } });
    } else throw new Error('초안 내용 형식이 올바르지 않습니다.');
  }
  return { generatedAt: typeof feed.generatedAt === 'string' ? feed.generatedAt : '', drafts, notices: Array.isArray(feed.notices) ? feed.notices.filter((v): v is string => typeof v === 'string') : [] };
}

export function projectForDraft(projects: Project[], draft: GitHubDraft): Project | undefined {
  const repo = draft.record.source?.repository.toLowerCase();
  return projects.find(project => !project.isSample && project.githubUrl?.replace(/\/$/, '').toLowerCase() === 'https://github.com/' + repo)
    || projects.find(project => project.id === draft.projectId);
}

export function isDraftSaved(projects: Project[], draft: GitHubDraft): boolean {
  return projects.some(project => (draft.kind === 'log' ? project.workLogs : project.promptHistory || [])
    .some(record => record.id === draft.record.id && record.source?.fingerprint === draft.record.source?.fingerprint));
}
