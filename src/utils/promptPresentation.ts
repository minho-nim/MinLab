import snapshot from '../data/archiveSnapshot.json';
import published from '../../public/data/github-drafts.json';
import retired from '../data/retiredPromptIds.json';
import type { Project, PromptHistoryItem } from '../types';
import { parseDraftFeed } from './githubDrafts';

const VERSION_KEY = 'minlab_prompt_presentation_v1';
const keyFor = (projectId: string, id: string) => projectId + ':' + id;
export const retiredPromptKeys = new Set(retired.map(item => keyFor(item.projectId, item.id)));

/** One-time user-requested consolidation of published chat fragments into task prompts. */
export function connectPromptPresentation(projects: Project[], storage: Pick<Storage, 'getItem' | 'setItem'>, dataKey: string): Project[] {
  try {
    if (storage.getItem(VERSION_KEY)) return projects;
    const prompts = [
      ...snapshot.flatMap(project => (project.promptHistory || []).map(record => ({ projectId: project.id, record: record as PromptHistoryItem }))),
      ...parseDraftFeed(published).drafts.filter(entry => entry.kind === 'prompt'),
    ];
    const canonical = new Map(prompts.map(entry => [keyFor(entry.projectId, entry.record.id), entry.record]));
    const result = projects.map(project => ({
      ...project,
      promptHistory: (project.promptHistory || [])
        .filter(prompt => !retiredPromptKeys.has(keyFor(project.id, prompt.id)) && !(prompt.source?.engine === 'codex' && retired.some(item => item.id === prompt.id)))
        .map(prompt => {
          const replacement = canonical.get(keyFor(project.id, prompt.id))
            || (prompt.source?.engine === 'codex' ? prompts.find(entry => entry.record.id === prompt.id)?.record : undefined);
          return replacement ? { ...prompt, title: replacement.title, prompt: replacement.prompt, outcome: replacement.outcome, source: replacement.source } : prompt;
        }),
    }));
    try {
      storage.setItem(dataKey, JSON.stringify(result));
      storage.setItem(VERSION_KEY, '1');
    } catch { /* Present the consolidated copy without creating a separate backup. */ }
    return result;
  } catch { return projects; }
}
