import { useState } from "react";
import type { Project } from "../types";
import { resolveProjectMedia } from "../utils/projectMedia";
export function mediaFor(project: Project) {
  return resolveProjectMedia(project, import.meta.env.BASE_URL);
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
    <div
      data-project-media={project.id}
      className={
        "project-media " +
        (!media || failed === media.src ? "without-image" : "")
      }
    >
      {media && failed !== media.src ? (
        <img
          src={media.src}
          alt={project.name + " — " + media.label}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          style={{ objectFit: media.fit }}
          onError={() => setFailed(media.src)}
        />
      ) : (
        <div className="media-empty">
          <span>{project.category}</span>
          <p>
            {media
              ? "이미지를 불러오지 못했습니다."
              : "아직 등록된 화면이 없습니다."}
          </p>
          <small>
            {project.keyFeatures.length
              ? project.keyFeatures
                  .slice(0, 2)
                  .map((f) => (typeof f === "string" ? f : f.name))
                  .join(" · ")
              : project.techStack.slice(0, 3).join(" · ")}
          </small>
        </div>
      )}
    </div>
  );
}
