import { Project } from '../types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'risk-assessment-workplan-automation',
    name: '위험성평가서 / 작업계획서 자동화 도구',
    englishName: 'Risk Assessment & Work Plan Automation',
    status: '개발 중',
    category: '업무 자동화',
    description: '위험성평가서 및 작업계획서 관련 업무를 효율화하기 위한 자동화 도구',
    keyFeatures: [], // 아직 확정되지 않았으므로 임의로 기능을 만들지 않고 사용자가 직접 추가/수정하도록 구성
    techStack: ['Python'],
    liveUrl: '', // 미등록
    workLogs: [
      {
        id: 'wl-init-1',
        date: '2026-10-15',
        task: '위험성평가서 및 작업계획서 기존 서식 및 업무 흐름 분석',
        issues: '작업 현장 및 공종별로 서식과 필수 입력 항목이 상이하여 통일된 데이터 구조 정립 필요',
        solution: '공통 필수 위험요인(추락, 낙하, 협착 등)과 표준 작업 절차를 모듈형 데이터 구조로 분리 설계',
        testResult: '기본 분류 체계 및 데이터 필드 정의서 초안 정리 완료',
        nextSteps: 'Python 기반 자동화 스크립트 핵심 모듈 구조 설계 및 입출력 양식 연동 검토',
        createdAt: '2026-10-15T09:30:00.000Z'
      }
    ],
    changelog: [
      {
        id: 'cl-init-1',
        version: 'v0.1.0',
        date: '2026-10-15',
        description: '프로젝트 기획 및 요구사항 분석 시작'
      }
    ],
    createdAt: '2026-10-15T09:00:00.000Z',
    updatedAt: '2026-10-19T21:00:00.000Z'
  }
];
