export interface CapabilityNarrative {
  problem: string;
  criterion: string;
  work: string;
  logId: string;
}
const office = "codex:proj-minlab-ai-office:";
const calendar = "codex:proj-minially:";
export const capabilityNarratives: Record<
  string,
  Partial<Record<string, CapabilityNarrative>>
> = {
  "proj-minlab-ai-office": {
    planning: {
      problem: "같은 요청을 여러 AI에 다시 설명하고 업무를 옮겨야 했습니다.",
      criterion:
        "요청·기획·역할 분담·승인 지점을 나누고, 같은 기획 버전으로 이어지게 했습니다.",
      work: "기획과 배정의 저장 순서, 업무 추적과 인수인계를 정리했습니다.",
      logId: office + "2026-11-03-ai-office-plan-assignment-handoff",
    },
    development: {
      problem:
        "업무를 배정했다는 표시만으로는 실제 실행 여부를 알기 어려웠습니다.",
      criterion: "배정·실행·결과·사람의 승인을 서로 다른 상태로 취급했습니다.",
      work: "기획 버전 확인과 중복 실행 방지, 결과 재시도 흐름을 보완했습니다. 실제 클라우드 실행은 이번에 재검증하지 않았습니다.",
      logId: office + "2026-11-03-ai-office-execution-stability",
    },
    validation: {
      problem: "지난 기획의 결과나 중복 실행이 승인 흐름에 섞일 수 있었습니다.",
      criterion:
        "업무·기획 버전·실행 상태를 대조한 뒤 다음 단계로 넘기도록 했습니다.",
      work: "실행 안정성 기록과 현재 상태 문서를 연결해, 구현된 처리와 아직 실제 업무로 확인하지 않은 항목을 구분합니다.",
      logId: office + "2026-11-03-ai-office-execution-stability",
    },
  },
  "proj-minially": {
    planning: {
      problem:
        "일정·할 일·반복 문구가 따로 있어 같은 내용을 다시 적어야 했습니다.",
      criterion:
        "달력의 날짜에서 바로 등록하고, 필요한 사람만 카테고리를 쓰도록 했습니다.",
      work: "빈 카테고리로 시작할 수 있게 하고, 첫 화면을 달력 중심으로 정리했습니다.",
      logId: calendar + "2026-11-11-minially-start-calendar",
    },
    development: {
      problem:
        "PC와 휴대폰의 기록을 따로 옮기고, 다른 사람 일정도 별도로 확인해야 했습니다.",
      criterion: "편집 권한과 보기 전용 공유를 구분하도록 했습니다.",
      work: "코드 로그인·보기 전용 공유·설치 앱을 보완했습니다. 이번 작업에서 두 기기 동기화를 재검증한 것은 아닙니다.",
      logId: calendar + "2026-11-11-minially-code-login-sharing-and-reminders",
    },
    experience: {
      problem:
        "프리셋을 고르는 일이 작성 중인 입력을 다시 고치는 일로 이어지면 안 됐습니다.",
      criterion:
        "제목을 빠르게 넣더라도 날짜·시간·메모와 사용자의 수정 내용을 유지하도록 했습니다.",
      work: "프리셋의 교체·이어 붙이기와 이전 제목 복구를 정리하고, 입력 유지에 관한 기록을 남겼습니다.",
      logId: calendar + "2026-11-10-minially-share-icons-persistent-presets",
    },
    validation: {
      problem:
        "화면을 바꾸는 사이 간편 등록과 설정의 기존 동작이 어긋났습니다.",
      criterion:
        "화면이 보이는 것과 실제 등록·설정이 동작하는 것을 나눠 확인하도록 했습니다.",
      work: "등록·설정 오류를 고치고 회귀 검사를 정비했습니다. 당시 검사 결과는 원본 기록에서 따로 확인할 수 있습니다.",
      logId: calendar + "2026-11-11-minially-registration-regression-fixes",
    },
  },
};
