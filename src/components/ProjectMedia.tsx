import { useEffect, useRef, useState } from "react";
import type { Project } from "../types";
import { resolveProjectMedia, type ResolvedMedia } from "../utils/projectMedia";
import { useMediaMotion } from "../utils/visualMotion";
import { Maximize2 } from "lucide-react";
import { MediaViewer } from "./MediaViewer";
export function mediaFor(project: Project) {
  return resolveProjectMedia(project, import.meta.env.BASE_URL);
}
export function ProjectMedia({
  project,
  index = 0,
  eager = false,
  priority = false,
  zoomable = false,
}: {
  project: Project;
  index?: number;
  eager?: boolean;
  priority?: boolean;
  zoomable?: boolean;
}) {
  const screens = mediaFor(project);
  const media = screens[index] || screens[0];
  const container = useRef<HTMLDivElement>(null);
  const [nearby, setNearby] = useState(false);
  const [failed, setFailed] = useState("");
  const [loaded, setLoaded] = useState("");
  const [viewer, setViewer] = useState(false);
  const lastScreen = useRef<ResolvedMedia | null>(null);
  const [outgoing, setOutgoing] = useState<ResolvedMedia | null>(null);
  useEffect(() => {
    if (!outgoing) return;
    const timer = setTimeout(() => setOutgoing(null), 560);
    return () => clearTimeout(timer);
  }, [outgoing]);
  const requested = eager || priority || nearby;
  useEffect(() => {
    if (requested || !media || !container.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearby(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearby(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [requested, media?.src]);
  const broken = !!media && failed === media.src;
  const ready = !!media && loaded === media.src;
  useMediaMotion(container, ready);
  return (
    <>
      <div
        ref={container}
        data-project-media={project.id}
        data-media-state={
          !media || broken ? "empty" : ready ? "ready" : "loading"
        }
        aria-busy={!!media && requested && !ready && !broken}
        className={
          "project-media " +
          (!media || failed === media.src ? "without-image" : "")
        }
      >
        {media && failed !== media.src ? (
          <>
            {!ready && (
              <span className="media-loading" aria-hidden="true">
                화면 불러오는 중
              </span>
            )}
            {requested && (
              <img
                className={
                  ready ? "media-current image-arrived" : "media-current"
                }
                key={media.src}
                src={media.src}
                alt={project.name + " — " + media.label}
                loading={eager || priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                decoding="async"
                draggable={false}
                style={{ objectFit: media.fit }}
                onLoad={() => {
                  if (lastScreen.current?.src !== media.src)
                    setOutgoing(lastScreen.current);
                  lastScreen.current = media;
                  setLoaded(media.src);
                }}
                onError={() => setFailed(media.src)}
              />
            )}
            {lastScreen.current &&
              lastScreen.current.src !== media.src &&
              !ready && (
                <img
                  className="media-held"
                  src={lastScreen.current.src}
                  alt=""
                  aria-hidden="true"
                  style={{ objectFit: lastScreen.current.fit }}
                />
              )}
            {outgoing && outgoing.src !== media.src && ready && (
              <img
                className="media-outgoing"
                src={outgoing.src}
                alt=""
                aria-hidden="true"
                style={{ objectFit: outgoing.fit }}
              />
            )}
          </>
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
        {zoomable && media && ready && !broken && (
          <button
            className="media-expand"
            aria-label={project.name + " 화면 크게 보기"}
            onClick={() => setViewer(true)}
          >
            <Maximize2 size={18} />
            <span>크게 보기</span>
          </button>
        )}
      </div>
      {viewer && zoomable && media && (
        <MediaViewer
          name={project.name}
          screens={screens}
          initialIndex={Math.max(0, screens.indexOf(media))}
          onClose={() => setViewer(false)}
        />
      )}
    </>
  );
}
