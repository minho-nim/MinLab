import { useEffect, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { safeRead, safeWrite } from "../utils/archiveQuery";
import {
  motionPreferenceEvent,
  motionPreferenceKey,
} from "../utils/visualMotion";

function subscribe(callback: () => void) {
  const storage = () => {
    sessionPaused = undefined;
    callback();
  };
  const reduced = matchMedia("(prefers-reduced-motion:reduce)");
  window.addEventListener(motionPreferenceEvent, callback);
  window.addEventListener("storage", storage);
  reduced.addEventListener("change", callback);
  return () => {
    window.removeEventListener(motionPreferenceEvent, callback);
    window.removeEventListener("storage", storage);
    reduced.removeEventListener("change", callback);
  };
}
let sessionPaused: boolean | undefined;
const paused = () => sessionPaused ?? safeRead(motionPreferenceKey) === "true";
export function MotionControl() {
  const stopped = useSyncExternalStore(subscribe, paused);
  const reduced = useSyncExternalStore(
    subscribe,
    () => matchMedia("(prefers-reduced-motion:reduce)").matches,
  );
  useEffect(() => {
    document.documentElement.dataset.visualMotion = stopped
      ? "paused"
      : "active";
  }, [stopped]);
  useEffect(() => {
    const update = () => {
      document.documentElement.dataset.motionHidden = String(document.hidden);
    };
    document.addEventListener("visibilitychange", update);
    update();
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return (
    <button
      className="motion-control"
      aria-pressed={stopped || reduced}
      disabled={reduced}
      onClick={() => {
        sessionPaused = !stopped;
        safeWrite(motionPreferenceKey, String(!stopped));
        document.documentElement.dataset.visualMotion = !stopped
          ? "paused"
          : "active";
        window.dispatchEvent(new Event(motionPreferenceEvent));
      }}
    >
      {stopped || reduced ? <Play size={14} /> : <Pause size={14} />}
      {reduced ? "움직임 줄임" : stopped ? "움직임 재생" : "움직임 멈추기"}
    </button>
  );
}
