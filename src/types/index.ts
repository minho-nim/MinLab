export type ProjectStatus = '구상 중' | '개발 중' | '완성' | '보류' | '완료' | '기획 중' | '테스트 중' | '운영 중';

export type FeatureStatus = '대기' | '진행 중' | '완료';

export type NavigationTab = 'projects' | 'development-log';

export interface RecordSource {
  fingerprint: string;
  repository: string;
  urls: string[];
  engine: 'gemini' | 'github';
  generatedAt: string;
}

export interface ProjectFeature {
  id: string;
  name: string; // 기능명
  description?: string; // 설명
  status?: FeatureStatus; // 상태
}

export interface WorkLog {
  id: string;
  source?: RecordSource;
  projectId?: string; // 소속 프로젝트 ID
  projectName?: string; // 소속 프로젝트명 (캐싱/표시용)
  date: string; // 수정 날짜 (YYYY-MM-DD)
  version?: string; // 버전 (예: v0.1.0)
  title?: string; // 수정 제목
  content?: string; // 변경 사항 / 수정 내용
  reason?: string; // 수정 이유
  testResult?: string; // 테스트 결과
  nextSteps?: string; // 다음 작업
  
  // 기존 데이터 호환 필드
  task?: string; // 기존 작업 내용 (content와 상호 호환)
  issues?: string; // 기존 문제점
  solution?: string; // 기존 해결 방법
  createdAt?: string;
}

export interface ChangelogItem {
  id: string;
  version: string;
  date: string;
  description: string;
}

export interface PromptHistoryItem {
  id: string;
  source?: RecordSource;
  date: string;
  title: string;
  prompt: string;
  outcome?: string;
}

export interface Project {
  id: string;
  name: string; // e.g. 위험성평가서 / 작업계획서 자동화 도구
  englishName: string; // e.g. Risk Assessment & Work Plan Automation
  status: ProjectStatus; // '개발 중' | '완성' | '보류'
  category: string; // e.g. '업무 자동화'
  description: string; // 프로젝트 소개/설명
  thumbnailUrl?: string; // 대표 이미지 URL
  isSample?: boolean; // 샘플 데이터 여부 (실제 사용자가 등록한 데이터와 구분)
  archived?: boolean; // 아카이브 여부 (데이터 보존용)
  keyFeatures: (ProjectFeature | string)[]; // 주요 기능 목록
  techStack: string[]; // 기술 스택 (e.g. ['Python'])
  liveUrl: string; // 프로그램 실행 URL (실제 URL이 있을 때만 유효)
  previewUrl?: string; // MinLab 내 미리보기 앱 주소 (실행 URL과 별도 관리)
  githubUrl?: string; // GitHub 저장소 URL (실제 URL이 있을 때만 유효)
  workLogs: WorkLog[]; // 개발 기록
  changelog: ChangelogItem[]; // 이전 버전 호환을 위한 변경 이력
  promptHistory?: PromptHistoryItem[]; // 프로젝트별 프롬프트 아카이브
  createdAt: string;
  updatedAt: string;
}
