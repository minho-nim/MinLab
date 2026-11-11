import { useEffect, useRef, useState } from "react";
import type { ProjectScreenshot, ProjectFeature } from "../types";
import { imageUrl } from "../utils/projectMedia";
async function optimizeImage(file: File) {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 12 * 1024 * 1024
  )
    throw Error("12MB 이하의 PNG·JPEG·WebP 파일을 선택하세요.");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw Error(
        "이미지 변환을 지원하지 않는 브라우저입니다. 이미지 URL을 등록해 주세요.",
      );
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.82);
  } finally {
    bitmap.close();
  }
}
export function MediaEditor({
  value,
  onChange,
  cover,
  onCover,
  onBusyChange,
  features = [],
}: {
  value: ProjectScreenshot[];
  onChange: (v: ProjectScreenshot[]) => void;
  cover: string;
  onCover: (id: string) => void;
  onBusyChange: (busy: boolean) => void;
  features?: (ProjectFeature | string)[];
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const patch = (id: string, changes: Partial<ProjectScreenshot>) =>
    onChange(value.map((s) => (s.id === id ? { ...s, ...changes } : s)));
  return (
    <fieldset className="media-editor">
      <legend>프로젝트 화면</legend>
      <p>
        실제 화면을 등록하세요. 대표 화면과 추가 스크린샷은 프로젝트 JSON 백업에
        함께 보관됩니다.
      </p>
      <div className="media-editor-actions">
        <label className="upload-image">
          이미지 파일 추가
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            aria-label="프로젝트 이미지 업로드"
            disabled={busy}
            onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              e.target.value = "";
              setBusy(true);
              onBusyChange(true);
              setError("");
              try {
                const results = await Promise.all(
                  files.map(async (file) => ({
                    id: crypto.randomUUID(),
                    url: await optimizeImage(file),
                    label: file.name.replace(/\.[^.]+$/, ""),
                    fit: "contain" as const,
                  })),
                );
                if (alive.current) onChange([...value, ...results]);
              } catch (err) {
                if (alive.current) setError((err as Error).message);
              } finally {
                if (alive.current) {
                  setBusy(false);
                  onBusyChange(false);
                }
              }
            }}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...value,
              { id: crypto.randomUUID(), url: "", label: "", fit: "contain" },
            ])
          }
        >
          이미지 URL 추가
        </button>
      </div>
      {busy && (
        <p role="status">
          이미지를 최적화하고 있습니다. 완료 후 저장해 주세요.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {value.map((s, i) => (
        <div className="media-editor-item" key={s.id}>
          <div className="media-editor-thumbnail">
            {imageUrl(s.url) ? (
              <img
                src={s.url}
                alt={s.label || "등록 중인 화면"}
                onError={(e) => {
                  e.currentTarget.style.visibility = "hidden";
                }}
                onLoad={(e) => {
                  e.currentTarget.style.visibility = "visible";
                }}
              />
            ) : (
              <span>화면 {i + 1}</span>
            )}
          </div>
          <div>
            <label>
              화면 설명
              <input
                aria-label={"이미지 " + (i + 1) + " 설명"}
                value={s.label}
                onChange={(e) => patch(s.id, { label: e.target.value })}
              />
            </label>
            <label>
              이미지 주소
              {s.url.startsWith("data:") ? (
                <span className="stored-image">
                  브라우저에 저장된 업로드 이미지
                </span>
              ) : (
                <input
                  aria-label={"이미지 " + (i + 1) + " 주소"}
                  value={s.url}
                  placeholder="https://… 또는 /media/…"
                  onChange={(e) => patch(s.id, { url: e.target.value })}
                />
              )}
            </label>
            <div className="media-editor-options">
              <label>
                <input
                  type="radio"
                  name="cover-image"
                  checked={cover === s.id || (!cover && i === 0)}
                  onChange={() => onCover(s.id)}
                />
                대표 화면
              </label>
              <label>
                표시
                <select
                  aria-label={"이미지 " + (i + 1) + " 비율"}
                  value={s.fit || "contain"}
                  onChange={(e) =>
                    patch(s.id, { fit: e.target.value as "contain" | "cover" })
                  }
                >
                  <option value="contain">전체 화면 보기</option>
                  <option value="cover">영역 채우기</option>
                </select>
              </label>
              {features.length > 0 && (
                <label>
                  연결 기능
                  <select
                    aria-label={"이미지 " + (i + 1) + " 연결 기능"}
                    value={s.featureId || ""}
                    onChange={(e) => patch(s.id, { featureId: e.target.value })}
                  >
                    <option value="">연결하지 않음</option>
                    {features.map((f, j) => (
                      <option
                        key={j}
                        value={typeof f === "string" ? "feature-" + j : f.id}
                      >
                        {typeof f === "string" ? f : f.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                onChange(value.filter((v) => v.id !== s.id));
                if (cover === s.id) onCover("");
              }}
            >
              화면 {i + 1} 제거
            </button>
          </div>
        </div>
      ))}
    </fieldset>
  );
}
