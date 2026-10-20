export type ProjectStatus = '개발 중' | '기획 중' | '테스트 중' | '완료' | '운영 중';

export interface WorkLog {
  id: string;
  date: string; // YYYY-MM-DD
  task: string; // 작업 내용
  issues: string; // 문제점
  solution: string; // 해결 방법
  testResult: string; // 테스트 결과
  nextSteps: string; // 다음 작업
  createdAt: string;
}

export interface ChangelogItem {
  id: string;
  version: string;
  date: string;
  description: string;
}

export interface Project {
  id: string;
  name: string; // e.g. 위험성평가서 / 작업계획서 자동화 도구
  englishName: string; // e.g. Risk Assessment & Work Plan Automation
  status: ProjectStatus; // e.g. '개발 중'
  category: string; // e.g. '업무 자동화'
  description: string; // e.g. 위험성평가서 및 작업계획서 관련 업무를 효율화하기 위한 자동화 도구
  keyFeatures: string[]; // 주요 기능 목록 (사용자가 직접 추가/수정)
  techStack: string[]; // 기술 스택 (e.g. ['Python'])
  liveUrl: string; // 실행 URL (미등록 시 빈 문자열)
  workLogs: WorkLog[]; // 제작 기록
  changelog: ChangelogItem[]; // 변경 이력
  createdAt: string;
  updatedAt: string;
}
