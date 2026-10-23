import config from '../../archive.config.json';
import type { Project } from '../types';

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
  try {
    if (storage.getItem(versionKey)) return projects;
    const merged = [...projects];
    for (const candidate of catalogProjects()) {
      if (!merged.some(project => project.id === candidate.id || (!project.isSample && project.githubUrl?.replace(/\/$/, '').toLowerCase() === candidate.githubUrl?.toLowerCase()) || project.name.trim().toLowerCase() === candidate.name.toLowerCase())) merged.push(candidate);
    }
    storage.setItem(key, JSON.stringify(merged));
    storage.setItem(versionKey, 'true');
    return merged;
  } catch { return projects; }
}
