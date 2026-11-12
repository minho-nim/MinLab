import type { Project } from "../types";
import { parseImportJson } from "./storage";
const endpoint = (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
export const remoteConfigured = Boolean(endpoint && publicKey);
const sessionKey = "minlab_admin_session";
type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
};
export type RemoteDraft = {
  content: Project[];
  revision: number;
  about: string | null;
};
function readSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey) || "null");
  } catch {
    return null;
  }
}
async function request(
  path: string,
  init: RequestInit = {},
  token = publicKey,
) {
  const response = await fetch(endpoint + path, {
    ...init,
    headers: {
      apikey: publicKey,
      ...(token !== publicKey || token.startsWith("eyJ")
        ? { Authorization: `Bearer ${token}` }
        : {}),
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15000),
  }).catch(() => {
    throw new Error(
      "서버에 연결하지 못했습니다. 입력 내용은 유지됩니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
    );
  });
  const value = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401)
      throw new Error(
        "로그인이 만료됐거나 계정 정보가 맞지 않습니다. 다시 로그인해 주세요.",
      );
    if (value?.message?.includes("revision_conflict"))
      throw new Error(
        "다른 창에서 내용이 바뀌었습니다. 현재 초안을 JSON으로 백업한 뒤 서버 초안을 다시 불러오세요.",
      );
    if (response.status === 403)
      throw new Error("이 계정에는 관리자 권한이 없습니다.");
    throw new Error(
      "서버 요청에 실패했습니다. 연결 상태와 백엔드 설정을 확인한 뒤 다시 시도해 주세요.",
    );
  }
  return value;
}
function projects(value: unknown): Project[] {
  const text = (item: unknown) => typeof item === "string";
  if (
    !Array.isArray(value) ||
    (value.length > 0 && !parseImportJson(JSON.stringify(value)).success) ||
    value.some(
      (p) =>
        !p ||
        ![p.id, p.name, p.category, p.description, p.status].every(text) ||
        !Array.isArray(p.techStack) ||
        !p.techStack.every(text) ||
        !Array.isArray(p.keyFeatures) ||
        !Array.isArray(p.changelog) ||
        !Array.isArray(p.workLogs) ||
        !p.workLogs.every(
          (log: Record<string, unknown>) =>
            log && text(log.id) && text(log.date),
        ) ||
        [p.liveUrl, p.githubUrl, p.previewUrl].some(
          (url) =>
            url &&
            (!text(url) || !/^(https?:\/\/|\/(?!\/)|\.\.?\/)/i.test(url)),
        ) ||
        (p.thumbnailUrl &&
          (!text(p.thumbnailUrl) ||
            !/^(https?:\/\/|\/(?!\/)|\.\.?\/|data:image\/(png|jpeg|webp|gif);base64,)/i.test(
              p.thumbnailUrl,
            ))),
    )
  )
    throw new Error(
      "서버 데이터 형식을 확인할 수 없습니다. 기존 로컬 데이터는 유지됩니다.",
    );
  return value as Project[];
}
function saveSession(value: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}) {
  const session = {
    access_token: value.access_token,
    refresh_token: value.refresh_token,
    expires_at: Date.now() + value.expires_in * 1000,
  };
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}
async function token() {
  let session = readSession();
  if (!session) throw new Error("관리자 로그인이 필요합니다.");
  if (session.expires_at < Date.now() + 30000)
    session = saveSession(
      await request("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      }),
    );
  return session.access_token;
}
export async function signIn(email: string, password: string) {
  saveSession(
    await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  );
  try {
    return await readRemoteDraft();
  } catch (error) {
    await signOut();
    throw error;
  }
}
export async function signOut() {
  const session = readSession();
  sessionStorage.removeItem(sessionKey);
  if (session)
    await request(
      "/auth/v1/logout",
      { method: "POST" },
      session.access_token,
    ).catch(() => {});
}
export async function readRemoteDraft(): Promise<RemoteDraft> {
  const rows = await request(
    "/rest/v1/portfolio_drafts?select=content,revision,about&id=eq.portfolio",
    {},
    await token(),
  );
  if (!rows?.[0])
    throw new Error("관리자 권한 또는 초기 테이블 설정을 확인해 주세요.");
  return {
    content: projects(rows[0].content),
    revision: rows[0].revision,
    about: rows[0].about ?? null,
  };
}
export async function readRemoteSnapshot(): Promise<{
  content: Project[];
  about: string | null;
} | null> {
  const rows = await request(
    "/rest/v1/portfolio_public?select=content,about&id=eq.portfolio",
  );
  return rows?.[0]
    ? { content: projects(rows[0].content), about: rows[0].about ?? null }
    : null;
}
export async function saveRemoteDraft(
  content: Project[],
  revision: number,
  about: string | null = null,
): Promise<number> {
  return request(
    "/rest/v1/rpc/save_portfolio_draft",
    {
      method: "POST",
      body: JSON.stringify({
        payload: content,
        expected_revision: revision,
        about_text: about,
      }),
    },
    await token(),
  );
}
export async function publishRemoteDraft(revision: number): Promise<number> {
  return request(
    "/rest/v1/rpc/publish_portfolio_draft",
    { method: "POST", body: JSON.stringify({ expected_revision: revision }) },
    await token(),
  );
}

export async function readRemoteBackups(): Promise<
  (RemoteDraft & { id: number; recorded_at: string; source: string })[]
> {
  const rows = await request(
    "/rest/v1/portfolio_backups?select=id,content,about,revision,recorded_at,source&order=id.desc&limit=20",
    {},
    await token(),
  );
  return rows.map(
    (row: {
      id: number;
      content: unknown;
      about: string | null;
      revision: number;
      recorded_at: string;
      source: string;
    }) => ({ ...row, content: projects(row.content) }),
  );
}
