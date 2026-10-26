import React, { useRef, useState } from 'react';
import { ExcelContractRow, ProcessedItem } from '../types';
import {
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Play,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Percent,
  Layers,
  Upload,
} from 'lucide-react';

interface AnalysisCenterViewProps {
  excelContracts: ExcelContractRow[];
  excelFileName: string;
  selectedDocxFiles: File[];
  processedResults: ProcessedItem[];
  logs: string[];
  isProcessing: boolean;
  onExcelSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDocxFilesSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDocxFolderSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRunProcess: () => void;
  onExcelDropFile: (file: File) => void;
  onDocxDropFiles: (files: File[]) => void;
}

export const AnalysisCenterView: React.FC<AnalysisCenterViewProps> = ({
  excelContracts,
  excelFileName,
  selectedDocxFiles,
  processedResults,
  logs,
  isProcessing,
  onExcelSelect,
  onDocxFilesSelect,
  onDocxFolderSelect,
  onRunProcess,
  onExcelDropFile,
  onDocxDropFiles,
}) => {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const docxFilesInputRef = useRef<HTMLInputElement>(null);
  const docxFolderInputRef = useRef<HTMLInputElement>(null);
  const [dragTarget, setDragTarget] = useState<'excel' | 'docx' | null>(null);
  const [contractSearch, setContractSearch] = useState('');
  const [dropError, setDropError] = useState('');
  const visibleContracts = excelContracts.filter(row => `${row.계약번호} ${row.계약명}`.toLowerCase().includes(contractSearch.trim().toLowerCase()));
  const dragProps = (target: 'excel' | 'docx') => ({
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if (!isProcessing) { e.dataTransfer.dropEffect = 'copy'; setDragTarget(target); } },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragTarget(null); },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault(); e.stopPropagation(); setDragTarget(null); setDropError('');
      if (isProcessing) return;
      const files = Array.from(e.dataTransfer.files);
      if (target === 'excel') {
        if (files.length !== 1 || !/\.xlsx?$/i.test(files[0]?.name || '')) { setDropError('계약목록 Excel 파일을 한 개씩 올려 주세요.'); return; }
        onExcelDropFile(files[0]);
      } else if (files.length) onDocxDropFiles(files);
      else setDropError('폴더는 폴더 지정 버튼으로 선택해 주세요.');
    },
  });

  const totalCount = processedResults.length;
  const successCount = processedResults.filter((r) => r.매칭상태 === '✅ 성공').length;
  const failCount = totalCount - successCount;
  const successRate = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {dropError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{dropError}</p>}
      {/* 4 KPI Cards matching Python GUI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            전체 분석 문서
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-900">{totalCount} 건</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {selectedDocxFiles.length > 0 ? `선택 대기: ${selectedDocxFiles.length}건` : '완료됨'}
            </span>
          </div>
        </div>

        {/* Success Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            매칭 성공
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600">{successCount} 건</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
        </div>

        {/* Fail Count */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            매칭 실패
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-red-600">{failCount} 건</span>
            <AlertCircle className="h-5 w-5 text-red-500" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider">
            매칭 성공률
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-blue-600">{successRate} %</span>
            <Percent className="h-5 w-5 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={excelInputRef}
        onChange={onExcelSelect}
        accept=".xlsx, .xls"
        className="hidden"
      />
      <input
        type="file"
        ref={docxFilesInputRef}
        onChange={onDocxFilesSelect}
        accept=".docx"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={docxFolderInputRef}
        onChange={onDocxFolderSelect}
        // @ts-ignore
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
      />

      {/* Card 1: 계약목록 Excel 선택 */}
      <div {...dragProps('excel')} className={`rounded-2xl border-2 border-dashed shadow-xs p-5 ${dragTarget === 'excel' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
        <label className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-2">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          <span>📁 계약목록 Excel 선택</span>
        </label>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-medium flex items-center justify-between">
            <span className="truncate">{excelFileName || '계약목록 Excel을 선택해 주세요'}</span>
            <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              계약 {excelContracts.length}건 탑재
            </span>
          </div>

          <button
            disabled={isProcessing}
            onClick={() => excelInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-1.5"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>파일 찾기</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">계약목록 Excel 파일을 여기에 드래그해서 올릴 수 있습니다.</p>
        {excelContracts.length > 0 && <div className="mt-4 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-bold text-slate-800">업로드한 계약목록 ({visibleContracts.length}/{excelContracts.length}건)</h3>
            <input aria-label="계약목록 검색" value={contractSearch} onChange={e => setContractSearch(e.target.value)} placeholder="계약번호·계약명 검색" className="rounded-lg border border-slate-300 p-2 text-xs" />
          </div>
          <div className="max-h-64 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">계약번호</th><th className="p-2">계약명</th></tr></thead>
              <tbody>{visibleContracts.map((row, index) => <tr key={`${row.계약번호}-${index}`} className="border-t border-slate-100"><td className="p-2 font-mono">{row.계약번호}</td><td className="p-2">{row.계약명}</td></tr>)}
                {!visibleContracts.length && <tr><td colSpan={2} className="p-4 text-slate-500">검색 결과가 없습니다.</td></tr>}
              </tbody></table>
          </div>
        </div>}
      </div>

      {/* Card 2: 작업절차서 Word(.docx) 선택 */}
      <div {...dragProps('docx')} className={`rounded-2xl border-2 border-dashed shadow-xs p-5 ${dragTarget === 'docx' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span>📝 작업절차서 Word(.docx) 선택</span>
          </label>

          <span className="text-xs font-bold text-blue-600">
            {selectedDocxFiles.length > 0
              ? `선택된 문서: ${selectedDocxFiles.length}개`
              : '선택된 문서 없음'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            disabled={isProcessing}
            onClick={() => docxFilesInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5 text-blue-600" />
            <span>파일 추가 (다중 .docx)</span>
          </button>

          <button
            disabled={isProcessing}
            onClick={() => docxFolderInputRef.current?.click()}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
            <span>폴더 지정 (전체 Word 일괄)</span>
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">작업절차서 DOCX 파일 여러 개를 여기에 드래그해서 올릴 수 있습니다.</p>
        {!!selectedDocxFiles.length && <ul className="mt-3 max-h-40 overflow-auto text-xs text-slate-700 space-y-1">{selectedDocxFiles.map((file, index) => <li key={`${file.name}-${index}`} className="rounded-lg bg-slate-50 p-2">{file.name}</li>)}</ul>}
      </div>

      {/* Action Button: 스마트 문서 매칭 실행하기 */}
      <div>
        <button
          onClick={onRunProcess}
          disabled={isProcessing || selectedDocxFiles.length === 0}
          className="w-full py-3.5 rounded-2xl text-sm font-extrabold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-75"
        >
          <Play className="h-4 w-4 fill-current" />
          <span>{isProcessing ? '스마트 문서 매칭 분석 중...' : '스마트 문서 매칭 실행하기'}</span>
        </button>
      </div>

      {/* Terminal Log Console matching txt_log in Python */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <span className="text-slate-300 font-semibold">분석 실행 콘솔 로그 (Terminal Output)</span>
          </div>
          <span>Consolas UTF-8</span>
        </div>

        <div className="p-4 max-h-64 overflow-y-auto font-mono text-xs text-slate-200 space-y-1 select-all leading-relaxed">
          {logs.length === 0 ? (
            <p className="text-slate-500">
              상단의 [스마트 문서 매칭 실행하기] 버튼을 누르면 Word 문서 파싱 및 엑셀 계약 매칭 결과가 실시간으로 출력됩니다.
            </p>
          ) : (
            logs.map((line, idx) => (
              <p
                key={idx}
                className={
                  line.includes('✅ 성공')
                    ? 'text-emerald-400'
                    : line.includes('❌ 실패')
                    ? 'text-red-400'
                    : line.includes('🎉')
                    ? 'text-amber-300 font-bold'
                    : 'text-slate-300'
                }
              >
                {line}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
