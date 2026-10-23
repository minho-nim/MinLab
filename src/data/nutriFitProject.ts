import type { Project } from '../types';

const CONNECTION_KEY = 'minlab_nutrifit_connection_v1';
const APP_URL = 'https://nutrifit-minho.smokyaphid66.chatgpt.site';
const REPO_URL = 'https://github.com/minho-nim/NutriFit';

// Connect once; later user edits or deletion remain authoritative.
export function connectNutriFitOnce(projects: Project[], storage: Pick<Storage, 'getItem' | 'setItem'>, projectsKey: string): Project[] {
  try {
    if (storage.getItem(CONNECTION_KEY) === 'true') return projects;
    const existing = projects.find((project) => project.id === 'nutrifit' || project.id === 'proj-1792558759961' || /nutrifit/i.test(project.name + ' ' + project.englishName) || project.githubUrl?.replace(/\/$/, '') === REPO_URL);
    const now = new Date().toISOString();
    const connected: Project[] = existing
      ? projects.map((project) => project.id !== existing.id ? project : {
          ...project,
          previewUrl: project.previewUrl?.trim() ? project.previewUrl : APP_URL,
          liveUrl: project.liveUrl?.trim() ? project.liveUrl : APP_URL,
          githubUrl: project.githubUrl?.trim() ? project.githubUrl : REPO_URL,
        })
      : [...projects, {
          id: 'nutrifit', name: 'NutriFit', englishName: 'Nutrition & Companion Pet',
          status: '개발 중', category: '건강 관리',
          description: '식사 기록과 영양 목표를 관리하고 밥친구를 키우는 앱. API 키 없는 버전이며 배포 사이트는 본인 계정으로 로그인해 사용합니다.',
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
