import { Project } from '../types';
import { INITIAL_PROJECTS } from '../data/initialData';

const STORAGE_KEY = 'minlab_projects_data_v2';

export const loadProjects = (): Project[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveProjects(INITIAL_PROJECTS);
      return INITIAL_PROJECTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Remove ChoicePilot if previously stored in this browser session
      const filtered = parsed.filter(
        (p: Project) =>
          !p.name?.toLowerCase().includes('choicepilot') &&
          !p.englishName?.toLowerCase().includes('choicepilot') &&
          p.id !== 'choicepilot'
      );

      // If filtering removed all or if the first project is not the automation tool, ensure our first project exists
      const hasAutomationProject = filtered.some(
        (p: Project) => p.name.includes('위험성평가서') || p.id === 'risk-assessment-workplan-automation'
      );

      if (!hasAutomationProject) {
        filtered.unshift(INITIAL_PROJECTS[0]);
      }

      saveProjects(filtered);
      return filtered;
    }
    return INITIAL_PROJECTS;
  } catch (err) {
    console.error('Failed to load projects from localStorage:', err);
    return INITIAL_PROJECTS;
  }
};

export const saveProjects = (projects: Project[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Failed to save projects to localStorage:', err);
  }
};

export const exportToJson = (projects: Project[]): void => {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(projects, null, 2));
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `minlab-projects-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const parseImportJson = (content: string): { success: boolean; projects?: Project[]; error?: string } => {
  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'JSON 데이터가 프로젝트 배열 형식이 아닙니다.' };
    }
    if (parsed.length === 0) {
      return { success: false, error: '가져올 프로젝트 데이터가 비어 있습니다.' };
    }
    // Basic validation of fields
    for (const item of parsed) {
      if (!item.id || !item.name) {
        return { success: false, error: '유효하지 않은 프로젝트 형식입니다 (id 또는 name 누락).' };
      }
      if (!Array.isArray(item.workLogs)) {
        item.workLogs = [];
      }
      if (!Array.isArray(item.keyFeatures)) {
        item.keyFeatures = [];
      }
      if (!Array.isArray(item.techStack)) {
        item.techStack = [];
      }
      if (!Array.isArray(item.changelog)) {
        item.changelog = [];
      }
    }

    // Exclude ChoicePilot if present in import file
    const cleaned = parsed.filter(
      (p: Project) =>
        !p.name?.toLowerCase().includes('choicepilot') &&
        !p.englishName?.toLowerCase().includes('choicepilot') &&
        p.id !== 'choicepilot'
    );

    return { success: true, projects: cleaned.length > 0 ? cleaned : parsed };
  } catch (err) {
    return { success: false, error: 'JSON 파싱 오류: 올바른 JSON 파일인지 확인해주세요.' };
  }
};
