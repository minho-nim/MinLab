import React, { useState, useEffect } from 'react';
import { WorkLog, Project } from '../types';
import { X, FolderGit2 } from 'lucide-react';

interface WorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: WorkLog, targetProjectId: string) => boolean;
  initialLog?: WorkLog | null;
  projects?: Project[];
  defaultProjectId?: string | null;
}

export const WorkLogModal: React.FC<WorkLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLog,
  projects = [],
  defaultProjectId = null,
}) => {
  const [projectId, setProjectId] = useState<string>('');
  const [date, setDate] = useState('');
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [reason, setReason] = useState('');
  const [testResult, setTestResult] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialLog) {
      setProjectId(initialLog.projectId || defaultProjectId || (projects[0]?.id ?? ''));
      setDate(initialLog.date || '');
      setVersion(initialLog.version || '');
      setTitle(initialLog.title || initialLog.task || '');
      setContent(initialLog.content || initialLog.task || '');
      setReason(
        initialLog.reason ||
        (initialLog.issues
          ? initialLog.solution
            ? `${initialLog.issues}\n[해결 방법]: ${initialLog.solution}`
            : initialLog.issues
          : '')
      );
      setTestResult(initialLog.testResult || '');
      setNextSteps(initialLog.nextSteps || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setProjectId(defaultProjectId || (projects[0]?.id ?? ''));
      setDate(today);
      setVersion('');
      setTitle('');
      setContent('');
      setReason('');
      setTestResult('');
      setNextSteps('');
    }
    setError('');
  }, [initialLog, defaultProjectId, projects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) {
      setError('기록할 프로젝트를 선택해 주세요.');
      return;
    }
    if (!title.trim()) {
      setError('수정 제목 / 작업명을 입력해 주세요.');
      return;
    }
    if (!content.trim()) {
      setError('변경 사항 / 수정 내용을 입력해 주세요.');
      return;
    }

    const selectedProj = projects.find((p) => p.id === projectId);

    const newLog: WorkLog = {
      id: initialLog ? initialLog.id : `wl-${Date.now()}`,
      projectId,
      projectName: selectedProj ? selectedProj.name : initialLog?.projectName || '',
      date: date || new Date().toISOString().split('T')[0],
      version: version.trim(),
      title: title.trim(),
      content: content.trim(),
      reason: reason.trim(),
      testResult: testResult.trim(),
      nextSteps: nextSteps.trim(),
      // 기존 호환 필드
      task: content.trim() || title.trim(),
      issues: initialLog?.issues || '',
      solution: initialLog?.solution || '',
      createdAt: initialLog ? initialLog.createdAt : new Date().toISOString(),
    };

    if (!onSave(newLog, projectId)) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-surface border border-line-strong rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">
            {initialLog ? '개발 기록 수정' : '새 개발 기록 등록'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-850 rounded-md">
              {error}
            </div>
          )}

          {/* Project Selector (if projects are available) */}
          {projects.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">
                대상 프로젝트 <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink focus:outline-none focus:border-accent font-medium"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-surface">
                      {p.name} {p.status ? `(${p.status})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Date and Version */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">
                수정 날짜 <span className="text-accent">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink focus:outline-none focus:border-accent font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">
                버전 (선택)
              </label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="예: v0.1.0, v1.2.0"
                className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink font-mono focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Title / Task */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              수정 제목 / 작업명 <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 위험 요인 템플릿 자동 분류 로직 구현"
              required
              className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink focus:outline-none focus:border-accent"
            />
          </div>

          {/* Content / 변경 사항 */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              변경 사항 / 수정 내용 <span className="text-accent">*</span>
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="구현하거나 수정한 구체적인 작업 내용을 작성하세요."
              required
              className="w-full px-3 py-2 bg-surface-alt border border-line-strong rounded-md text-ink placeholder-muted focus:outline-none focus:border-accent leading-relaxed"
            />
          </div>

          {/* Reason / 수정 이유 */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              수정 이유
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="수정 또는 개발을 진행한 이유, 문제점 또는 배경을 작성하세요."
              className="w-full px-3 py-2 bg-surface-alt border border-line-strong rounded-md text-ink placeholder-muted focus:outline-none focus:border-accent leading-relaxed"
            />
          </div>

          {/* Test Results / 테스트 결과 */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              테스트 결과
            </label>
            <textarea
              rows={2}
              value={testResult}
              onChange={(e) => setTestResult(e.target.value)}
              placeholder="테스트 수행 결과 또는 동작 검증 사항을 작성하세요."
              className="w-full px-3 py-2 bg-surface-alt border border-line-strong rounded-md text-ink placeholder-muted focus:outline-none focus:border-accent leading-relaxed"
            />
          </div>

          {/* Next Steps / 다음 작업 */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              다음 작업 (Next Steps)
            </label>
            <textarea
              rows={2}
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="이후 진행할 작업, 추가 개선 과제나 남은 태스크를 작성하세요."
              className="w-full px-3 py-2 bg-surface-alt border border-line-strong rounded-md text-ink placeholder-muted focus:outline-none focus:border-accent leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-ink-secondary bg-surface-alt hover:bg-line-strong transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-accent hover:bg-accent-hover transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
