import { useState } from 'react';
import type { Project, PromptHistoryItem } from '../types';
import { Edit2, Trash2 } from 'lucide-react';

export function PromptHistoryView({ projects, projectId, onUpdateProject }: {
  projects: Project[]; projectId?: string | null; onUpdateProject: (project: Project) => boolean;
}) {
  const [editing, setEditing] = useState<{ projectId: string; prompt: PromptHistoryItem } | null>(null);
  const [error, setError] = useState('');
  const records = projects.filter(project => !projectId || project.id === projectId)
    .flatMap(project => (project.promptHistory || []).map(prompt => ({ project, prompt })))
    .sort((a, b) => b.prompt.date.localeCompare(a.prompt.date));
  const add = () => {
    const target = projectId || projects[0]?.id;
    if (!target) { setError('프로젝트를 먼저 등록하세요.'); return; }
    setError('');
    setEditing({ projectId: target, prompt: { id: 'prompt-' + crypto.randomUUID(), date: new Date().toLocaleDateString('en-CA'), title: '', prompt: '', outcome: '' } });
  };
  const save = () => {
    if (!editing) return;
    const target = projects.find(project => project.id === editing.projectId);
    if (!target || !editing.prompt.title.trim() || !editing.prompt.prompt.trim()) { setError('프로젝트, 작업 제목과 프롬프트를 입력하세요.'); return; }
    const current = target.promptHistory || [];
    const updated = current.some(item => item.id === editing.prompt.id) ? current.map(item => item.id === editing.prompt.id ? editing.prompt : item) : [editing.prompt, ...current];
    if (onUpdateProject({ ...target, promptHistory: updated, updatedAt: new Date().toISOString() })) { setEditing(null); setError(''); }
    else setError('저장하지 못했습니다. 입력한 내용을 복사해 보관하고 다시 시도하세요.');
  };
  const patch = (key: keyof PromptHistoryItem, value: string) => setEditing(current => current ? { ...current, prompt: { ...current.prompt, [key]: value } } : null);
  return <section className="space-y-5">
    <div className="flex items-center justify-between"><div><h1 className="text-xl font-bold tracking-tight text-ink">프롬프트 기록</h1><p className="mt-1 text-xs text-muted">아이디어와 개선 방향을 담은 프로젝트 기록</p></div><button type="button" onClick={add} className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white">새 프롬프트</button></div>
    {editing && <form onSubmit={event => { event.preventDefault(); save(); }} className="space-y-3 rounded-xl border border-accent-line bg-surface p-5">
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-xs text-muted"><span>대상 프로젝트</span><select value={editing.projectId} onChange={event => setEditing({ ...editing, projectId: event.target.value })} disabled={projects.some(project => project.promptHistory?.some(prompt => prompt.id === editing.prompt.id))} className="block w-full rounded-md border border-line bg-canvas p-2 text-ink">{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label className="space-y-1.5 text-xs text-muted"><span>날짜</span><input type="date" required value={editing.prompt.date} onChange={event => patch('date', event.target.value)} className="block w-full rounded-md border border-line bg-canvas p-2 text-ink" /></label></div>
      <label className="block space-y-1.5 text-xs text-muted"><span>작업 제목</span><input required value={editing.prompt.title} onChange={event => patch('title', event.target.value)} className="block w-full rounded-md border border-line bg-canvas p-2 text-ink" /></label>
      <label className="block space-y-1.5 text-xs text-muted"><span>작업 프롬프트</span><textarea rows={12} required value={editing.prompt.prompt} onChange={event => patch('prompt', event.target.value)} className="block w-full rounded-md border border-line bg-canvas p-3 text-ink" /></label>
      <label className="block space-y-1.5 text-xs text-muted"><span>결과와 메모</span><textarea rows={3} value={editing.prompt.outcome || ''} onChange={event => patch('outcome', event.target.value)} className="block w-full rounded-md border border-line bg-canvas p-3 text-ink" /></label>
      <div className="flex justify-end gap-2 text-xs"><button type="button" onClick={() => { setEditing(null); setError(''); }} className="rounded-md border border-line px-3 py-2 text-muted">취소</button><button type="submit" className="rounded-md bg-accent px-3 py-2 text-white">저장</button></div>
    </form>}
    {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    {!records.length && <p className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-muted">아직 프롬프트 기록이 없습니다.</p>}
    {records.map(({ project, prompt }) => <article key={project.id + prompt.id} className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] text-muted">{project.name} · {prompt.date}</p><h2 className="mt-1 text-sm font-semibold text-ink">{prompt.title}</h2></div><div className="flex gap-2"><button type="button" aria-label={prompt.title + ' 수정'} onClick={() => { setError(''); setEditing({ projectId: project.id, prompt: { ...prompt } }); }} className="rounded p-1 text-muted hover:text-accent"><Edit2 className="h-3.5 w-3.5" /></button><button type="button" aria-label={prompt.title + ' 삭제'} onClick={() => { if (window.confirm('이 프롬프트 기록을 삭제할까요?')) onUpdateProject({ ...project, promptHistory: (project.promptHistory || []).filter(item => item.id !== prompt.id), updatedAt: new Date().toISOString() }); }} className="rounded p-1 text-muted hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
      <div className="mt-4 space-y-4 border-t border-line pt-4 text-xs">{prompt.prompt.split(/\n\s*\n/).map((block, index) => {
        const [heading, ...lines] = block.split('\n');
        const structured = ['목표', '해야 할 일', '지켜야 할 조건', '완료 기준'].includes(heading);
        return <div key={index}>{structured && <h3 className="mb-1.5 text-[11px] font-semibold text-ink">{heading}</h3>}<p className="whitespace-pre-wrap break-words font-sans leading-7 text-ink-secondary">{structured ? lines.join('\n') : block}</p></div>;
      })}</div>
      {prompt.outcome && <p className="mt-4 whitespace-pre-wrap border-t border-line pt-3 text-xs leading-6 text-muted">{prompt.outcome}</p>}
    </article>)}
  </section>;
}
