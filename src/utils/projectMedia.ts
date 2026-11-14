import type { Project, ProjectScreenshot } from "../types";
export interface ResolvedMedia {
  id: string;
  src: string;
  label: string;
  description?: string;
  action?: string;
  outcome?: string;
  rationale?: string;
  notice?: string;
  featureId?: string;
  version?: string;
  fit: "contain" | "cover";
  section?: number;
}
export const bundledScreens: Record<string, ResolvedMedia[]> = {
  "proj-minlab-ai-office": [
    {
      id: "minoffia-portfolio-0",
      src: "media/minoffia-portfolio-0.webp",
      label: "사무실과 대화창 · 예시 데이터",
      description:
        "방마다 맡은 일이 다른 AI들이 보입니다. 캐릭터 위치와 말풍선은 업무 상태를 나타냅니다.",
      action: "역할별 AI와 업무 상태를 확인합니다.",
      outcome: "어떤 일을 맡겼고 어디를 검토해야 하는지 살펴봅니다.",
      rationale: "업무의 배정과 실제 실행 상태를 구분하기 위한 화면입니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-1",
      src: "media/minoffia-portfolio-1.webp",
      label: "휴대폰에서 요청하기 · 예시 데이터",
      description:
        "대화로 할 일을 적고 답을 확인합니다. 화면은 체험 모드의 예시 데이터입니다.",
      action: "휴대폰 대화창에서 요청을 입력합니다.",
      outcome: "기획과 확인이 필요한 업무로 이어집니다.",
      rationale:
        "복잡한 화면을 오가며 같은 설명을 반복하는 일을 줄이려는 흐름입니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-2",
      src: "media/minoffia-portfolio-2.webp",
      label: "접수와 스킬 선택 · 예시 데이터",
      description: "접수한 일에 사용할 작업 설명서(스킬)를 고릅니다.",
      action: "요청에 사용할 작업 설명서인 스킬을 선택합니다.",
      outcome: "업무와 선택한 작업 방법을 함께 확인합니다.",
      rationale: "AI가 맡을 일과 참고할 방법을 분리해 전달하려는 구성입니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-3",
      src: "media/minoffia-portfolio-3.webp",
      label: "업무 보드 · 예시 데이터",
      description: "맡긴 일을 상태별로 모아 보고, 사람이 확인할 일을 찾습니다.",
      action: "업무 보드에서 상태를 보고 사람이 확인할 일을 엽니다.",
      outcome: "기획·결과·올리기와 배포 승인 단계를 구분해 검토합니다.",
      rationale:
        "배정만 된 일을 완료로 오해하지 않도록 검토 지점을 남겼습니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-4",
      src: "media/minoffia-portfolio-4.webp",
      label: "AI 팀 상태 · 예시 데이터",
      description:
        "역할을 나눈 AI들의 상태를 확인합니다. 배정과 실제 실행은 구분해서 봅니다.",
      action: "AI 팀의 역할과 상태를 확인합니다.",
      outcome: "요청을 누가 맡는지와 실제 실행 여부를 나누어 봅니다.",
      rationale:
        "자동화의 흐름 안에서도 사람이 현재 상태를 이해할 수 있어야 하기 때문입니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
  ],
  "proj-minially": [
    {
      id: "minially-portfolio-0",
      src: "media/minially-portfolio-0.webp",
      label: "PC 달력 · 예시 데이터",
      description: "넓은 화면에서는 날짜별 일정과 시간을 함께 봅니다.",
      action: "월간 달력을 넘기며 날짜와 시간을 확인합니다.",
      outcome: "넓은 화면에서 날짜별 일정을 한눈에 살펴봅니다.",
      rationale: "달력과 별도 목록을 번갈아 확인하는 일을 줄이려는 구성입니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-1",
      src: "media/minially-portfolio-1.webp",
      label: "휴대폰 달력 · 예시 데이터",
      description:
        "날짜에 붙은 일정 이름을 보고, 날짜를 눌러 그날 일을 엽니다.",
      action: "날짜에 붙은 일정 이름을 보고 하루를 누릅니다.",
      outcome: "선택한 날짜의 일정과 할 일을 엽니다.",
      rationale:
        "작은 화면에서도 날짜에서 바로 해야 할 일로 이어지게 했습니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-2",
      src: "media/minially-portfolio-2.webp",
      label: "하루 일정과 할 일 · 예시 데이터",
      description: "선택한 날짜의 일정과 할 일을 카테고리별로 모아 봅니다.",
      action: "선택한 날의 입력창에서 제목과 필요한 정보를 적습니다.",
      outcome: "그날 일정과 할 일을 카테고리별로 모아 봅니다.",
      rationale:
        "등록한 내용이 어느 날짜에 들어갔는지 바로 확인하게 하려는 흐름입니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-3",
      src: "media/minially-portfolio-3.webp",
      label: "자주 쓰는 문구 · 예시 데이터",
      description:
        "입력창에서 프리셋을 눌러 제목을 넣습니다. 넣은 제목은 다시 고칠 수 있습니다.",
      action: "자주 쓰는 문구를 눌러 제목을 넣고 필요하면 고칩니다.",
      outcome: "날짜·시간·메모를 유지하면서 반복 입력을 줄입니다.",
      rationale:
        "빠른 입력이 작성 중인 다른 내용을 지우면 안 된다고 정했습니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-4",
      src: "media/minially-portfolio-4.webp",
      label: "할 일 목록 · 예시 데이터",
      description: "할 일은 하루 단위로 보고, 끝내면 완료로 표시합니다.",
      action: "하루 단위 목록에서 끝낸 할 일을 완료로 표시합니다.",
      outcome: "남은 일과 마친 일을 구분해 다음 일을 확인합니다.",
      rationale:
        "달력의 일정과 끝내야 하는 일을 한곳에서 관리하려는 기능입니다.",
      notice:
        "원본 공개 포트폴리오의 예시 데이터 화면입니다. 실제 계정 동작을 이번에 재검증한 화면은 아닙니다.",
      fit: "contain",
    },
  ],
  "proj-snake-race": [
    {
      id: "minsnakey-sample",
      src: "media/minsnakey.webp",
      label: "앱 내 샘플 경기 준비 화면",
      fit: "contain",
    },
  ],
  "proj-1792978415000": [
    {
      id: "worthit-demo",
      src: "media/valumin-overview.webp",
      label: "소비와 목표 살펴보기",
      description: "",
      action: "샘플 체험에서 물건·구독·회원권의 가격과 현재 단가를 봅니다.",
      outcome: "항목마다 다른 사용 기준과 내가 정한 목표를 비교합니다.",
      rationale:
        "구매가만 보지 않고 얼마나 썼는지를 함께 돌아보도록 구성했습니다.",
      notice:
        "예시 데이터입니다. 원본 앱 UI에는 이전 명칭 WorthIt이 남아 있습니다.",
      fit: "contain",
    },
    {
      id: "valumin-register",
      src: "media/valumin-register.webp",
      label: "내 사용 목표로 등록하기",
      description: "",
      action: "소비 이름·가격과 기록 방식을 정하고 만족할 사용량을 입력합니다.",
      outcome: "입력한 사용량을 기준으로 목표 단가를 계산합니다.",
      rationale:
        "본전의 기준을 앱이 정답처럼 제시하지 않고 사용자의 계획에서 출발하게 했습니다.",
      notice:
        "원본 앱의 등록 양식 캡처입니다. 이 캡처로 새 항목 저장까지 검증한 것은 아닙니다.",
      fit: "contain",
    },
    {
      id: "valumin-usage",
      src: "media/valumin-usage.webp",
      label: "쓸 때마다 기록하기",
      description: "",
      action: "항목의 +1회 사용을 눌러 사용 횟수를 추가합니다.",
      outcome: "누적 사용량과 현재 사용 단가가 함께 갱신됩니다.",
      rationale:
        "나중에 한꺼번에 기억해서 적기보다 실제 사용 시점에 간단히 남기게 하려는 흐름입니다.",
      notice:
        "실제 저장소와 분리된 샘플 체험입니다. 원본의 WorthIt 표기를 보존했습니다.",
      fit: "contain",
    },
    {
      id: "valumin-detail",
      src: "media/valumin-detail.webp",
      label: "단가와 목표 확인하기",
      description: "",
      action: "소비 항목의 상세보기를 열어 사용 기록과 목표를 확인합니다.",
      outcome: "현재 단가와 남은 목표를 기록과 함께 볼 수 있습니다.",
      rationale:
        "낮아진 단가를 실제 절약액으로 오해하지 않도록 사용 기준과 목표를 함께 보여줍니다.",
      notice: "예시 데이터 · 현재 원본 앱의 이전 명칭이 표시됩니다.",
      fit: "contain",
    },
  ],
  "proj-crossroads-ai-verdict": [
    {
      id: "crossroads-start",
      src: "media/minova-intro.webp",
      label: "도시와 인물 만나기",
      description: "",
      action: "세계관과 주요 인물을 읽고 감독관으로 취임합니다.",
      outcome: "첫 목표와 조작 방법을 확인한 뒤 사건 검토를 시작합니다.",
      rationale:
        "AI의 제안을 그대로 따르는 역할이 아니라, 사람들의 서로 다른 입장을 검토하는 역할임을 먼저 알리기 위해서입니다.",
      notice: "",
      fit: "contain",
    },
    {
      id: "minova-choice",
      src: "media/minova-choice.webp",
      label: "사건 읽고 선택하기",
      description: "",
      action:
        "사건의 대사와 선택지 전문을 읽고 왼쪽·오른쪽 정책 중 하나를 고릅니다.",
      outcome: "선택이 저장되고 해당 정책에 따른 다음 사건으로 이어집니다.",
      rationale:
        "짧은 승인·거부만 보고 고르지 않도록, 선택할 정책의 내용을 먼저 읽게 했습니다.",
      notice: "",
      fit: "contain",
    },
    {
      id: "minova-values",
      src: "media/minova-values.webp",
      label: "네 가지 가치의 변화 보기",
      description: "",
      action:
        "선택 전 예상 영향을 살피고, 결정 후 바뀐 시민 신뢰·공정성·개인 자유·사회 안전을 확인합니다.",
      outcome:
        "같은 정책이 어떤 지표에는 유리하고 다른 지표에는 불리한 결과를 만듭니다.",
      rationale:
        "좋은 선택을 하나의 점수로 단정하지 않고 가치 사이의 긴장을 드러내려는 설계입니다.",
      notice: "",
      fit: "contain",
    },
    {
      id: "minova-history",
      src: "media/minova-history.webp",
      label: "판단 기록 돌아보기",
      description: "",
      action: "기록·목표를 열어 앞서 고른 정책과 그 결과를 다시 읽습니다.",
      outcome:
        "그때 선택한 내용과 지표 변화를 다음 판단의 근거로 참고할 수 있습니다.",
      rationale:
        "결과를 순간적인 효과로만 소비하지 않고 결정의 맥락을 돌아보게 하려는 기능입니다.",
      notice: "",
      fit: "contain",
    },
    {
      id: "minova-freeplay",
      src: "media/minova-freeplay.webp",
      label: "ACT 이후 자유 운영",
      description: "",
      action: "ACT I·II의 이야기를 마친 뒤 기존 도시 상태로 운영을 이어갑니다.",
      outcome:
        "메인 이야기를 반복하지 않고 도시 정책과 조건부 사건을 검토합니다.",
      rationale:
        "이야기의 끝과 도시 운영의 끝을 분리하면서, 누적된 선택의 맥락을 유지하도록 했습니다.",
      notice:
        "원본 엔진의 자동 진행 한 경로로 도달한 예시 플레이입니다. ACT III 화면이 아닙니다.",
      fit: "contain",
    },
  ],
  "proj-musclemap": [
    {
      id: "musclemap-home",
      src: "media/musclemap.webp",
      label: "운동 관리 화면",
      fit: "contain",
      section: 0,
    },
    {
      id: "musclemap-map",
      src: "media/musclemap-map.webp",
      label: "근육 지도",
      fit: "contain",
      section: 2,
    },
  ],
};
export function imageUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(https?:\/\/|\/(?!\/)|\.\.?\/|data:image\/(png|jpeg|webp);base64,[a-z0-9+/]+=*$)/i.test(
      value,
    )
  );
}
export function parseScreenshots(value: unknown): ProjectScreenshot[] {
  if (!Array.isArray(value)) throw Error("스크린샷은 배열이어야 합니다.");
  const seen = new Set<string>();
  return value.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.id !== "string" ||
      !item.id ||
      seen.has(item.id) ||
      !imageUrl(item.url) ||
      typeof item.label !== "string"
    )
      throw Error("스크린샷 ID·이미지 주소·설명을 확인해 주세요.");
    seen.add(item.id);
    return {
      id: item.id,
      url: item.url,
      label: item.label,
      ...(typeof item.version === "string" && item.version
        ? { version: item.version }
        : {}),
      fit: item.fit === "cover" ? "cover" : "contain",
      ...(typeof item.featureId === "string" && item.featureId
        ? { featureId: item.featureId }
        : {}),
    };
  });
}
export function resolveProjectMedia(
  project: Project,
  base = "/",
): ResolvedMedia[] {
  const custom = (project.screenshots || [])
    .filter((s) => imageUrl(s.url))
    .map(
      (s) =>
        ({
          id: s.id,
          src: s.url,
          label: s.label || project.name,
          fit: s.fit || "contain",
          featureId: s.featureId,
          version: s.version,
        }) as ResolvedMedia,
    );
  if (
    project.thumbnailUrl &&
    imageUrl(project.thumbnailUrl) &&
    !project.thumbnailUrl.includes("images.unsplash.com") &&
    !custom.some((s) => s.src === project.thumbnailUrl)
  )
    custom.push({
      id: "legacy-thumbnail",
      src: project.thumbnailUrl,
      label: "대표 화면",
      fit: "contain",
    });
  const all = [
    ...custom,
    ...(bundledScreens[project.id] || []).map((s) => ({
      ...s,
      src: base + s.src,
    })),
  ];
  const cover = all.find((s) => s.id === project.coverImageId);
  return cover ? [cover, ...all.filter((s) => s !== cover)] : all;
}
