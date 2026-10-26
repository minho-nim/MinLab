import published from '../../public/data/github-drafts.json';
import type { Project } from '../types';
import { parseDraftFeed, projectForDraft, type GitHubDraft } from './githubDrafts';
import { connectPromptPresentation, retiredPromptKeys } from './promptPresentation';

const LEDGER_KEY = 'minlab_published_records_v1';
const entryKey = (entry: GitHubDraft) => entry.kind + ':' + entry.record.id;

/** Published records are finalized by an explicit Codex update request; no inbox or polling. */
export function connectPublishedRecords(projects: Project[], storage: Pick<Storage, 'getItem' | 'setItem'>, dataKey: string): Project[] {
  try {
    projects = connectPromptPresentation(projects, storage, dataKey);
    const feed = parseDraftFeed(published);
    let previous: GitHubDraft[] = [];
    try {
      const raw = storage.getItem(LEDGER_KEY);
      if (raw) previous = parseDraftFeed(JSON.parse(raw)).drafts;
    } catch { /* A broken ledger must not prevent reading the archive. */ }
    const ledger = new Map(previous.filter(entry => entry.kind !== 'prompt' || !retiredPromptKeys.has(entry.projectId + ':' + entry.record.id)).map(entry => [entryKey(entry), entry]));
    let result = projects;
    for (const entry of feed.drafts) {
      const field = entry.kind === 'log' ? 'workLogs' : 'promptHistory';
      const owner = result.find(project => (project[field] || []).some(record => record.id === entry.record.id));
      const target = owner || projectForDraft(result, entry);
      if (!target) continue; // Do not recreate a project the user removed.
      const current = target[field] || [];
      const existing = current.find(record => record.id === entry.record.id);
      const key = entryKey(entry);
      const prior = ledger.get(key);
      if (!existing && !prior) {
        const record = entry.kind === 'log' ? { ...entry.record, projectId: target.id, projectName: target.name } : entry.record;
        result = result.map(project => project.id === target.id ? { ...project, [field]: [record, ...current] } as Project : project);
      } else if (existing && prior && existing.source?.engine === 'codex' && existing.source.fingerprint !== entry.record.source?.fingerprint) {
        // Apply publisher revisions only to fields the user has not edited locally.
        const next = { ...existing } as Record<string, unknown>;
        const old = prior.record as unknown as Record<string, unknown>;
        for (const [name, value] of Object.entries(entry.record)) {
          if (name !== 'source' && next[name] === old[name]) next[name] = value;
        }
        next.source = entry.record.source;
        result = result.map(project => project.id === target.id ? { ...project, [field]: current.map(record => record.id === entry.record.id ? next : record) } as Project : project);
      }
      // Remember deletions so a page reload does not resurrect a removed record.
      ledger.set(key, entry);
    }
    try {
      if (result !== projects) storage.setItem(dataKey, JSON.stringify(result));
      storage.setItem(LEDGER_KEY, JSON.stringify({ version: 1, drafts: [...ledger.values()] }));
    } catch { /* Display published records even if the browser cannot persist them. */ }
    return result;
  } catch {
    // Preserve all local data if publication or browser storage is unavailable.
    return projects;
  }
}
