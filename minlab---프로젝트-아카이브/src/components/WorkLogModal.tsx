import React, { useState, useEffect } from 'react';
import { WorkLog } from '../types';
import { X } from 'lucide-react';

interface WorkLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (log: WorkLog) => void;
  initialLog?: WorkLog | null;
}

export const WorkLogModal: React.FC<WorkLogModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialLog,
}) => {
  const [date, setDate] = useState('');
  const [task, setTask] = useState('');
  const [issues, setIssues] = useState('');
  const [solution, setSolution] = useState('');
  const [testResult, setTestResult] = useState('');
  const [nextSteps, setNextSteps] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialLog) {
      setDate(initialLog.date);
      setTask(initialLog.task);
      setIssues(initialLog.issues || '');
      setSolution(initialLog.solution || '');
      setTestResult(initialLog.testResult || '');
      setNextSteps(initialLog.nextSteps || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setTask('');
      setIssues('');
      setSolution('');
      setTestResult('');
      setNextSteps('');
    }
    setError('');
  }, [initialLog, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task.trim()) {
      setError('작업 내용을 입력해 주세요.');
      return;
    }

    const newLog: WorkLog = {
      id: initialLog ? initialLog.id : `wl-${Date.now()}`,
      date: date || new Date().toISOString().split('T')[0],
      task: task.trim(),
      issues: issues.trim(),
      solution: solution.trim(),
      testResult: testResult.trim(),
      nextSteps: nextSteps.trim(),
      createdAt: initialLog ? initialLog.createdAt : new Date().toISOString(),
    };

    onSave(newLog);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#21262D]">
          <h3 className="text-sm font-semibold text-[#F0F6FC]">
            {initialLog ? '개발 기록 수정' : '새 개발 기록 작성'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 text-xs text-rose-300 bg-rose-950/40 border border-rose-850 rounded-md">
              {error}
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              날짜
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] focus:outline-none focus:border-purple-500 font-mono"
            />
          </div>

          {/* Task */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              작업 내용 <span className="text-purple-400">*</span>
            </label>
            <textarea
              rows={3}
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="수행한 작업 내용 또는 구현 사항을 작성하세요."
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Issues */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              문제점
            </label>
            <textarea
              rows={2}
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              placeholder="진행 중 발생한 문제나 병목 사항을 작성하세요."
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Solution */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              해결 방법
            </label>
            <textarea
              rows={2}
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="문제를 해결한 접근 방식 또는 방안을 작성하세요."
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Test Results */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              테스트 결과
            </label>
            <textarea
              rows={2}
              value={testResult}
              onChange={(e) => setTestResult(e.target.value)}
              placeholder="검증 결과 또는 테스트 내역을 작성하세요."
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Next Steps */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              다음 작업
            </label>
            <textarea
              rows={2}
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="이어서 진행할 예정 작업을 작성하세요."
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#21262D]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#21262D] hover:bg-[#30363D] transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
