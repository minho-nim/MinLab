import revisions from '../data/recordCopyRevisions.json';
import type { Project, RecordSource, WorkLog } from '../types';

interface Revision {
  projectId: string;
  id: string;
  fields: Record<string, { before: string; after: string }>;
  sourceBefore?: string;
  sourceAfter?: RecordSource;
}

/** Revise published copy only where it still matches the original; preserve personal edits. */
export function refreshPublishedRecordCopy(projects: Project[]): Project[] {
  let anyChanged = false;
  const result = projects.map(project => {
    let projectChanged = false;
    const workLogs = project.workLogs.map(log => {
      const revision = (revisions as Revision[]).find(item => item.id === log.id && (item.projectId === project.id || log.source?.engine === 'codex'));
      if (!revision) return log;
      const updated = { ...log } as WorkLog & Record<string, unknown>;
      let changed = false;
      for (const [field, copy] of Object.entries(revision.fields)) {
        if (updated[field] === copy.before && copy.before !== copy.after) {
          updated[field] = copy.after;
          changed = true;
        }
      }
      if (revision.sourceBefore && revision.sourceAfter && log.source?.fingerprint === revision.sourceBefore
        && Object.entries(revision.fields).every(([field, copy]) => updated[field] === copy.after)) {
        updated.source = revision.sourceAfter;
        changed = true;
      }
      if (!changed) return log;
      projectChanged = true;
      return updated;
    });
    if (!projectChanged) return project;
    anyChanged = true;
    return { ...project, workLogs };
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
