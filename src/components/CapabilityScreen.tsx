import type { Project } from "../types";
import { mediaFor, ProjectMedia } from "./ProjectMedia";

/** Only show a screen explicitly linked to the evidence record. */
export function CapabilityScreen({
  project,
  logId,
}: {
  project: Project;
  logId: string;
}) {
  const screens = mediaFor(project);
  const index = screens.findIndex((screen) => screen.processLogId === logId);
  if (index < 0) return null;
  const screen = screens[index];
  return (
    <details className="capability-screen">
      <summary>관련 화면 보기 · {screen.label}</summary>
      <ProjectMedia
        key={screen.id}
        project={project}
        index={index}
        zoomable
        expandLabel={project.name + " 관련 화면 크게 보기"}
      />
      <small>{screen.notice} 기록 당시 버전의 캡처는 아닙니다.</small>
    </details>
  );
}
