import type { Project } from "../types";
import { mediaFor, ProjectMedia } from "./ProjectMedia";
export function MediaLibrary({
  projects,
  onEdit,
}: {
  projects: Project[];
  onEdit: (p: Project) => void;
}) {
  const count = projects.filter((p) => mediaFor(p).length > 0).length;
  return (
    <section className="media-library">
      <div className="section-heading">
        <div>
          <h2>프로젝트 이미지</h2>
          <p>
            {projects.length}개 프로젝트 중 {count}개에 화면이 있습니다.{" "}
            {projects.length - count}개는 실제 화면이 필요합니다.
          </p>
        </div>
      </div>
      <div className="media-library-grid">
        {projects.map((p) => (
          <article key={p.id}>
            <ProjectMedia project={p} />
            <div>
              <h3>{p.name}</h3>
              <p>
                {mediaFor(p).length
                  ? mediaFor(p).length + "개 화면"
                  : "화면 등록 필요"}
              </p>
              <button
                type="button"
                className="text-link"
                onClick={() => onEdit(p)}
              >
                이미지 관리 ↗
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
