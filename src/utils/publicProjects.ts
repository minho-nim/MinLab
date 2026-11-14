import type { Project } from "../types";
import snapshot from "../data/archiveSnapshot.json";
import config from "../../archive.config.json";

function valuminLaunchUrl(value: string): string {
  try {
    const url = new URL(value);
    if (
      url.origin === "https://minho-nim.github.io" &&
      /^\/worthit\/?$/.test(url.pathname)
    ) {
      url.pathname = "/Valumin/";
      return url.href;
    }
  } catch {
    /* Keep blank and custom values unchanged. */
  }
  return value;
}

/** Presentation-only corrections: original JSON, IDs and historical records remain untouched. */
export function publicProject(project: Project): Project {
  const legacy = snapshot.find((p) => p.id === project.id);
  const catalog = config.projects.find((p) => p.id === project.id);
  const valumin = project.id === "proj-1792978415000";
  const name = valumin
    ? "Valumin"
    : legacy?.name === project.name && catalog
      ? catalog.name
      : project.name;
  const knownDescription = legacy?.description === project.description;
  const description = knownDescription
    ? project.id === "proj-1792645542246"
      ? "메시지의 의도와 상대의 해석 차이를 살펴보려는 서비스 구상"
      : catalog?.description || project.description
    : project.description;
  return {
    ...project,
    name,
    englishName: valumin || name !== project.name ? name : project.englishName,
    description,
    liveUrl: valumin ? valuminLaunchUrl(project.liveUrl) : project.liveUrl,
    previewUrl:
      valumin && project.previewUrl
        ? valuminLaunchUrl(project.previewUrl)
        : project.previewUrl,
  };
}

/** Translate only unchanged legacy feature copy; stored feature IDs and edits remain intact. */
export function publicFeature(
  projectId: string,
  feature: import("../types").ProjectFeature,
) {
  const original = snapshot
    .find((p) => p.id === projectId)
    ?.keyFeatures?.find((f) => typeof f !== "string" && f.id === feature.id);
  if (
    !original ||
    typeof original === "string" ||
    original.name !== feature.name ||
    original.description !== feature.description
  )
    return feature;
  const copy: Record<string, [string, string]> = {
    "feat-1792542669610": [
      "프로젝트 소개와 소스 연결",
      "프로젝트 소개, 실행 링크와 GitHub 소스를 나누어 확인합니다. 운영 반영 여부는 배포 결과로 따로 확인합니다.",
    ],
    "feat-1792559714416": [
      "온라인 관리 연결",
      "서버 설정과 인증·권한 확인이 필요한 계획입니다. 이 브라우저의 초안 저장과 구분합니다.",
    ],
    "feat-1792571807554": [
      "질문과 요약 확인",
      "필요한 후속 질문에 답하거나 건너뛰고, 요약에서 상황·감정·원하는 변화를 직접 고칩니다.",
    ],
    "feat-1792571819586": [
      "선택에 필요한 정보 정리",
      "현재 기본 흐름은 입력한 내용을 브라우저의 규칙으로 정리합니다. 언어 모델의 추천 점수나 심리 진단을 제공하는 흐름이 아닙니다.",
    ],
    "feat-1792571827375": [
      "다음 행동 정리",
      "결정 전에 더 알아볼 정보와 다음 행동을 살펴봅니다. 계획과 체크리스트는 사용자가 필요할 때 선택합니다.",
    ],
  };
  const value = copy[feature.id];
  return value
    ? { ...feature, name: value[0], description: value[1] }
    : feature;
}
