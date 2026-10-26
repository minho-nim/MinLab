import revisions from '../data/recordCopyRevisions.json';
import type { Project, RecordSource, WorkLog, PromptHistoryItem } from '../types';

interface Revision {
  projectId: string;
  id: string;
  kind?: 'log' | 'prompt';
  fields: Record<string, { before: string; after: string }>;
  sourceBefore?: string;
  sourceAfter?: RecordSource;
}

/** Revise published copy only where it still matches the original; preserve personal edits. */
export function refreshPublishedRecordCopy(projects: Project[]): Project[] {
  let anyChanged = false;
  const result = projects.map(project => {
    let projectChanged = false;
    const revise = <T extends WorkLog | PromptHistoryItem>(record: T, kind: 'log' | 'prompt'): T => {
      const matching = (revisions as unknown as Revision[]).filter(item => (item.kind || 'log') === kind && item.id === record.id && (item.projectId === project.id || record.source?.engine === 'codex'));
      if (!matching.length) return record;
      const updated = { ...record } as T & Record<string, unknown>;
      let changed = false;
      for (const revision of matching) {
        for (const [field, copy] of Object.entries(revision.fields)) {
          if (updated[field] === copy.before && copy.before !== copy.after) {
            updated[field] = copy.after;
            changed = true;
          }
        }
        if (revision.sourceBefore && revision.sourceAfter && updated.source?.fingerprint === revision.sourceBefore
          && Object.entries(revision.fields).every(([field, copy]) => updated[field] === copy.after)) {
          updated.source = revision.sourceAfter;
          changed = true;
        }
      }
      if (!changed) return record;
      projectChanged = true;
      return updated;
    };
    const workLogs = project.workLogs.map(log => revise(log, 'log'));
    const promptHistory = project.promptHistory?.map(prompt => revise(prompt, 'prompt'));
    if (!projectChanged) return project;
    anyChanged = true;
    return { ...project, workLogs, promptHistory };
  });
  return anyChanged ? result : projects;
}

export function connectPublishedRecordCopy(projects: Project[], storage: Pick<Storage, 'setItem'>, key: string): Project[] {
  const updated = refreshPublishedRecordCopy(projects);
  if (updated !== projects) {
    try { storage.setItem(key, JSON.stringify(updated)); } catch { /* Still show revised copy when storage is full. */ }
  }
  return updated;
}
