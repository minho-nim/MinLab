import type { Project } from '../types';

const MIGRATION_KEY = 'minlab_choicepilot_connection_v1';
const APP_URL = 'https://minho-nim.github.io/ChoicePilot/';
const REPOSITORY_URL = 'https://github.com/minho-nim/ChoicePilot';

// Apply published links once so later edits, including clearing a link, remain user controlled.
export function connectChoicePilotOnce(
  projects: Project[],
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  projectsKey: string,
): Project[] {
  try {
    if (storage.getItem(MIGRATION_KEY) === 'true') return projects;
  } catch {
    return projects;
  }

  let found = false;
  const connected = projects.map((project) => {
    if (project.id !== 'proj-1792563333333' && project.name.trim().toLowerCase() !== 'choicepilot') {
      return project;
    }
    found = true;
    return {
      ...project,
      previewUrl: project.previewUrl?.trim() ? project.previewUrl : APP_URL,
      liveUrl: project.liveUrl?.trim() ? project.liveUrl : APP_URL,
      githubUrl: project.githubUrl?.trim() ? project.githubUrl : REPOSITORY_URL,
    };
  });

  // A project imported later can still be connected on the next load.
  if (!found) return projects;

  try {
    storage.setItem(projectsKey, JSON.stringify(connected));
    storage.setItem(MIGRATION_KEY, 'true');
  } catch (error) {
    console.warn('Could not persist the ChoicePilot project links:', error);
  }
  return connected;
}
