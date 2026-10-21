import { Project, ProjectStatus } from '../types';
import { INITIAL_PROJECTS } from '../data/initialData';

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
      const normalizedInitial = INITIAL_PROJECTS.map((p) => ({
        ...p,
        status: normalizeProjectStatus(p.status) as ProjectStatus,
      }));
      saveProjects(normalizedInitial);
      return normalizedInitial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const filtered = parsed.map((p: Project) => {
          // 필드 정규화 및 마이그레이션
          const isSample = p.isSample !== undefined 
            ? p.isSample 
            : p.id === 'risk-assessment-workplan-automation';
          
          const normalizedLogs = (p.workLogs || []).map((log) => ({
            ...log,
            projectId: log.projectId || p.id,
            projectName: log.projectName || p.name,
          }));

          return {
            ...p,
            status: normalizeProjectStatus(p.status) as ProjectStatus,
            isSample,
            archived: Boolean(p.archived),
            thumbnailUrl: p.thumbnailUrl || (p.id === 'risk-assessment-workplan-automation' ? INITIAL_PROJECTS[0].thumbnailUrl : ''),
            workLogs: normalizedLogs,
          };
        });

      return filtered.length > 0 ? filtered : INITIAL_PROJECTS;
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
    // 기본 필드 유효성 검사 및 정규화
    for (const item of parsed) {
      if (!item.id || !item.name) {
        return { success: false, error: '유효하지 않은 프로젝트 형식입니다 (id 또는 name 누락).' };
      }
      item.status = normalizeProjectStatus(item.status);
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
    };

    return { success: true, projects: cleaned };
  } catch (err) {
    return { success: false, error: 'JSON 파싱 오류: 올바른 JSON 파일인지 확인해주세요.' };
  }
};
