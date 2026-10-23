import { INITIAL_PROJECTS } from '../data/initialData';
import type { Project } from '../types';

const VERSION_KEY = 'minlab_backup_snapshot_2026_10_22_v2';
const nutritionAliases = new Set(['nutrifit', 'proj-1792558759961']);

const mergeById = <T extends { id: string }>(items: T[]): T[] => [...new Map(items.map(item => [item.id, item])).values()];

function repositoryKey(value?: string): string {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.hostname === 'github.com' ? url.pathname.replace(/\.git\/?$/, '').replace(/\/$/, '').toLowerCase() : '';
  } catch { return ''; }
}

/** Import the published backup once, keeping newer browser edits and all existing records. */
export function connectBackupSnapshotOnce(projects: Project[], storage: Pick<Storage, 'getItem' | 'setItem'>, dataKey: string): Project[] {
  try {
    if (storage.getItem(VERSION_KEY)) return projects;
    let merged = [...projects];
    for (const saved of INITIAL_PROJECTS) {
      const savedRepository = repositoryKey(saved.githubUrl);
      const matching = merged.filter(project => project.id === saved.id
        || (nutritionAliases.has(saved.id) && nutritionAliases.has(project.id))
        || (!saved.isSample && !project.isSample && Boolean(savedRepository) && repositoryKey(project.githubUrl) === savedRepository));
      if (!matching.length) { merged.push(saved); continue; }
      const preferred = matching.reduce((current, project) => Date.parse(project.updatedAt) > Date.parse(current.updatedAt) ? project : current, saved);
      const result: Project = {
        ...saved,
        ...preferred,
        id: saved.id,
        liveUrl: preferred.liveUrl?.trim() && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(preferred.liveUrl) ? preferred.liveUrl : saved.liveUrl,
        previewUrl: preferred.previewUrl?.trim() || saved.previewUrl,
        githubUrl: preferred.githubUrl?.trim() || saved.githubUrl,
        workLogs: mergeById([...saved.workLogs, ...matching.flatMap(project => project.workLogs || [])]).map(log => ({ ...log, projectId: saved.id, projectName: preferred.name })),
        promptHistory: mergeById([...(saved.promptHistory || []), ...matching.flatMap(project => project.promptHistory || [])]),
        keyFeatures: [...new Map([...saved.keyFeatures, ...matching.flatMap(project => project.keyFeatures || [])].map(feature => [typeof feature === 'string' ? feature : feature.id, feature])).values()],
      };
      const firstIndex = merged.findIndex(project => matching.includes(project));
      merged = merged.filter(project => !matching.includes(project));
      merged.splice(firstIndex, 0, result);
    }
    storage.setItem(dataKey, JSON.stringify(merged));
    storage.setItem(VERSION_KEY, 'true');
    return merged;
  } catch { return projects; }
}
