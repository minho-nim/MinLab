/** Editorial introductions, separate from immutable development records. Sources are reviewed in docs/project-content-review.md. */
export interface ProcessCase {
  title: string;
  problem: string;
  criterion: string;
  change: string;
  result: string;
  logId?: string;
  sourceUrl?: string;
}
export interface ProjectCaseStudy {
  audience: string;
  purpose: string;
  flow: string[];
  implementation: string;
  verification: string;
  remaining: string;
  process?: ProcessCase[];
  sources: { label: string; url: string }[];
}
const minovaSource =
  "https://github.com/minho-nim/MINOVA/blob/26fb0859f01f478ebb6c932475f1bdca3c5d69ef/";
const minoffiaSource =
  "https://github.com/minho-nim/minoffia/blob/d7b3a426c0052320a983cde13ca07d6212b8b0ad/";
const miniallySource =
  "https://github.com/minho-nim/minially/blob/9f43f240917470f5cce37101f482b5bc68a455a4/";
const valuminSource =
  "https://github.com/minho-nim/Valumin/blob/d4b36093bb3d23f13d5b796e55ada70d055606b1/";
export const projectCaseStudies: Record<string, ProjectCaseStudy> = {
  "proj-crossroads-ai-verdict": {
    audience:
      "AI의 정책이 사람에게 어떤 영향을 주는지 선택하며 알아보고 싶은 사람을 위한 게임입니다.",
    purpose:
      "도시 운영 AI가 제안한 효율적인 답이 시민에게도 좋은 답인지는 별개의 문제입니다. 인간 감독관이 되어 정책을 승인하거나 거부하고, 시민 신뢰·공정성·개인 자유·사회 안전이 충돌하는 상황을 경험하도록 만들었습니다.",
    flow: [
      "세계관과 인물을 살펴보고 감독관의 첫 목표를 확인합니다.",
      "사건 카드의 대사와 선택지 전문을 읽고 좌우 중 하나를 고릅니다.",
      "도시 지표와 판단 기록에서 결과를 확인하고 다음 사건을 검토합니다.",
      "ACT I·II를 마치면 기존 지표와 판단 기록을 이어 자유 운영으로 진행합니다.",
    ],
    implementation:
      "사건 카드·조건부 후속 사건·도시 지표·판단 기록·브라우저 자동 저장이 연결돼 있습니다. ACT I·II와 자유 운영은 구현돼 있으며 ACT III는 아직 구현되지 않았습니다. 외부 AI가 매번 사건을 생성하는 방식이 아니라 작성된 사건과 게임 규칙으로 진행합니다.",
    verification:
      "2026-11-14 원본 코드의 자동 검사·타입 검사·빌드를 실행했습니다. 로컬 Chromium에서 새 게임, 한 번의 정책 선택, 네 지표 변화와 판단 기록을 확인했습니다. 자유 운영 화면은 원본 엔진의 자동 진행 한 경로로 도달해 촬영했습니다.",
    remaining:
      "모든 분기의 실제 플레이 검수, 실제 iOS·Android 조작, 장기 플레이의 읽기 피로도는 이번에 검증하지 않았습니다. 자유 운영 캡처가 모든 선택의 균형을 검증했다는 의미는 아닙니다.",
    process: [
      {
        title: "끝낸 장이 다시 나오지 않도록",
        problem:
          "이전 기록에는 ACT I 뒤쪽 사건이 일찍 섞이거나 막 전환·이어하기가 어긋나는 문제가 남아 있었습니다.",
        criterion:
          "끝낸 사건과 현재 ACT를 기준으로 다음 장면을 고르고, 저장을 다시 열어도 진행을 되돌리지 않도록 했습니다.",
        change:
          "명시적인 스토리 순서와 완료 검사를 두고, 자유 운영에서 메인 스토리를 다시 뽑지 않도록 분리했습니다.",
        result:
          "당시 기록의 진행 경로 점검과 별도로, 이번에는 원본 엔진으로 ACT I·II 이후 자유 운영까지 한 경로를 실행했습니다. 모든 분기를 직접 플레이한 것은 아닙니다.",
        logId:
          "codex:proj-crossroads-ai-verdict:2026-11-11-minova-story-progression",
        sourceUrl: minovaSource + "docs/v0.2-engine.md",
      },
      {
        title: "선택 버튼과 결과가 같은 뜻을 갖도록",
        problem:
          "짧은 승인·거부 표시만으로는 어떤 정책에 동의하는지 충분히 알기 어려웠습니다. 과거 선택에 따라 달라지는 설명도 서로 맞아야 했습니다.",
        criterion:
          "결정 전에 읽는 선택과 결정 후 남는 기록의 의미가 같아야 한다고 봤습니다.",
        change:
          "분기별 선택 문구를 공통 표시 함수로 묶고, 선택지 전문을 별도로 읽을 수 있게 했습니다. 확인되지 않은 피해를 확정 사실로 쓰는 표현도 구분했습니다.",
        result:
          "원본의 선택 정합성 검사와 전체 자동 검사 명령을 이번에 통과했습니다. 화면에서는 실제 선택 뒤 지표와 판단 기록이 갱신되는 것을 확인했습니다.",
        logId:
          "codex:proj-crossroads-ai-verdict:2026-11-11-minova-concrete-dialogue",
        sourceUrl: minovaSource + "docs/v0.3-decision-consistency.md",
      },
      {
        title: "긴 대사를 작은 화면에서도 읽도록",
        problem:
          "모바일에서 긴 대사와 선택 내용이 잘리거나, 다음 카드로 너무 빨리 넘어가면 판단에 필요한 내용을 놓칠 수 있었습니다.",
        criterion:
          "대사를 생략하지 않고 읽을 수 있어야 하며, 한 번의 조작이 두 번의 선택으로 기록되면 안 된다고 정했습니다.",
        change:
          "대사는 한 창 안에서 스크롤하고 선택지 전문을 펼쳐 읽도록 정리했습니다. 카드 전환 중에는 중복 입력을 막습니다.",
        result:
          "기존 문서에는 작은 화면의 대사 접근과 입력 보호를 확인한 범위가 기록돼 있습니다. 이번 촬영은 데스크톱 Chromium 기준이며, 실제 휴대폰의 읽기 편안함은 추가 확인이 필요합니다.",
        logId:
          "codex:proj-crossroads-ai-verdict:2026-10-30-crossroads-mobile-start-guide",
        sourceUrl: minovaSource + "docs/mobile-reading-and-start-guide.md",
      },
    ],
    sources: [
      { label: "게임 구성과 확인 범위", url: minovaSource + "README.md" },
    ],
  },
  "proj-minlab-ai-office": {
    audience:
      "여러 AI에게 개발 업무를 나눠 맡기면서도 기획과 결과는 직접 확인하려는 개인 사용자를 위한 앱입니다.",
    purpose:
      "AI마다 같은 내용을 다시 설명하고 결과를 옮기면, 무엇을 맡겼고 어디까지 실행됐는지 놓치기 쉽습니다. 요청·기획·역할 분담·결과 검토를 한곳에 모으고, 사람이 승인할 지점을 남기려는 작업입니다.",
    flow: [
      "할 일을 적어 접수하고 기획 초안을 확인합니다.",
      "기획을 승인한 뒤 담당 AI와 업무 상태를 살펴봅니다.",
      "돌아온 결과와 평가를 확인하고 수정 요청이나 올리기 승인을 선택합니다.",
      "배포 승인과 실행 기록을 구분해 확인합니다.",
    ],
    implementation:
      "원본의 현재 흐름 문서에는 기획·올리기·배포 승인과 역할별 작업 전달이 연결돼 있습니다. 공개 데모는 예시 데이터로 흐름을 체험하며 실제 클라우드 작업이나 AI 실행을 하지 않습니다. 소유자 앱에는 로그인이 필요합니다.",
    verification:
      "2026-11-14 공개 포트폴리오와 원본의 FLOW·STATUS 문서를 대조했습니다. MinLab의 화면 미리보기는 원본 포트폴리오가 제공한 예시 데이터 캡처입니다. 이번 작업에서 실제 계정·AI 실행·배포 승인을 통합 시험하지 않았습니다.",
    remaining:
      "실제 업무에서의 재시도·인수인계, AI가 저장소 규칙과 스킬을 따르는지 등의 확인 과제가 원본 상태 문서에 남아 있습니다. 배정된 상태를 실행 완료로 표현하지 않습니다.",
    process: [
      {
        title: "배정과 실행 완료를 나눠 보기",
        problem:
          "기획·배정만 저장된 일과 실제 결과가 돌아온 일을 혼동하면 다음 승인도 잘못할 수 있습니다.",
        criterion:
          "화면의 상태와 승인 기록이 같은 업무·같은 기획 버전을 가리키도록 정리했습니다.",
        change:
          "기획 버전 확인, 중복 실행 방지와 결과 재시도 흐름을 보완했습니다.",
        result:
          "기존 개발 기록에서 해당 변경을 확인했습니다. 현재 문서에도 승인 기록과 실행 상태의 구분이 유지됩니다. 이번에는 실제 AI 업무 실행을 재검증하지 않았습니다.",
        logId:
          "codex:proj-minlab-ai-office:2026-11-03-ai-office-execution-stability",
        sourceUrl: minoffiaSource + "docs/FLOW.md",
      },
    ],
    sources: [
      {
        label: "외부 포트폴리오",
        url: "https://minlab-ai-office.pages.dev/portfolio/",
      },
      {
        label: "현재 업무 흐름과 미검증 항목",
        url: minoffiaSource + "docs/STATUS.md",
      },
    ],
  },
  "proj-minially": {
    audience:
      "일정·할 일·반복해서 쓰는 문구를 여러 앱에 나눠 적고 싶지 않은 사람을 위한 달력 앱입니다.",
    purpose:
      "날짜를 보다가 일정과 할 일을 바로 넣고, 자주 쓰는 제목은 다시 입력하지 않도록 만들었습니다. PC에서 열어 쓰는 흐름과 휴대폰에서 빠르게 등록하는 흐름을 함께 다룹니다.",
    flow: [
      "달력에서 날짜를 눌러 그날 일정과 할 일을 봅니다.",
      "직접 제목을 적거나 프리셋을 눌러 입력한 뒤 등록합니다.",
      "월간·주간을 이동하고, 할 일을 끝내면 완료로 표시합니다.",
      "코드 로그인과 보기 전용 공유는 별도 연결 기능으로 사용합니다.",
    ],
    implementation:
      "달력·할 일·프리셋과 코드 로그인·보기 전용 공유가 원본에 구성돼 있습니다. 프리셋을 넣어도 날짜·시간·메모는 유지하며 제목을 다시 편집할 수 있습니다.",
    verification:
      "2026-11-14 원본 README와 공개 포트폴리오의 사용 흐름·예시 캡처를 대조했습니다. 이번에는 실제 두 기기 간 동기화·알림·아이폰 설치 동작을 새로 시험하지 않았습니다.",
    remaining:
      "실제 기기의 입력·스크롤·알림과 동시 편집 상황은 별도 검증이 필요합니다. 공개 예시 일정은 실제 사용자의 일정이 아닙니다.",
    process: [
      {
        title: "프리셋을 눌러도 쓰던 입력은 유지하기",
        problem:
          "빠른 입력을 돕는 프리셋이 작성 중인 제목이나 다른 입력값을 뜻하지 않게 바꾸면 다시 적어야 했습니다.",
        criterion:
          "반복 입력은 줄이되 사용자가 정한 날짜·시간·메모는 보존하도록 정했습니다.",
        change:
          "교체·이어 붙이기와 이전 제목 복구를 제공하고, 프리셋과 작성 중인 일정의 값을 분리했습니다.",
        result:
          "기존 개발 기록과 현재 README에서 입력 보존 방식을 확인했습니다. 이번에는 원본 캡처와 문서를 대조했으며 실제 계정 동기화는 재검증하지 않았습니다.",
        logId:
          "codex:proj-minially:2026-11-10-minially-share-icons-persistent-presets",
        sourceUrl: miniallySource + "README.md",
      },
    ],
    sources: [
      {
        label: "외부 포트폴리오",
        url: "https://minially.pages.dev/portfolio/",
      },
      { label: "사용 방법과 저장 방식", url: miniallySource + "README.md" },
    ],
  },
  "proj-1792978415000": {
    audience:
      "물건·구독·회원권을 얼마나 사용했는지 돌아보고 싶은 사람을 위한 소비 기록 앱입니다.",
    purpose:
      "구매 가격만으로 잘 산 물건인지 판단하기 어렵습니다. 사용 횟수·시간·보유 기간으로 비용을 나누어 보고, 자신이 정한 사용 목표와 비교하도록 만들었습니다. 실제 절약액이나 객관적인 구매 가치를 판정하는 도구는 아닙니다.",
    flow: [
      "물건이나 구독의 가격과 사용량 기준을 등록합니다.",
      "쓸 때마다 횟수·시간을 추가하거나 날짜별 기록을 확인합니다.",
      "누적 사용 단가와 내가 정한 목표를 비교합니다.",
      "필요하면 JSON 백업을 내려받고 복원합니다.",
    ],
    implementation:
      "소비 등록·사용 기록·사용 단가·목표 비교·백업이 구현돼 있습니다. 샘플 체험은 메모리에서 동작하고 실제 저장소와 분리됩니다. 계정이나 기기 간 자동 동기화는 없습니다.",
    verification:
      "2026-11-14 원본 앱의 체험 모드를 실행해 등록 양식, 사용 횟수 추가와 항목 상세를 확인했습니다. 캡처에는 원본 앱의 이전 명칭 WorthIt이 그대로 남아 있습니다. 이 이름을 이미지에서 덮어쓰지 않았습니다.",
    remaining:
      "Valumin으로의 실제 앱 헤더·설치 안내·내보내기 문구 변경은 원본 저장소에서 처리해야 합니다. 이번에는 실제 기기의 설치·오프라인 실행·모든 계산 경계값을 검증하지 않았습니다.",
    process: [
      {
        title: "본전의 기준을 사용자가 정하도록",
        problem:
          "추천 단가 하나로는 물건마다 다른 사용 계획과 만족 기준을 담기 어려웠습니다.",
        criterion:
          "사용자가 만족할 사용량을 먼저 정하고, 계산값을 실제 절약액과 혼동하지 않도록 했습니다.",
        change:
          "사용량 목표에서 목표 단가를 계산하거나 직접 단가를 입력하도록 구성했습니다. 예시 추천과 사용자가 정한 목표를 구분합니다.",
        result:
          "기존 개발 기록과 현재 계산·등록 코드를 대조했습니다. 이번에는 예시 항목의 사용 횟수 추가와 상세 표시를 확인했으며 모든 계산식을 새로 검증한 것은 아닙니다.",
        logId: "codex:proj-1792978415000:2026-10-26-worthit-personal-goals",
        sourceUrl: valuminSource + "README.md",
      },
    ],
    sources: [
      { label: "현재 앱의 사용 방식과 한계", url: valuminSource + "README.md" },
    ],
  },
  "risk-assessment-workplan-automation": {
    audience:
      "여러 공사 문서에서 일정과 계약·작업자 정보를 반복해서 옮기는 업무를 줄이기 위한 도구입니다.",
    purpose:
      "계약 목록과 작업계획서가 서로 다른 파일에 있어 같은 정보를 다시 입력해야 했습니다. 원본에 적힌 작업명·시각·작업자를 읽고 계약과 연결하되, 없는 정보는 임의로 채우지 않는 흐름을 만들었습니다.",
    flow: [
      "계약 목록 Excel과 작업계획서 DOCX를 선택합니다.",
      "작업명·기간·작업자를 추출하고 계약 매칭 결과를 검토합니다.",
      "일정 화면에서 날짜·작업자별 작업을 조회합니다.",
      "회사 업로드용 등록자·참여자를 확인한 뒤 일정 Excel을 만듭니다.",
    ],
    implementation:
      "MinLab 안의 공사 일정 웹앱에 파일 선택·DOCX/Excel 분석·계약 매칭·일정 조회·Excel 생성 코드가 있습니다. 파일은 브라우저에서 처리하며 실제 작업자와 회사 업로드용 계정을 구분합니다.",
    verification:
      "2026-11-14 CI의 실제 빌드 앱에 예시 Excel·DOCX를 넣어 계약 매칭 성공·실패, 작업자 추출, 원문 미리보기와 달력 표시를 확인했습니다. 이 과정에서 문서를 보내는 업로드 요청은 발생하지 않았습니다. 기존 기록의 회사 문서 확인 결과와 이번 예시 문서 검증은 구분합니다.",
    remaining:
      "회사별 문서 양식 차이, 계약 매칭의 예외, 실제 업무 데이터로 만든 Excel의 업로드 결과는 별도 확인이 필요합니다. 민감한 원본 문서를 소개 이미지로 사용하지 않습니다.",
    process: [
      {
        title: "문서의 작업자와 업로드 계정을 구분하기",
        problem:
          "회사 업로드용 등록자·참여자 계정을 실제 현장 작업자처럼 표시하면 일정의 의미가 달라집니다.",
        criterion:
          "문서에 적힌 역할·회사·이름·연락처를 근거로 삼고, 없는 값은 빈 값으로 남기도록 정했습니다.",
        change:
          "병합된 표와 열 제목을 기준으로 작업자를 읽고 회사 업로드 계정은 별도 입력으로 분리했습니다.",
        result:
          "이번 예시 Word 표의 역할·회사·작업자 이름이 매칭 목록에 나타나는 것을 확인했습니다. 빈 연락처는 채우지 않았습니다. 회사의 실제 문서를 새로 분석한 것은 아닙니다.",
        logId:
          "codex:risk-assessment-workplan-automation:2026-10-26-schedule-upload-and-worker-parser",
      },
      {
        title: "계약을 찾지 못하면 이유를 남기기",
        problem:
          "문서에서 읽은 계약이 목록에 없거나 같은 이름의 후보가 여러 개이면 잘못 연결될 수 있습니다.",
        criterion:
          "계약번호나 이름으로 후보를 좁힌 뒤 한 개가 남을 때만 성공으로 처리합니다.",
        change:
          "목록 없음·문서 정보 없음·일치 항목 없음·여러 후보를 구분해 실패 이유를 표시합니다.",
        result:
          "예시 문서에서 일치하는 계약과 일치하지 않는 계약을 각각 확인했습니다. 달력에는 성공한 작업만 나타났습니다. 후보 중복에 관한 기존 자동 검사도 CI에서 통과했습니다.",
        sourceUrl:
          "https://github.com/minho-nim/MinLab/blob/e0d1d33963362ba4e72f14183dbdaa7c19def2a0/apps/work-schedule/src/utils/docxTables.test.ts",
      },
    ],
    sources: [
      {
        label: "공사 일정 앱 구성",
        url: "https://github.com/minho-nim/MinLab/tree/main/apps/work-schedule",
      },
      {
        label: "예시 문서 브라우저 검증",
        url: "https://github.com/minho-nim/MinLab/actions/runs/43600686913",
      },
    ],
  },
  "proj-1792485558773": {
    audience:
      "여러 개인 프로젝트의 결과와 바뀐 이유를 함께 살펴보려는 방문자를 위한 아카이브입니다.",
    purpose:
      "앱 링크만 모아서는 무엇을 만들었고 왜 고쳤는지 알기 어렵습니다. 소개와 실제 화면은 읽기 쉽게 정리하고, 개발일지와 프롬프트 원본은 별도로 보존하는 공간으로 만들고 있습니다.",
    flow: [
      "큰 진입 메뉴에서 홈·프로젝트·개발일지·소개를 고릅니다.",
      "검색·필터와 Grid/List로 프로젝트를 찾습니다.",
      "기능 화면과 제작 과정을 본 뒤 원본 개발 기록을 펼칩니다.",
    ],
    implementation:
      "해시 URL 기반 탐색, 화면 미리보기, 개발 기록과 JSON 백업 기능이 있습니다. 외부 포트폴리오와 MinLab 내부 소개를 구분합니다.",
    verification:
      "MinLab의 기존 회귀 검사와 이번 PR의 검증 결과는 PR에 따로 기록합니다. 소개 문구만으로 서버 인증이나 배포가 검증됐다고 표시하지 않습니다.",
    remaining:
      "관리자 서버 연결은 설정이 필요하며, 이 브라우저의 초안 저장이 GitHub 원본을 자동 수정하는 것은 아닙니다.",
    sources: [
      { label: "MinLab 소스", url: "https://github.com/minho-nim/MinLab" },
    ],
  },
  "proj-1792563333333": {
    audience:
      "고민은 있지만 무엇부터 확인할지 정리하기 어려운 사람을 위한 도구입니다.",
    purpose:
      "결론을 대신 내리기보다 상황과 감정, 원하는 변화와 빠진 정보를 나누어 살펴보도록 구성했습니다.",
    flow: [
      "고민을 적고 필요한 후속 질문에 답하거나 건너뜁니다.",
      "상황·감정·관심사·원하는 변화 요약을 확인하고 고칩니다.",
      "결정 전에 알아볼 내용과 다음 행동을 정리합니다.",
    ],
    implementation:
      "현재 기본 흐름은 브라우저의 규칙 기반 정리입니다. 외부 언어 모델이나 Gemini API 없이 동작하며, 심리 진단이나 사실 검증 도구가 아닙니다.",
    verification:
      "2026-11-14 저장소의 현재 README와 MinLab 등록 정보를 대조했습니다. 이번 작업에서 원본 앱을 새로 실행하거나 기존 검사 수치를 재검증하지는 않았습니다.",
    remaining:
      "문자 그대로 찾은 표현이 맥락을 놓칠 수 있어 사용자의 요약 확인이 필요합니다. AI가 판단을 대신한다고 소개하지 않습니다.",
    sources: [
      {
        label: "현재 사용 방법과 한계",
        url: "https://github.com/minho-nim/ChoicePilot/blob/main/README.md",
      },
    ],
  },
  "proj-1792558759961": {
    audience: "먹은 식사와 영양 목표를 꾸준히 기록하려는 사람을 위한 앱입니다.",
    purpose:
      "식사 기록을 영양 목표와 연결하고, 도감과 밥친구를 통해 기록을 이어 가도록 구성했습니다.",
    flow: [
      "식사와 영양 정보를 기록합니다.",
      "목표와 기록을 살펴보고 메뉴 추천을 참고합니다.",
      "음식 도감과 밥친구의 변화를 확인합니다.",
    ],
    implementation:
      "현재 README에는 식사·영양 목표·메뉴 추천·음식 도감·펫 육성이 설명돼 있습니다. AI 사진 분석은 기본 비활성화이며 기록은 브라우저에 저장됩니다.",
    verification:
      "2026-11-14 저장소의 현재 README와 MinLab 등록 정보를 대조했습니다. 이번 작업에서 원본 앱을 새로 실행하거나 기존 검사 수치를 재검증하지는 않았습니다.",
    remaining:
      "사진 분석의 실제 연결과 영양 정보의 정확성은 이번에 검증하지 않았습니다. 건강 판단이나 전문적인 식단 처방을 보장하지 않습니다.",
    sources: [
      {
        label: "현재 사용 방법과 한계",
        url: "https://github.com/minho-nim/NutriFit-web/blob/main/README.md",
      },
    ],
  },
  "proj-excuseoffice": {
    audience:
      "친구에게 장난으로 보낼 핑계 문서를 만들고 싶은 사람을 위한 앱입니다.",
    purpose:
      "상황을 적고 이름·도장·문서 형식을 바꾸어 재미용 문서를 만들도록 구성했습니다. 실제 증명서로 사용할 문서가 아닙니다.",
    flow: [
      "상황을 적거나 예시를 고릅니다.",
      "이름·도장·결재 정보를 고쳐 문서를 만듭니다.",
      "다른 핑계를 고르거나 글·PNG·PDF로 저장합니다.",
    ],
    implementation:
      "현재 README에는 문서 생성·다른 핑계·이름과 도장 편집·파일 저장·브라우저 백업이 설명돼 있습니다.",
    verification:
      "2026-11-14 저장소의 현재 README와 MinLab 등록 정보를 대조했습니다. 이번 작업에서 원본 앱을 새로 실행하거나 기존 검사 수치를 재검증하지는 않았습니다.",
    remaining:
      "실제 서류나 증명서로 사용할 수 없습니다. 이번에는 생성·내보내기의 브라우저 동작을 재검증하지 않았습니다.",
    sources: [
      {
        label: "현재 사용 방법과 한계",
        url: "https://github.com/minho-nim/excuseoffice/blob/main/README.md",
      },
    ],
  },
  "proj-snake-race": {
    audience:
      "그린 모양이 경주 결과에 어떤 차이를 만드는지 실험하고 싶은 사람을 위한 게임입니다.",
    purpose:
      "머리·몸통·꼬리를 직접 그리고 길이·무게·크기를 달리하며 코스를 달리도록 구성했습니다.",
    flow: [
      "머리·몸통·꼬리를 그리고 연결점을 조절합니다.",
      "코스와 조작 방식을 골라 CPU와 경주합니다.",
      "완주 기록을 비교하고 친구에게 기록 도전 링크를 보냅니다.",
    ],
    implementation:
      "현재 README에는 그림 편집·체형별 능력치·자동/수동 경주·기록 재생·친구 도전이 설명돼 있습니다. 친구 도전은 기록 비교이며 실시간 동시 대전이 아닙니다.",
    verification:
      "2026-11-14 저장소의 현재 README와 MinLab 등록 정보를 대조했습니다. 이번 작업에서 원본 앱을 새로 실행하거나 기존 검사 수치를 재검증하지는 않았습니다.",
    remaining:
      "체형 계산은 게임 규칙이며 실제 물성을 측정한 결과가 아닙니다. 실제 기기와 장시간 플레이의 밸런스는 이번에 검증하지 않았습니다.",
    sources: [
      {
        label: "현재 사용 방법과 한계",
        url: "https://github.com/minho-nim/MinSnakey/blob/main/README.md",
      },
    ],
  },
  "proj-musclemap": {
    audience:
      "어느 부위를 운동할지 찾고 루틴과 실제 세트 기록을 비교하려는 사람을 위한 앱입니다.",
    purpose:
      "운동 종목을 근육 지도에서 찾고, 계획한 운동과 실제로 끝낸 세트를 연결해 살펴보도록 구성했습니다.",
    flow: [
      "근육 지도나 요일별 루틴에서 운동 종목을 고릅니다.",
      "운동을 시작해 중량·반복 수와 완료 세트를 기록합니다.",
      "휴식 타이머와 부위별 기록을 확인하고 JSON 백업을 보관합니다.",
    ],
    implementation:
      "현재 README에는 근육 지도·종목 안내·세트 기록·루틴 비교·휴식 타이머가 설명돼 있습니다. 추천은 규칙 기반이며 기록은 IndexedDB에 저장됩니다.",
    verification:
      "2026-11-14 저장소의 현재 README와 MinLab 등록 정보를 대조했습니다. 이번 작업에서 원본 앱을 새로 실행하거나 기존 검사 수치를 재검증하지는 않았습니다.",
    remaining:
      "다른 기기와 자동 동기화되지 않습니다. 운동 안내의 개인 적합성과 실제 기기의 알림·진동은 이번에 검증하지 않았습니다.",
    sources: [
      {
        label: "현재 사용 방법과 한계",
        url: "https://github.com/minho-nim/musclemap/blob/main/README.md",
      },
    ],
  },
  "proj-minoom": {
    audience:
      "방을 돌아다니고 가구 배치를 바꾸어 보고 싶은 사람을 위한 3D 공간입니다.",
    purpose:
      "가구 사진을 보관하는 일과 실제 3D 모델을 배치하는 일을 구분하며, 벽과 가구가 겹치지 않는 배치를 시도하도록 구성했습니다.",
    flow: [
      "PC 키보드·마우스나 모바일 조작부로 공간을 둘러봅니다.",
      "조감도에서 가구를 선택하고 위치·회전·크기를 조절합니다.",
      "충돌 여부를 확인한 뒤 배치를 저장합니다.",
    ],
    implementation:
      "원본 README에는 로컬 이동·가구 이용·배치 편집과 Supabase 연결 코드가 설명돼 있습니다. 환경변수가 없으면 로컬 체험이며 가상 접속자를 표시하지 않습니다.",
    verification:
      "2026-11-14 저장소의 현재 README와 MinLab 등록 정보를 대조했습니다. 이번 작업에서 원본 앱을 새로 실행하거나 기존 검사 수치를 재검증하지는 않았습니다.",
    remaining:
      "원본 문서도 실제 기기 WebGL·터치와 Supabase 두 계정 동시 접속을 미검증으로 구분합니다. 사진에서 3D를 자동 생성하는 기능은 없습니다.",
    sources: [
      {
        label: "현재 사용 방법과 한계",
        url: "https://github.com/minho-nim/minoom/blob/main/README.md",
      },
    ],
  },
  "proj-1792645542246": {
    audience:
      "메시지가 의도와 다르게 받아들여질까 고민하는 사람을 대상으로 한 서비스 구상입니다.",
    purpose:
      "전달하려던 뜻과 상대가 읽을 수 있는 뜻의 차이를 설명하고, 의도를 유지하는 표현을 제안하려는 기획입니다.",
    flow: [
      "메시지와 전달하려는 의도를 입력하는 흐름을 구상했습니다.",
      "오해할 수 있는 표현과 대안을 비교하는 방향입니다.",
    ],
    implementation:
      "현재 MinLab에는 구상 중인 프로젝트로 등록돼 있습니다. 이번에 확인한 자료만으로 실행 가능한 분석 기능을 구현 완료로 표시하지 않습니다.",
    verification:
      "등록된 프로젝트 정보만 확인했습니다. 실제 앱 화면·분석 결과·성능은 검증하지 않았습니다.",
    remaining: "작동하는 앱과 실제 사용 사례, 구현·검증 근거가 필요합니다.",
    sources: [],
  },
};
