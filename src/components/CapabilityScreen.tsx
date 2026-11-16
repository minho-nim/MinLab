import { useState } from "react";
import type { Project } from "../types";
import { mediaFor, ProjectMedia } from "./ProjectMedia";

const openByRecord = new Map<string, boolean>();

/** Only show a screen explicitly linked to the evidence record. */
export function CapabilityScreen({
  project,
  logId,
}: {
  project: Project;
  logId: string;
}) {
  const storageKey = "minlab_about_screen:" + project.id + ":" + logId;
  const [expanded, setExpanded] = useState(() => {
    if (openByRecord.has(storageKey)) return openByRecord.get(storageKey)!;
    try {
      return sessionStorage.getItem(storageKey) === "open";
    } catch {
      return false;
    }
  });
  const screens = mediaFor(project);
  const index = screens.findIndex((screen) => screen.processLogId === logId);
  if (index < 0) return null;
  const screen = screens[index];
  return (
    <details
      className="capability-screen"
      open={expanded}
      onToggle={(event) => {
        const open = event.currentTarget.open;
        setExpanded(open);
        openByRecord.set(storageKey, open);
        try {
          if (open) sessionStorage.setItem(storageKey, "open");
          else sessionStorage.removeItem(storageKey);
        } catch {
          // The in-memory value still survives SPA navigation when storage is blocked.
        }
      }}
    >
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
