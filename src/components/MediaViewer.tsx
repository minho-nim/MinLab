import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X, ZoomIn, ZoomOut } from "lucide-react";
import type { ResolvedMedia } from "../utils/projectMedia";

export function MediaViewer({
  name,
  screens,
  initialIndex,
  onClose,
}: {
  name: string;
  screens: ResolvedMedia[];
  initialIndex: number;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const [active, setActive] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [loaded, setLoaded] = useState("");
  const [failed, setFailed] = useState("");
  const start = useRef<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const title = useId();
  const index = Math.max(0, Math.min(active, screens.length - 1));
  const screen = screens[index];
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const node = dialog.current;
    node?.showModal();
    document.body.style.overflow = "hidden";
    const leave = () => close.current();
    window.addEventListener("hashchange", leave);
    return () => {
      window.removeEventListener("hashchange", leave);
      node?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    setZoomed(false);
    stage.current?.scrollTo(0, 0);
    const button = track.current?.querySelectorAll("button")[index];
    if (button && track.current)
      track.current.scrollTo({
        left: button.offsetLeft - track.current.offsetLeft - 8,
        behavior: "instant",
      });
    // Browsers can drop focus when the previous/next button becomes disabled.
    const focused = document.activeElement;
    if (
      !dialog.current?.contains(focused) ||
      (focused instanceof HTMLButtonElement && focused.disabled)
    )
      dialog.current?.focus({ preventScroll: true });
  }, [index]);
  useEffect(() => {
    if (zoomed) stage.current?.focus({ preventScroll: true });
    drag.current = null;
    stage.current?.removeAttribute("data-dragging");
  }, [zoomed]);
  if (!screen) return null;
  const select = (next: number) =>
    setActive(Math.max(0, Math.min(next, screens.length - 1)));
  return (
    <dialog
      ref={dialog}
      tabIndex={-1}
      className="media-viewer"
      aria-labelledby={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (zoomed || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          select(index + (event.key === "ArrowRight" ? 1 : -1));
        } else if (event.key === "Home" || event.key === "End") {
          event.preventDefault();
          select(event.key === "Home" ? 0 : screens.length - 1);
        }
      }}
    >
      <header className="media-viewer-header">
        <div>
          <p className="eyebrow">프로젝트 화면</p>
          <h2 id={title}>{name}</h2>
        </div>
        <button onClick={onClose} aria-label="화면 미리보기 닫기" autoFocus>
          <X size={22} />
        </button>
      </header>
      <div
        ref={stage}
        tabIndex={zoomed ? 0 : -1}
        aria-label={
          zoomed
            ? "확대한 화면. 스크롤하거나 드래그하여 둘러보세요."
            : undefined
        }
        className={"media-viewer-stage" + (zoomed ? " zoomed" : "")}
        aria-busy={loaded !== screen.src && failed !== screen.src}
        onPointerDown={(event) => {
          if (!zoomed || event.pointerType !== "mouse" || event.button !== 0)
            return;
          const node = event.currentTarget;
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            left: node.scrollLeft,
            top: node.scrollTop,
          };
          node.dataset.dragging = "true";
          node.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          event.currentTarget.scrollTo(
            drag.current.left + drag.current.x - event.clientX,
            drag.current.top + drag.current.y - event.clientY,
          );
        }}
        onPointerUp={(event) => {
          drag.current = null;
          event.currentTarget.removeAttribute("data-dragging");
        }}
        onPointerCancel={(event) => {
          drag.current = null;
          event.currentTarget.removeAttribute("data-dragging");
        }}
        onLostPointerCapture={(event) => {
          drag.current = null;
          event.currentTarget.removeAttribute("data-dragging");
        }}
        onTouchStart={(event) => {
          start.current =
            !zoomed && event.touches.length === 1
              ? { x: event.touches[0].clientX, y: event.touches[0].clientY }
              : null;
        }}
        onTouchMove={(event) => {
          if (event.touches.length > 1) start.current = null;
        }}
        onTouchCancel={() => {
          start.current = null;
        }}
        onTouchEnd={(event) => {
          const point = start.current;
          start.current = null;
          if (!point || zoomed || event.touches.length) return;
          const dx = point.x - event.changedTouches[0].clientX;
          const dy = point.y - event.changedTouches[0].clientY;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3)
            select(index + (dx > 0 ? 1 : -1));
        }}
      >
        {failed === screen.src ? (
          <p role="status">
            {screens.length > 1
              ? "이미지를 불러오지 못했습니다. 다른 화면을 선택해 보세요."
              : "이미지를 불러오지 못했습니다. 잠시 후 다시 열어주세요."}
          </p>
        ) : (
          <>
            {loaded !== screen.src && (
              <p className="media-viewer-loading" role="status">
                화면 불러오는 중
              </p>
            )}
            <img
              key={screen.src}
              className="viewer-screen"
              src={screen.src}
              alt={name + " — " + screen.label}
              decoding="async"
              draggable={false}
              onLoad={() => setLoaded(screen.src)}
              onError={() => setFailed(screen.src)}
            />
          </>
        )}
      </div>
      <div className="media-viewer-controls">
        <button
          disabled={index === 0}
          onClick={() => select(index - 1)}
          aria-label="이전 화면"
        >
          <ArrowLeft size={20} />
        </button>
        <p aria-live="polite" aria-atomic="true">
          <span>
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(screens.length).padStart(2, "0")}
          </span>
          {screen.label}
        </p>
        <button
          disabled={index === screens.length - 1}
          onClick={() => select(index + 1)}
          aria-label="다음 화면"
        >
          <ArrowRight size={20} />
        </button>
        <button
          disabled={failed === screen.src || loaded !== screen.src}
          onClick={() => setZoomed(!zoomed)}
          aria-pressed={zoomed}
          aria-label={zoomed ? "화면에 맞추기" : "화면 확대"}
        >
          {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
        </button>
      </div>
      <nav
        ref={track}
        className="media-viewer-track"
        aria-label="미리보기 화면 선택"
      >
        {screens.map((item, i) => (
          <button
            key={item.id}
            aria-pressed={index === i}
            onClick={() => select(i)}
          >
            <span className="viewer-thumbnail" aria-hidden="true">
              <img
                src={item.src}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
                onError={(event) => {
                  event.currentTarget.style.visibility = "hidden";
                }}
              />
            </span>
            <span className="viewer-thumbnail-label">
              <small>{String(i + 1).padStart(2, "0")}</small>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
      <p className="media-viewer-help">
        {zoomed
          ? "스크롤·드래그로 자세히 보기"
          : "좌우 키 또는 스와이프로 넘기기"}{" "}
        · Esc로 닫기
      </p>
    </dialog>
  );
}
