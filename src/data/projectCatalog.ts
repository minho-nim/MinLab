import config from '../../archive.config.json';
import type { Project } from '../types';

const CATALOG_LEDGER_KEY = 'minlab_catalog_seen_project_ids_v1';
// v6 was already imported before Crossroads was registered. Missing entries
// from that catalog may have been deliberately deleted; do not restore them.
const LEGACY_V6_IDS = [
  'proj-1792485558773', 'proj-1792563333333', 'proj-1792558759961',
  'risk-assessment-workplan-automation', 'proj-1792978415000',
  'proj-excuseoffice', 'proj-minially',
];

export function catalogProjects(): Project[] {
  return config.projects.map(item => ({
    id: item.id, name: item.name, englishName: item.name, description: item.description,
    category: item.category, status: '개발 중', techStack: item.techStack,
    liveUrl: item.appUrl, previewUrl: item.appUrl, githubUrl: item.repository ? 'https://github.com/' + item.repository : '',
    keyFeatures: [], workLogs: [], changelog: [], promptHistory: [], isSample: false, archived: false,
    createdAt: '2026-10-23T00:00:00.000Z', updatedAt: '2026-10-23T00:00:00.000Z',
  }));
}

export function connectCatalogOnce(projects: Project[], storage: Pick<Storage, 'getItem' | 'setItem'>, key: string): Project[] {
  const versionKey = 'minlab_public_catalog_v' + config.version;
  let seen = new Set<string>();
  try {
    if (storage.getItem('minlab_public_catalog_v6')) {
      seen = new Set(LEGACY_V6_IDS);
      // A project that already received published records was connected before,
      // even if it has since been removed from the user's project array.
      const publishedRaw = storage.getItem('minlab_published_records_v1');
      if (publishedRaw) {
        const published = JSON.parse(publishedRaw);
        if (Array.isArray(published?.drafts)) for (const entry of published.drafts) {
          if (typeof entry?.projectId === 'string') seen.add(entry.projectId);
        }
      }
    }
    const raw = storage.getItem(CATALOG_LEDGER_KEY);
    if (raw) {
      const ids:unknown = JSON.parse(raw);
      if (Array.isArray(ids) && ids.every(id=>typeof id==='string')) seen = new Set(ids);
    }
  } catch { /* A broken or unavailable ledger must not hide a new project. */ }
  let merged = projects;
  for (const candidate of catalogProjects()) {
    if (seen.has(candidate.id)) continue;
    const existing = merged.find(project => project.id === candidate.id || (!project.isSample && project.githubUrl?.replace(/\/$/, '').toLowerCase() === candidate.githubUrl?.toLowerCase()) || project.name.trim().toLowerCase() === candidate.name.toLowerCase());
    if (!existing) merged = [...merged, candidate];
    else if (candidate.liveUrl && (!existing.liveUrl || !existing.previewUrl)) {
      // Connect a newly published address only where the user has no value.
      merged = merged.map(project=>project===existing?{...project,liveUrl:project.liveUrl||candidate.liveUrl,previewUrl:project.previewUrl||candidate.previewUrl}:project);
    }
    seen.add(candidate.id);
  }
  try {
    if (merged !== projects) storage.setItem(key, JSON.stringify(merged));
    storage.setItem(CATALOG_LEDGER_KEY, JSON.stringify([...seen]));
    storage.setItem(versionKey, 'true');
  } catch { /* Show the connection even if persistence is unavailable. */ }
  return merged;
}
