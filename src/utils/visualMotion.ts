export const motionPreferenceKey = "minlab_visual_motion_paused_v1";
export const motionPreferenceEvent = "minlab:visual-motion";

export function motionAllowed() {
  return (
    document.documentElement.dataset.visualMotion !== "paused" &&
    !matchMedia("(prefers-reduced-motion:reduce)").matches
  );
}
