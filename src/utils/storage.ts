import { Project } from '../types';
import { INITIAL_PROJECTS } from '../data/initialData';
import { migrateChangelogToPrompts } from './promptHistory';

const STORAGE_KEY = 'minlab_projects_data_v2';

// 상태 정규화: 구상 중, 개발 중, 완성, 보류 4가지 기준
export const normalizeProjectStatus = (status: string | undefined): '구상 중' | '개발 중' | '완성' | '보류' => {
  if (status === '구상 중' || status === '기획 중') {
    return '구상 중';
  }
  if (status === '완료' || status === '완성' || status === '운영 중') {
    return '완성';
  }
  if (status === '보류') {
    return '보류';
  }
  return '개발 중';
};

export const loadProjects = (): Project[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // 최초 실행 시 기본 프로젝트 데이터 로드 및 저장
      const normalizedInitial: Project[] = INITIAL_PROJECTS.map((p) => ({
        ...p,
        status: normalizeProjectStatus(p.status),
      }));
      saveProjects(normalizedInitial);
      return normalizedInitial;
    }
    const result = parseImportJson(raw);
    if (result.success && result.projects?.length) {
      return result.projects.map((project) => ({
        ...project,
        isSample: project.isSample || project.id === 'risk-assessment-workplan-automation',
        archived: Boolean(project.archived),
        thumbnailUrl: project.thumbnailUrl || (project.id === 'risk-assessment-workplan-automation' ? INITIAL_PROJECTS[0].thumbnailUrl : ''),
        workLogs: project.workLogs.map((log) => ({
          ...log,
          projectId: log.projectId || project.id,
          projectName: log.projectName || project.name,
        })),
      }));
    }
    return INITIAL_PROJECTS;
  } catch (err) {
    console.error('Failed to load projects from localStorage:', err);
    return INITIAL_PROJECTS;
  }
};

export const saveProjects = (projects: Project[]): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    return true;
  } catch (err) {
    console.error('Failed to save projects to localStorage:', err);
    return false;
  }
};

export const exportToJson = (projects: Project[]): void => {
  const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json;charset=utf-8' });
  const dataUrl = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  downloadAnchor.setAttribute('href', dataUrl);
  downloadAnchor.setAttribute('download', `minlab-projects-backup-${dateStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
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
    const isRecord = (value: unknown): value is Record<string, unknown> =>
      typeof value === 'object' && value !== null && !Array.isArray(value);
    const text = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
    const safeUrl = (value: unknown) => {
      const url = text(value).trim();
      return /^(https?:\/\/|\/(?!\/)|\.\.?\/)/i.test(url) ? url : '';
    };
    const projects: Project[] = [];

    for (const value of parsed as unknown[]) {
      if (!isRecord(value) || typeof value.id !== 'string' || !value.id.trim() ||
          typeof value.name !== 'string' || !value.name.trim()) {
        return { success: false, error: '유효하지 않은 프로젝트 형식입니다 (id 또는 name 누락).' };
      }

      const workLogs = Array.isArray(value.workLogs) ? value.workLogs : [];
      const keyFeatures = Array.isArray(value.keyFeatures) ? value.keyFeatures : [];
      const changelog = Array.isArray(value.changelog) ? value.changelog : [];
      const promptHistory = Array.isArray(value.promptHistory) ? value.promptHistory : [];
      if (!workLogs.every(isRecord) || !keyFeatures.every((feature) =>
        typeof feature === 'string' || (isRecord(feature) && typeof feature.name === 'string')) ||
        !changelog.every((entry) => isRecord(entry) && typeof entry.version === 'string') ||
        !promptHistory.every((entry) => isRecord(entry) && typeof entry.prompt === 'string')) {
        return { success: false, error: `'${value.name}' 프로젝트의 기능·기록 데이터 형식이 올바르지 않습니다.` };
      }

      projects.push({
        id: value.id,
        name: value.name,
        englishName: text(value.englishName),
        status: normalizeProjectStatus(text(value.status)),
        category: text(value.category),
        description: text(value.description),
        thumbnailUrl: safeUrl(value.thumbnailUrl),
        isSample: value.isSample === true,
        archived: value.archived === true,
        keyFeatures: keyFeatures.map((feature, index) => typeof feature === 'string'
          ? feature
          : {
              id: text(feature.id, `feature-${index}`),
              name: text(feature.name),
              description: text(feature.description),
              status: ['대기', '진행 중', '완료'].includes(text(feature.status))
                ? text(feature.status) as '대기' | '진행 중' | '완료'
                : '대기',
            }),
        techStack: Array.isArray(value.techStack) ? value.techStack.filter((tech): tech is string => typeof tech === 'string') : [],
        liveUrl: safeUrl(value.liveUrl),
        previewUrl: safeUrl(value.previewUrl),
        githubUrl: safeUrl(value.githubUrl),
        workLogs: workLogs.map((entry, index) => ({
          id: text(entry.id, `log-${index}`),
          projectId: text(entry.projectId, text(value.id)),
          projectName: text(entry.projectName, text(value.name)),
          date: text(entry.date),
          version: text(entry.version),
          title: text(entry.title),
          content: text(entry.content),
          reason: text(entry.reason),
          testResult: text(entry.testResult),
          nextSteps: text(entry.nextSteps),
          task: text(entry.task),
          issues: text(entry.issues),
          solution: text(entry.solution),
          createdAt: text(entry.createdAt),
        })),
        // Consume legacy entries so deleted prompt records do not reappear on reload.
        changelog: [],
        promptHistory: migrateChangelogToPrompts(changelog.map((entry, index) => ({
          id: text(entry.id, `change-${index}`),
          version: text(entry.version),
          date: text(entry.date),
          description: text(entry.description),
        })), promptHistory.map((entry, index) => ({
          id: text(entry.id, `prompt-${index}`),
          date: text(entry.date),
          title: text(entry.title, '제목 없는 프롬프트'),
          prompt: text(entry.prompt),
          outcome: text(entry.outcome),
        }))),
        createdAt: text(value.createdAt, new Date().toISOString()),
        updatedAt: text(value.updatedAt, new Date().toISOString()),
      });
    }

    return { success: true, projects };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('JSON 가져오기 오류:', err);
    return {
      success: false,
      error: `JSON 처리 오류: ${detail}`,
    };
  }
};
