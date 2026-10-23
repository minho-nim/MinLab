import type { Project } from '../types';

const CONNECTION_KEY = 'minlab_risk_assessment_web_connection_v2';
const PROJECT_ID = 'risk-assessment-workplan-automation';
const APP_URL = 'https://minho-nim.github.io/MinLab/apps/work-schedule/';
const OLD_REPOSITORY_URL = 'https://github.com/minho-nim/MinLab';
const DESCRIPTION = '위험성평가서·작업계획서 자동화 도구와 DOCX 기반 공사 일정 관리 웹앱';
const FEATURES = [
  '작업계획서 DOCX 분석 및 공사 일정 통합 관리',
  'DOCX에 적힌 실제 작업자의 R&R·회사명·이름·연락처 표시',
  '업무관리(Kiss) 일정 일괄등록 엑셀 생성',
];

// Connect the published web app once while preserving the user's existing project history.
export function connectRiskAssessmentProjectOnce(
  projects: Project[],
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  projectsKey: string,
): Project[] {
  try {
    if (storage.getItem(CONNECTION_KEY) === 'true') return projects;
    const existing = projects.find((project) => project.id === PROJECT_ID);
    if (!existing) return projects;

    const connected = projects.map((project) => project.id !== PROJECT_ID ? project : {
      ...project,
      status: project.status === '구상 중' ? '개발 중' as const : project.status,
      description: project.description === '위험성평가서 및 작업계획서 관련 업무를 효율화하기 위한 자동화 도구' || !project.description
        ? DESCRIPTION
        : project.description,
      keyFeatures: [...new Set([...(project.keyFeatures || []), ...FEATURES])],
      techStack: [...new Set([...(project.techStack || []), 'React', 'TypeScript', 'Vite'])],
      liveUrl: !project.liveUrl?.trim() || project.liveUrl.includes('ai.studio/apps/') ? APP_URL : project.liveUrl,
      previewUrl: !project.previewUrl?.trim() || project.previewUrl.includes('ai.studio/apps/') ? APP_URL : project.previewUrl,
      githubUrl: project.githubUrl?.replace(/\/$/, '') === OLD_REPOSITORY_URL ? '' : project.githubUrl,
      isSample: false,
      archived: false,
    });

    storage.setItem(projectsKey, JSON.stringify(connected));
    storage.setItem(CONNECTION_KEY, 'true');
    return connected;
  } catch (error) {
    console.warn('Could not connect the risk assessment web app:', error);
    return projects;
  }
}
