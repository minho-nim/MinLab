import { useState } from "react";
import type { Project } from "../types";
// Captures of the real local applications, kept separate from user-owned project records.
export const projectScreens: Record<
  string,
  { src: string; label: string; section?: number }[]
> = {
  "proj-crossroads-ai-verdict": [
    { src: "media/crossroads.webp", label: "게임 시작 화면" },
  ],
  "proj-musclemap": [
    { src: "media/musclemap.webp", label: "운동 관리 화면", section: 0 },
    { src: "media/musclemap-map.webp", label: "근육 지도", section: 2 },
  ],
};
export function mediaFor(project: Project) {
  if (
    project.thumbnailUrl &&
    !project.thumbnailUrl.includes("images.unsplash.com")
  )
    return [{ src: project.thumbnailUrl, label: project.name }];
  return (projectScreens[project.id] || []).map((item) => ({
    ...item,
    src: import.meta.env.BASE_URL + item.src,
  }));
}
export function ProjectMedia({
  project,
  index = 0,
  eager = false,
}: {
  project: Project;
  index?: number;
  eager?: boolean;
}) {
  const media = mediaFor(project)[index] || mediaFor(project)[0];
  const [failed, setFailed] = useState("");
  return (
    <div className="project-media">
      {media && failed !== media.src ? (
        <img
          src={media.src}
          alt={project.name + " — " + media.label}
          loading={eager ? "eager" : "lazy"}
          onError={() => setFailed(media.src)}
        />
      ) : (
        <div className="media-empty">
          <span className="eyebrow">
            {project.category || "PROJECT ARCHIVE"}
          </span>
          <strong>{project.name}</strong>
          <span>등록된 프로젝트 화면이 없습니다.</span>
        </div>
      )}
    </div>
  );
}
