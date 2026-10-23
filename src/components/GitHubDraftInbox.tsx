import { useEffect, useState } from 'react';
import type { Project, PromptHistoryItem, WorkLog } from '../types';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { isDraftSaved, parseDraftFeed, projectForDraft, type DraftFeed } from '../utils/githubDrafts';

interface Props {
  projects: Project[];
  projectId?: string | null;
  kind?: 'log' | 'prompt';
  onReview: (log: WorkLog, projectId: string) => void;
  onSavePrompt: (prompt: PromptHistoryItem, projectId: string) => boolean;
}
export function GitHubDraftInbox({ projects, projectId, kind = 'log', onReview, onSavePrompt }: Props) {
  const [feed, setFeed] = useState<DraftFeed | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const refresh = async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const response = await fetch(import.meta.env.BASE_URL + 'data/github-drafts.json', { cache: 'no-store', signal });
      if (!response.ok) throw new Error('GitHub 수집 결과를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.');
      setFeed(parseDraftFeed(await response.json()));
    } catch (err) {
      if (!signal?.aborted) setError(err instanceof Error ? err.message : '초안을 불러오지 못했습니다.');
    } finally { if (!signal?.aborted) setLoading(false); }
  };
  useEffect(() => { const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, []);
  const pending = (feed?.drafts || []).filter(draft => draft.kind === kind && !isDraftSaved(projects, draft))
    .filter(draft => !projectId || (targets[draft.record.id] || projectForDraft(projects, draft)?.id || draft.projectId) === projectId);
  return (
    <section className="rounded-xl border border-accent-line bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-ink">GitHub 기록 초안 <span className="ml-1 text-accent">{pending.length}</span></h2><p className="mt-1 text-xs leading-6 text-muted">{kind === 'prompt' ? '프로젝트에 기록한 실제 프롬프트 원문을 확인하고 보관하세요.' : '커밋·병합된 PR을 정리한 초안을 확인하고 개발일지에 저장하세요.'}</p></div>
        <div className="flex items-center gap-3 text-xs">
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-1 text-muted hover:text-accent disabled:opacity-50"><RefreshCw className="h-3 w-3" />{loading ? '확인 중' : '초안 새로고침'}</button>
          <a href="https://github.com/minho-nim/MinLab/actions/workflows/sync-records.yml" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent">GitHub 수집 실행<ArrowUpRight className="h-3 w-3" /></a>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-rose-700">{error}</p>}
      {kind === 'log' && feed?.notices.map((notice, index) => <p key={index} className="mt-2 text-xs leading-6 text-muted">{notice}</p>)}
      {!loading && !pending.length && <p className="mt-4 border-t border-line pt-4 text-xs text-muted">검토할 새 초안이 없습니다. GitHub 수집은 6시간마다 실행되며 수동으로도 실행할 수 있습니다.</p>}
      <div className="mt-4 space-y-3">{pending.map(draft => {
        const targetId = targets[draft.record.id] ?? projectForDraft(projects, draft)?.id ?? '';
        const source = draft.record.source!;
        return <article key={draft.record.id} className="rounded-lg border border-line bg-canvas p-4">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted"><span className="rounded bg-accent-soft px-2 py-1 text-accent">{draft.kind === 'prompt' ? '프롬프트 원문' : source.engine === 'gemini' ? 'AI 초안' : 'GitHub 원문 · AI 미연결'}</span><span>{source.repository}</span><time>{draft.record.date}</time></div>
          <h3 className="mt-2 text-sm font-semibold text-ink">{draft.record.title}</h3>
          <details className="mt-2 text-xs text-ink-secondary"><summary className="cursor-pointer text-muted">내용과 출처 확인</summary><pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words font-sans leading-6">{draft.kind === 'log' ? [draft.record.content, draft.record.reason, draft.record.testResult, draft.record.nextSteps].filter(Boolean).join('\n\n') : draft.record.prompt}</pre><div className="mt-3 flex flex-wrap gap-3">{source.urls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-accent underline">원문 {index + 1}</a>)}</div></details>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-muted">대상 프로젝트<select value={targetId} onChange={e => setTargets(prev => ({ ...prev, [draft.record.id]: e.target.value }))} className="max-w-64 rounded-md border border-line bg-surface px-2 py-1.5 text-ink"><option value="">프로젝트 선택</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <button type="button" disabled={!targetId} onClick={() => draft.kind === 'log' ? onReview(draft.record, targetId) : onSavePrompt(draft.record, targetId)} className="rounded-md bg-accent px-3 py-2 text-xs font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40">{draft.kind === 'log' ? '검토·수정 후 저장' : '프롬프트 원문 저장'}</button>
          </div>
        </article>;
      })}</div>
    </section>
  );
}
