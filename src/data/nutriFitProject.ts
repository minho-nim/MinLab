import type { Project } from '../types';

const CONNECTION_KEY = 'minlab_nutrifit_connection_v2';
const APP_URL = 'https://minho-nim.github.io/NutriFit-web/';
const LEGACY_APP_URL = 'https://nutrifit-minho.smokyaphid66.chatgpt.site';
const REPO_URL = 'https://github.com/minho-nim/NutriFit';
const DESCRIPTION = '식사 기록과 영양 목표를 관리하고 밥친구를 키우는 앱. API 키 없이 로그인하지 않고 사용할 수 있습니다.';

function connectAppUrl(value?: string): string {
  const trimmed = value?.trim();
  return !trimmed || trimmed.replace(/\/$/, '') === LEGACY_APP_URL ? APP_URL : value!;
}

function isNutriFit(project: Project): boolean {
  return project.id === 'nutrifit' || project.id === 'proj-1792558759961' || /nutrifit/i.test(project.name + ' ' + project.englishName) || project.githubUrl?.replace(/\/$/, '') === REPO_URL;
}

// Connect once; later user edits or deletion remain authoritative.
export function connectNutriFitOnce(projects: Project[], storage: Pick<Storage, 'getItem' | 'setItem'>, projectsKey: string): Project[] {
  try {
    const hasRetiredLink = projects.some((project) => isNutriFit(project) && [project.liveUrl, project.previewUrl].some((url) => url?.trim().replace(/\/$/, '') === LEGACY_APP_URL));
    if (storage.getItem(CONNECTION_KEY) === 'true' && !hasRetiredLink) return projects;
    const existing = projects.find(isNutriFit);
    const now = new Date().toISOString();
    const connected: Project[] = existing
      ? projects.map((project) => project.id !== existing.id ? project : {
          ...project,
          previewUrl: connectAppUrl(project.previewUrl),
          liveUrl: connectAppUrl(project.liveUrl),
          githubUrl: project.githubUrl?.trim() ? project.githubUrl : REPO_URL,
          description: project.description === '식사 기록과 영양 목표를 관리하고 밥친구를 키우는 앱. API 키 없는 버전이며 배포 사이트는 본인 계정으로 로그인해 사용합니다.' ? DESCRIPTION : project.description,
        })
      : [...projects, {
          id: 'nutrifit', name: 'NutriFit', englishName: 'Nutrition & Companion Pet',
          status: '개발 중', category: '건강 관리',
          description: DESCRIPTION,
          techStack: ['React', 'TypeScript', 'Vite', 'LocalStorage'],
          previewUrl: APP_URL, liveUrl: APP_URL, githubUrl: REPO_URL,
          keyFeatures: ['식사 기록 및 영양 계산', '취향 기반 메뉴 추천', '음식 도감', '일일 성장 제한과 펫 육성'],
          workLogs: [], changelog: [], promptHistory: [], isSample: false, archived: false,
          createdAt: now, updatedAt: now,
        }];
    storage.setItem(projectsKey, JSON.stringify(connected));
    storage.setItem(CONNECTION_KEY, 'true');
    return connected;
  } catch (error) {
    console.warn('Could not connect NutriFit:', error);
    return projects;
  }
}
