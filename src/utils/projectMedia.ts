import type { Project, ProjectScreenshot } from "../types";
export interface ResolvedMedia {
  id: string;
  src: string;
  label: string;
  featureId?: string;
  fit: "contain" | "cover";
  section?: number;
}
export const bundledScreens: Record<string, ResolvedMedia[]> = {
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
