import React, { useState, useRef } from 'react';
import { Project } from '../types';
import { exportToJson, parseImportJson } from '../utils/storage';
import { INITIAL_PROJECTS } from '../data/initialData';
import { X, Download, Upload, RefreshCw } from 'lucide-react';

interface JsonBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onRestore: (projects: Project[]) => boolean;
  showToast: (text: string, type: 'success' | 'error' | 'info') => void;
}

export const JsonBackupModal: React.FC<JsonBackupModalProps> = ({
  isOpen,
  onClose,
  projects,
  onRestore,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'reset'>('export');
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDownloadBackup = () => {
    exportToJson(projects);
    showToast('백업 파일(.json)이 다운로드되었습니다.', 'success');
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(projects, null, 2));
      showToast('JSON 데이터가 클립보드에 복사되었습니다.', 'success');
    } catch {
      showToast('클립보드에 복사하지 못했습니다. 브라우저 권한을 확인해 주세요.', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      const res = parseImportJson(content);
      if (res.success && res.projects) {
        setImportStatus({
          message: `${res.projects.length}개 프로젝트 데이터 확인. 아래 '복원 적용'을 누르면 반영됩니다.`,
          isError: false,
        });
      } else {
        setImportStatus({
          message: res.error || 'JSON 파일 구문 분석 실패',
          isError: true,
        });
      }
      e.target.value = '';
    };
    reader.onerror = () => {
      setImportStatus({ message: '파일을 읽지 못했습니다. 파일을 다시 선택해 주세요.', isError: true });
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (!importText.trim()) {
      setImportStatus({ message: '복원할 JSON 내용을 입력하거나 파일을 선택하세요.', isError: true });
      return;
    }

    const res = parseImportJson(importText);
    if (res.success && res.projects) {
      const confirmed = window.confirm(
        `가져온 ${res.projects.length}개 프로젝트로 현재 ${projects.length}개 프로젝트를 모두 교체합니다.\n복원 전에 현재 데이터의 JSON 백업을 권장합니다. 계속할까요?`
      );
      if (!confirmed) return;
      if (!onRestore(res.projects)) {
        setImportStatus({ message: '저장하지 못했습니다. 현재 데이터는 유지됩니다.', isError: true });
        return;
      }
      showToast(`${res.projects.length}개 프로젝트 데이터가 복원되었습니다.`, 'success');
      onClose();
    } else {
      setImportStatus({ message: res.error || '복원 실패', isError: true });
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('초기 프로젝트 데이터로 되돌리시겠습니까? 현재 작성된 데이터는 덮어씌워집니다.')) {
      if (!onRestore(INITIAL_PROJECTS)) {
        showToast('저장하지 못했습니다. 현재 데이터는 유지됩니다.', 'error');
        return;
      }
      showToast('초기 데이터로 복원되었습니다.', 'success');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-surface border border-line-strong rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">
            데이터 백업 및 복원
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-line bg-surface-alt text-xs">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              activeTab === 'export'
                ? 'text-ink border-b-2 border-accent bg-surface'
                : 'text-muted hover:text-ink-secondary'
            }`}
          >
            백업 (Export)
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-ink border-b-2 border-accent bg-surface'
                : 'text-muted hover:text-ink-secondary'
            }`}
          >
            복원 (Import)
          </button>
          <button
            onClick={() => setActiveTab('reset')}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              activeTab === 'reset'
                ? 'text-ink border-b-2 border-accent bg-surface'
                : 'text-muted hover:text-ink-secondary'
            }`}
          >
            초기화 (Reset)
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5 text-xs space-y-4">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <p className="text-muted leading-relaxed">
                현재 등록된 <span className="text-ink font-medium">{projects.length}개 프로젝트</span>와{' '}
                <span className="text-ink font-medium">
                  {projects.reduce((acc, p) => acc + (p.workLogs?.length || 0), 0)}건의 개발 기록
                </span>
                이 포함된 JSON 백업 파일을 저장합니다.
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleDownloadBackup}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-md transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> JSON 파일 다운로드
                </button>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-alt hover:bg-line-strong text-ink-secondary font-medium rounded-md transition-colors border border-line-strong"
                >
                  클립보드 복사
                </button>
              </div>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-3.5">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-dashed border-line-strong hover:border-line-strong text-muted hover:text-ink transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" /> .json 파일 선택
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-muted mb-1">
                  또는 JSON 텍스트 직접 입력
                </label>
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    setImportStatus(null);
                  }}
                  placeholder='[ { "id": "...", "name": "...", "workLogs": [...] } ]'
                  className="w-full px-2.5 py-1.5 bg-surface-alt border border-line-strong rounded-md text-[11px] font-mono text-ink placeholder-muted focus:outline-none focus:border-accent"
                />
              </div>

              {importStatus && (
                <div
                  className={`p-2.5 rounded-md text-[11px] ${
                    importStatus.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-850'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-850'
                  }`}
                >
                  {importStatus.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleApplyImport}
                className="w-full py-2 bg-accent hover:bg-accent-hover text-white font-medium rounded-md transition-colors"
              >
                복원 적용
              </button>
            </div>
          )}

          {activeTab === 'reset' && (
            <div className="space-y-4">
              <p className="text-muted leading-relaxed">
                현재 브라우저에 저장된 프로젝트 데이터를 초기 상태로 되돌립니다.
                작성 중인 기록이 있다면 사전에 백업을 권장합니다.
              </p>

              <button
                type="button"
                onClick={handleResetToDefault}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-rose-600/90 hover:bg-rose-500 text-white font-medium rounded-md transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> 초기 데이터로 재설정
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
