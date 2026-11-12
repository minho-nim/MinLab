import { useEffect, useState } from "react";
import type { Project } from "../types";
import { contentChanges } from "../utils/contentDraft";
import {
  readRemoteDraft,
  readRemoteBackups,
  readRemoteSnapshot,
  saveRemoteDraft,
  publishRemoteDraft,
  signIn,
  signOut,
  type RemoteDraft,
} from "../utils/remoteContent";
export function RemoteStudio({
  projects,
  onLoad,
  about,
  onPublish,
  onAuth,
}: {
  projects: Project[];
  onLoad: (projects: Project[], about: string | null) => boolean;
  about: string | null;
  onPublish: (projects: Project[], about: string | null) => void;
  onAuth: (allowed: boolean) => void;
}) {
  const [draft, setDraft] = useState<RemoteDraft | null>(null);
  const [baseline, setBaseline] = useState<Project[]>([]);
  const [baselineAbout, setBaselineAbout] = useState<string | null>(null);
  const [backups, setBackups] = useState<
    Awaited<ReturnType<typeof readRemoteBackups>>
  >([]);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  useEffect(() => {
    let live = true;
    readRemoteDraft()
      .then(async (value) => {
        const published = await readRemoteSnapshot();
        if (live) {
          setDraft(value);
          setBaseline(published?.content || []);
          setBaselineAbout(published?.about ?? null);
          onAuth(true);
        }
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "요청에 실패했습니다. 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  const changes = contentChanges(baseline, draft?.content || []);
  const saved =
    !!draft &&
    JSON.stringify(draft.content) === JSON.stringify(projects) &&
    draft.about === about;
  const backup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(baseline, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "minlab-before-publish.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section
      className="remote-studio"
      aria-label="서버 콘텐츠 관리"
      aria-busy={busy}
    >
      <h2>서버 콘텐츠 관리</h2>
      {!draft ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              const value = await signIn(email, password);
              setPassword("");
              setDraft(value);
              const published = await readRemoteSnapshot();
              setBaseline(published?.content || []);
              setBaselineAbout(published?.about ?? null);
              onAuth(true);
              setMessage(
                "관리자 로그인 완료. 서버 초안은 불러오기를 선택해야 편집기에 반영됩니다.",
              );
            });
          }}
        >
          <p>등록된 관리자 계정으로 로그인하세요.</p>
          <label>
            이메일
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="primary-link" disabled={busy}>
            관리자 로그인
          </button>
        </form>
      ) : (
        <>
          <p>
            초안 저장은 공개 사이트에 영향을 주지 않습니다. 저장한 내용을
            검토하고 공개를 승인해야 방문자에게 반영됩니다.
          </p>
          <div className="project-actions">
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const value = await readRemoteDraft();
                  if (
                    !confirm(
                      "편집 중인 내용을 서버 초안으로 교체할까요? 먼저 로컬 JSON 백업을 권장합니다.",
                    )
                  )
                    return;
                  if (!onLoad(value.content, value.about))
                    throw new Error(
                      "브라우저 저장 공간이 부족합니다. JSON 백업 후 다시 시도해 주세요.",
                    );
                  setDraft(value);
                  setReview(false);
                  setMessage("서버 초안을 불러왔습니다.");
                })
              }
            >
              서버 초안 불러오기
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const revision = await saveRemoteDraft(
                    projects,
                    draft.revision,
                    about,
                  );
                  setDraft({ content: projects, revision, about });
                  setReview(false);
                  setMessage(
                    "서버 초안을 저장했습니다. 공개 내용은 유지됩니다.",
                  );
                })
              }
            >
              서버 초안 저장
            </button>
            <button
              disabled={busy || !saved}
              onClick={() =>
                void run(async () => {
                  const latest = await readRemoteDraft();
                  if (latest.revision !== draft.revision)
                    throw new Error(
                      "서버 초안이 변경됐습니다. 백업 후 다시 불러오세요.",
                    );
                  const published = await readRemoteSnapshot();
                  setBaseline(published?.content || []);
                  setBaselineAbout(published?.about ?? null);
                  setReview(true);
                })
              }
            >
              공개 전 변경 검토
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await signOut();
                  setDraft(null);
                  setReview(false);
                  onAuth(false);
                  setMessage("로그아웃했습니다.");
                })
              }
            >
              로그아웃
            </button>
          </div>
          <details className="remote-backups">
            <summary>서버 백업에서 복원</summary>
            <p>
              복원할 내용을 편집기로 불러온 뒤 검토·저장·공개할 수 있습니다.
              불러오기만으로 공개 내용이 바뀌지 않습니다.
            </p>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => setBackups(await readRemoteBackups()))
              }
            >
              최근 백업 조회
            </button>
            {backups.map((item) => (
              <div key={item.id}>
                <span>
                  {new Date(item.recorded_at).toLocaleString("ko-KR")} ·{" "}
                  {item.source === "public" ? "공개" : "초안"} · r
                  {item.revision}
                </span>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      !confirm(
                        "현재 편집 내용을 이 백업으로 교체할까요? 저장하지 않은 내용은 먼저 JSON으로 백업해 주세요.",
                      )
                    )
                      return;
                    if (onLoad(item.content, item.about)) {
                      setReview(false);
                      setMessage(
                        "백업을 편집기에 불러왔습니다. 서버 초안 저장 후 변경 사항을 검토해 주세요.",
                      );
                    } else
                      setError(
                        "브라우저 저장 공간이 부족합니다. JSON 백업 후 다시 시도해 주세요.",
                      );
                  }}
                >
                  이 백업 불러오기
                </button>
              </div>
            ))}
          </details>
          {!saved && (
            <p>현재 편집 내용을 서버 초안으로 저장한 뒤 검토할 수 있습니다.</p>
          )}
          {review && (
            <div className="remote-review">
              <h3>공개 변경 사항</h3>
              <p>
                추가 {changes.added.length} · 수정 {changes.changed.length} ·
                삭제 {changes.removed.length}
                {changes.reordered ? " · 순서 변경" : ""}
              </p>
              {baselineAbout !== draft.about && (
                <div>
                  <h4>소개 문구 변경</h4>
                  <p>이전: {baselineAbout || "기본 소개"}</p>
                  <p>변경: {draft.about || "기본 소개"}</p>
                </div>
              )}
              <ul>
                {[...changes.added, ...changes.changed, ...changes.removed].map(
                  (p) => (
                    <li key={p.id}>{p.name}</li>
                  ),
                )}
              </ul>
              <p>
                공개하지 않은 프로젝트와 보관한 프로젝트는 서버가 제외합니다.
                공개 전 상태는 서버 백업에도 보관됩니다.
              </p>
              <button onClick={backup}>현재 공개 데이터 JSON 백업</button>
              <button
                className="primary-link"
                disabled={busy || !saved}
                onClick={() =>
                  void run(async () => {
                    if (
                      !confirm("검토한 서버 초안을 모든 방문자에게 공개할까요?")
                    )
                      return;
                    const revision = await publishRemoteDraft(draft.revision);
                    const value = await readRemoteSnapshot();
                    if (!value)
                      throw new Error("공개 데이터를 다시 확인해 주세요.");
                    onPublish(value.content, value.about);
                    setBaseline(value.content);
                    setBaselineAbout(value.about);
                    setDraft({ ...draft, revision });
                    setReview(false);
                    setMessage("서버 공개 반영을 완료했습니다.");
                  })
                }
              >
                승인하고 서버에 공개
              </button>
            </div>
          )}
        </>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
