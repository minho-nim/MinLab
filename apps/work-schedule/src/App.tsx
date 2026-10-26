import React, { useState } from 'react';
import { ExcelContractRow, ProcessedItem, KissExcelOptions, EmployeeInfo } from './types';
import {
  parseExcelFile,
  parseDocxFile,
  processSinglePlan,
  exportToKissExcel,
  DEFAULT_EMPLOYEES,
} from './utils/parser';
import { Header } from './components/Header';
import { AnalysisCenterView } from './components/AnalysisCenterView';
import { MatchingListView } from './components/MatchingListView';
import { ScheduleHubView } from './components/ScheduleHubView';
import { DetailModal } from './components/DetailModal';
import { KissExportModal } from './components/KissExportModal';
import { CheckCircle2, Download, FolderOpen } from 'lucide-react';


export default function App() {
  const [currentTab, setCurrentTab] = useState<'analysis' | 'matching' | 'schedule'>('analysis');

  const [excelContracts, setExcelContracts] = useState<ExcelContractRow[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [selectedDocxFiles, setSelectedDocxFiles] = useState<File[]>([]);
  const [processedResults, setProcessedResults] =
    useState<ProcessedItem[]>([]);

  // Dynamic employees state persisted in localStorage
  const [employees, setEmployees] = useState<EmployeeInfo[]>(() => {
    try {
      const saved = localStorage.getItem('kiss_calendar_employees');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter((employee: EmployeeInfo) => !((employee.사원ID === 'demo1' && employee.사원명 === '예시 등록자') || (employee.사원ID === 'demo2' && employee.사원명 === '예시 참여자(예시 부서)')));
      }
    } catch {}
    return DEFAULT_EMPLOYEES;
  });

  const handleSaveEmployees = (newEmployees: EmployeeInfo[]) => {
    setEmployees(newEmployees);
    try {
      localStorage.setItem('kiss_calendar_employees', JSON.stringify(newEmployees));
    } catch {}
    showToast(`사원 목록이 갱신되었습니다. (총 ${newEmployees.length}명)`);
  };

  const [logs, setLogs] = useState<string[]>([
    '⚡ 시스템 준비 완료: 공사 일정 통합 관리 센터 (업무관리 Kiss 일정 연동)',
    '📁 계약목록 Excel과 작업계획서 DOCX를 선택해 주세요.',
    '🎯 타겟 양식: [업무관리(Kiss) 작업일정(TEST) 일정 일괄등록 양식]',
    '👷 실제 작업자 일정은 DOCX의 R&R·회사명·이름·연락처를 기준으로 표시합니다.',
    '💡 등록자·참여자와 사원 목록은 회사 업로드 양식의 계정 정보로만 사용합니다.',
  ]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<ProcessedItem | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [...prev, msg]);
  };

  // Handle Excel upload
  const handleExcelSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      addLog(`📁 엑셀 파일 읽는 중: ${file.name}...`);
      const contracts = await parseExcelFile(file);
      if (contracts.length === 0) {
        alert('엑셀 파일에서 4행 이후의 유효한 계약 정보를 찾지 못했습니다.');
        return;
      }
      setExcelContracts(contracts);
      setExcelFileName(file.name);
      addLog(`✅ 엑셀 파일 분석 완료: 총 ${contracts.length}개 계약 로드됨`);
      showToast(`계약목록 엑셀(${contracts.length}건)이 로드되었습니다.`);
    } catch (err: any) {
      console.error(err);
      alert('엑셀 파일 파싱 중 오류가 발생했습니다: ' + err.message);
    }
    e.target.value = '';
  };

  // Handle docx files selection
  const handleDocxFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const docxOnly = files.filter((f) => f.name.endsWith('.docx') && !f.name.startsWith('~$'));
    setSelectedDocxFiles((prev) => [...prev, ...docxOnly]);
    addLog(
      `📝 작업계획서 Word 파일 ${docxOnly.length}개 추가됨 (총 ${
        selectedDocxFiles.length + docxOnly.length
      }개 대기)`
    );
    showToast(`${docxOnly.length}개 작업계획서 파일이 선택되었습니다.`);
    e.target.value = '';
  };

  // Handle docx folder selection
  const handleDocxFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const docxOnly = files.filter((f) => f.name.endsWith('.docx') && !f.name.startsWith('~$'));
    setSelectedDocxFiles(docxOnly);
    addLog(`📂 폴더 내 작업계획서 Word 문서 ${docxOnly.length}개 일괄 지정 완료`);
    showToast(`폴더 내 ${docxOnly.length}개 작업계획서가 지정되었습니다.`);
    e.target.value = '';
  };

  // Run matching process
  const handleRunProcess = async () => {
    if (!selectedDocxFiles.length) { showToast('분석할 작업계획서 DOCX를 선택해 주세요.'); return; }
    setIsProcessing(true);
    addLog('\n--------------------------------------------------');
    addLog('🚀 스마트 문서 매칭 프로세스를 시작합니다...');

    try {
      let results: ProcessedItem[] = [];

      if (selectedDocxFiles.length > 0) {
        addLog(`📂 총 ${selectedDocxFiles.length}개 작업계획서 파일 실제 파싱 중...\n`);

        for (let i = 0; i < selectedDocxFiles.length; i++) {
          const file = selectedDocxFiles[i];
          const wordData = await parseDocxFile(file);
          const item = processSinglePlan(wordData, file.name, excelContracts);
          item.sourceFile = file;
          results.push(item);

          addLog(
            `[${i + 1}/${selectedDocxFiles.length}] ${file.name} -> ${item.매칭상태} (작업번호: ${
              item.작업번호
            })`
          );
        }
      }

      setProcessedResults(results);

      const total = results.length;
      const success = results.filter((r) => r.매칭상태 === '✅ 성공').length;
      const fail = total - success;
      const rate = total > 0 ? ((success / total) * 100).toFixed(1) : '0';

      addLog('\n--------------------------------------------------');
      addLog('🎉 성공적으로 분석이 마무리되었습니다!');
      addLog(`📊 분석 결과: 전체 ${total}건 | 성공 ${success}건 | 실패 ${fail}건 | 성공률 ${rate}%`);
      addLog('📄 통합 공사 일정표와 매칭 리스트가 갱신되었습니다.');
      addLog('--------------------------------------------------');

      showToast(`분석 완료: ${total}건 중 ${success}건 매칭 성공 (${rate}%)`);
    } catch (err: any) {
      console.error(err);
      addLog(`❌ 오류 발생: ${err.message}`);
      alert('문서 매칭 처리 중 오류가 발생했습니다: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update a single processed item from DetailModal
  const handleUpdateItem = (updatedItem: ProcessedItem) => {
    setProcessedResults((prev) =>
      prev.map((it) => (it.id === updatedItem.id ? updatedItem : it))
    );
    setSelectedItemForDetail(updatedItem);
    showToast(`[${updatedItem.작업번호}] 작업 일정이 수정되었습니다.`);
  };

  // Confirm and download Kiss batch registration Excel
  const handleConfirmExport = (options: KissExcelOptions, targetEmployees: EmployeeInfo[]) => {
    if (processedResults.length === 0) {
      alert('내보낼 공사 일정 데이터가 없습니다.');
      return;
    }

    exportToKissExcel(processedResults, options, targetEmployees);

    const outName = options.fileName || '업무관리(Kiss)_작업일정(TEST)_일정일괄등록양식.xlsx';
    addLog(`📥 업무관리(Kiss) 엑셀 일괄등록 양식 내보내기 완료: ${outName}`);
    addLog(`   • 캘린더(ID).캘린더명: ${options.calTitle}`);
    addLog(`   • 등록자(ID): ${options.createId} | 참여자(ID): ${options.schUserIdList} | 종일여부: ${options.alldayYn}`);
    addLog(`   • 사원 목록: ${targetEmployees.length}명 ([캘린더 참여자] 시트 동적 반영)`);
    showToast(`"${outName}" 파일이 다운로드되었습니다.`);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 text-white shadow-2xl text-xs font-semibold animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'analysis' && (
          <AnalysisCenterView
            excelContracts={excelContracts}
            excelFileName={excelFileName}
            selectedDocxFiles={selectedDocxFiles}
            processedResults={processedResults}
            logs={logs}
            isProcessing={isProcessing}
            onExcelSelect={handleExcelSelect}
            onDocxFilesSelect={handleDocxFilesSelect}
            onDocxFolderSelect={handleDocxFolderSelect}
            onRunProcess={handleRunProcess}
          />
        )}

        {currentTab === 'matching' && (
          <MatchingListView
            items={processedResults}
            onSelectItem={(item) => setSelectedItemForDetail(item)}
          />
        )}

        {currentTab === 'schedule' && (
          <ScheduleHubView
            items={processedResults}
            onSelectItem={(item) => setSelectedItemForDetail(item)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">공사 일정 통합 관리 센터</span>
            <span>·</span>
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <FolderOpen className="h-3.5 w-3.5 text-amber-600" />
              업무관리(Kiss) 작업일정(TEST) 일정 일괄등록 연동
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold flex items-center gap-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>일괄등록 엑셀 다운로드</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Detail Modal with 64-char guard, 15-min format, and edit capabilities */}
      <DetailModal
        item={selectedItemForDetail}
        onClose={() => setSelectedItemForDetail(null)}
        onUpdateItem={handleUpdateItem}
      />

      {/* Kiss Export Modal (Prompts for calTitle, createId, schUserIdList, alldayYn, with dynamic employees) */}
      <KissExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={processedResults}
        employees={employees}
        onSaveEmployees={handleSaveEmployees}
        onConfirmExport={handleConfirmExport}
      />
    </div>
  );
}
