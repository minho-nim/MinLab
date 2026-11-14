import type { Project, ProjectScreenshot } from "../types";
export interface ResolvedMedia {
  id: string;
  src: string;
  label: string;
  description?: string;
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
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-1",
      src: "media/minoffia-portfolio-1.webp",
      label: "휴대폰에서 요청하기 · 예시 데이터",
      description:
        "대화로 할 일을 적고 답을 확인합니다. 화면은 체험 모드의 예시 데이터입니다.",
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-2",
      src: "media/minoffia-portfolio-2.webp",
      label: "접수와 스킬 선택 · 예시 데이터",
      description: "접수한 일에 사용할 작업 설명서(스킬)를 고릅니다.",
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-3",
      src: "media/minoffia-portfolio-3.webp",
      label: "업무 보드 · 예시 데이터",
      description: "맡긴 일을 상태별로 모아 보고, 사람이 확인할 일을 찾습니다.",
      fit: "contain",
    },
    {
      id: "minoffia-portfolio-4",
      src: "media/minoffia-portfolio-4.webp",
      label: "AI 팀 상태 · 예시 데이터",
      description:
        "역할을 나눈 AI들의 상태를 확인합니다. 배정과 실제 실행은 구분해서 봅니다.",
      fit: "contain",
    },
  ],
  "proj-minially": [
    {
      id: "minially-portfolio-0",
      src: "media/minially-portfolio-0.webp",
      label: "PC 달력 · 예시 데이터",
      description: "넓은 화면에서는 날짜별 일정과 시간을 함께 봅니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-1",
      src: "media/minially-portfolio-1.webp",
      label: "휴대폰 달력 · 예시 데이터",
      description:
        "날짜에 붙은 일정 이름을 보고, 날짜를 눌러 그날 일을 엽니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-2",
      src: "media/minially-portfolio-2.webp",
      label: "하루 일정과 할 일 · 예시 데이터",
      description: "선택한 날짜의 일정과 할 일을 카테고리별로 모아 봅니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-3",
      src: "media/minially-portfolio-3.webp",
      label: "자주 쓰는 문구 · 예시 데이터",
      description:
        "입력창에서 프리셋을 눌러 제목을 넣습니다. 넣은 제목은 다시 고칠 수 있습니다.",
      fit: "contain",
    },
    {
      id: "minially-portfolio-4",
      src: "media/minially-portfolio-4.webp",
      label: "할 일 목록 · 예시 데이터",
      description: "할 일은 하루 단위로 보고, 끝내면 완료로 표시합니다.",
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
      src: "media/worthit.webp",
      label: "앱 내 샘플 소비 화면",
      fit: "contain",
    },
  ],
  "proj-crossroads-ai-verdict": [
    {
      id: "crossroads-start",
      src: "media/minova.webp",
      label: "게임 시작 화면",
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
