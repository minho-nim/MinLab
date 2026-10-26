import React, { useState, useEffect } from 'react';
import { KissExcelOptions, ProcessedItem, EmployeeInfo } from '../types';
import { formatToKissTime, formatTitleForKiss } from '../utils/parser';
import { EmployeeManagerModal } from './EmployeeManagerModal';
import {
  FileSpreadsheet,
  X,
  CheckCircle2,
  FolderOpen,
  Calendar,
  UserCheck,
  Sparkles,
  Info,
  Users,
  Layers,
  Settings2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  BookmarkCheck,
  Moon,
} from 'lucide-react';

interface KissExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProcessedItem[];
  employees: EmployeeInfo[];
  onSaveEmployees: (employees: EmployeeInfo[]) => void;
  onConfirmExport: (options: KissExcelOptions, employees: EmployeeInfo[]) => void;
}

export const KissExportModal: React.FC<KissExportModalProps> = ({
  isOpen,
  onClose,
  items,
  employees,
  onSaveEmployees,
  onConfirmExport,
}) => {
  // 저장한 회사 캘린더명만 복원합니다.
  const [calTitle, setCalTitle] = useState(() => {
    try { return localStorage.getItem('kiss_calendar_title') || ''; }
    catch { return ''; }
  });
  useEffect(() => {
    if (!calTitle.trim()) return;
    try { localStorage.setItem('kiss_calendar_title', calTitle); } catch {}
  }, [calTitle]);

  const [createId, setCreateId] = useState('');

  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [customParticipantText, setCustomParticipantText] = useState('');

  // 4. 종일여부 (기본값: N)
  const [alldayYn, setAlldayYn] = useState<'Y' | 'N'>('N');

  // 파일명
  const [fileName, setFileName] = useState('업무관리(Kiss)_작업일정(TEST)_일정일괄등록양식.xlsx');

  // 미리보기 탭
  const [previewTab, setPreviewTab] = useState<'schedule' | 'participants' | 'healthCheck'>('schedule');

  // 사원 관리 모달 상태
  const [isEmpManagerOpen, setIsEmpManagerOpen] = useState(false);

  // Sync createId if current createId is not in employees
  useEffect(() => {
    if (employees.length > 0 && !employees.some((e) => e.사원ID === createId)) {
      setCreateId(employees[0].사원ID);
    }
  }, [employees]);

  if (!isOpen) return null;

  const validItems = items.filter((r) => r.매칭상태 === '✅ 성공');
  const targetItems = validItems.length > 0 ? validItems : items;

  // Toggle participant checkbox
  const handleToggleParticipant = (empId: string) => {
    let nextList: string[];
    if (selectedParticipants.includes(empId)) {
      nextList = selectedParticipants.filter((id) => id !== empId);
    } else {
      nextList = [...selectedParticipants, empId];
    }
    setSelectedParticipants(nextList);
    setCustomParticipantText(nextList.join('; '));
  };

  const handleCustomParticipantChange = (val: string) => {
    setCustomParticipantText(val);
    const parsed = val
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    setSelectedParticipants(parsed);
  };

  const selectAllEmployees = () => {
    const ids = employees.map(employee => employee.사원ID);
    setCreateId(ids[0] || '');
    setSelectedParticipants(ids);
    setCustomParticipantText(ids.join('; '));
  };

  // Pre-validation inspection results
  const validationSummary = {
    totalItems: targetItems.length,
    safeTitleCount: targetItems.filter((it) => (it.schTitle ? it.schTitle.length <= 64 : true)).length,
    nightWorkCount: targetItems.filter((it) => {
      const s = formatToKissTime(it.startDate, false);
      const e = formatToKissTime(it.endDate, true);
      const sH = parseInt(s.split(' ')[1]?.split(':')[0] || '9', 10);
      const eH = parseInt(e.split(' ')[1]?.split(':')[0] || '18', 10);
      return sH >= 20 || eH <= 6 || sH > eH;
    }).length,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmExport(
      {
        calTitle: calTitle.trim() || '',
        createId: createId.trim() || '',
        schUserIdList: customParticipantText.trim() || '',
        alldayYn,
        fileName: fileName.trim() || '업무관리(Kiss)_작업일정(TEST)_일정일괄등록양식.xlsx',
      },
      employees
    );
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50/50 to-white">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-extrabold text-slate-900">
                    업무관리(Kiss) 작업일정 일괄등록 양식 다운로드
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    DOCX 원본 시각 유지
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  실제 작업자는 DOCX 명단을 기준으로 관리하고, 등록자·참여자는 회사 업로드 양식에만 입력합니다.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Company upload account presets */}
          <div className="px-6 py-2.5 bg-slate-100/80 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <BookmarkCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="font-bold text-slate-700 text-[11px]">업로드 사원 선택:</span>
              <button
                type="button"
                onClick={selectAllEmployees}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-semibold border border-slate-200 text-[10px] transition-colors"
              >
                전체 사원
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsEmpManagerOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-all"
            >
              <Settings2 className="h-3 w-3" />
              <span>사원 목록 편집 ({employees.length}명)</span>
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[72vh] overflow-y-auto text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 1. 캘린더(ID).캘린더명 */}
              <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" />
                    <span>1. 캘린더(ID).캘린더명 (calTitle)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">★ 띄어쓰기 포함 일치 필수</span>
                </div>
                <input
                  type="text"
                  required
                  value={calTitle}
                  onChange={(e) => setCalTitle(e.target.value)}
                  placeholder="예: (작업일정(TEST))"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  입력한 캘린더명은 이 브라우저에 자동 저장됩니다. 입력칸을 클릭하면 수정할 수 있습니다. 회사 시스템의 캘린더명과 띄어쓰기까지 맞춰 주세요.
                </p>
              </div>

              {/* 2. 등록자(ID) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>2. 등록자(ID) · 회사 업로드용 (createId)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsEmpManagerOpen(true)}
                    className="text-[10px] text-indigo-600 hover:underline font-semibold"
                  >
                    사원 관리
                  </button>
                </div>

                {/* Fast Select Buttons */}
                <div className="grid grid-cols-2 gap-1.5 mb-2 max-h-24 overflow-y-auto">
                  {employees.map((emp) => (
                    <button
                      key={emp.사원ID}
                      type="button"
                      onClick={() => setCreateId(emp.사원ID)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold text-left transition-all ${
                        createId === emp.사원ID
                          ? 'border-blue-500 bg-blue-100/70 text-blue-900 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold truncate">{emp.사원명}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{emp.사원ID}</div>
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  value={createId}
                  onChange={(e) => setCreateId(e.target.value)}
                  placeholder="회사 등록자 ID 입력"
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 3. 참여자(ID) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-600" />
                    <span>3. 참여자(ID) · 회사 업로드용 (schUserIdList)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500">; 구분자</span>
                </div>

                {/* Fast Multi-select Checkboxes */}
                <div className="grid grid-cols-2 gap-1.5 mb-2 max-h-24 overflow-y-auto">
                  {employees.map((emp) => {
                    const isChecked = selectedParticipants.includes(emp.사원ID);
                    return (
                      <label
                        key={emp.사원ID}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                          isChecked
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleParticipant(emp.사원ID)}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="truncate">
                          <div className="font-bold text-[11px] leading-tight truncate">{emp.사원명}</div>
                          <div className="text-[9px] text-slate-500 font-mono">{emp.사원ID}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <input
                  type="text"
                  required
                  value={customParticipantText}
                  onChange={(e) => handleCustomParticipantChange(e.target.value)}
                  placeholder="회사 참여자 ID 입력 (;로 구분)"
                  className="w-full text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 4. 종일여부 */}
            <div className="grid grid-cols-1 gap-4">
              {/* 종일여부 */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  종일여부 (alldayYn) <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      alldayYn === 'N'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="alldayYn"
                        value="N"
                        checked={alldayYn === 'N'}
                        onChange={() => setAlldayYn('N')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs">N (시간 지정)</span>
                        <span className="block text-[9px] text-slate-500 font-normal">
                          DOCX 원본 시각 그대로
                        </span>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                      alldayYn === 'Y'
                        ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="radio"
                        name="alldayYn"
                        value="Y"
                        checked={alldayYn === 'Y'}
                        onChange={() => setAlldayYn('Y')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-xs">Y (종일 일정)</span>
                        <span className="block text-[9px] text-slate-500 font-normal">
                          종일 작업 등록
                        </span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 5. 저장 파일명 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                저장 파일명 (.xlsx)
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full text-xs font-mono font-medium px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Preview Tabs: Sheet 1 (일정 리스트) vs Sheet 2 (캘린더 참여자) vs 무결성 검증 */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              <div className="px-3 py-2 bg-slate-100 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">생성될 엑셀 시트 미리보기:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('schedule')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        previewTab === 'schedule'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      시트 1: 일정 리스트 ({targetItems.length}건)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('participants')}
                      className={`px-2.5 py-1 rounded-md transition-all ${
                        previewTab === 'participants'
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      시트 2: 캘린더 참여자 ({employees.length}명) · 업로드용
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('healthCheck')}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${
                        previewTab === 'healthCheck'
                          ? 'bg-emerald-600 text-white font-bold'
                          : 'text-emerald-700 hover:text-emerald-900 bg-emerald-50'
                      }`}
                    >
                      <ShieldCheck className="h-3 w-3" />
                      <span>업로드 전 확인</span>
                    </button>
                  </div>
                </div>
                <span className="text-emerald-700 font-bold text-[10px]">
                  {previewTab === 'schedule'
                    ? `A1~H6 템플릿 + A7~ 데이터 · DOCX 원본 시각 유지`
                    : previewTab === 'participants'
                    ? `A1:E${employees.length + 2} 사원 정보`
                    : '양식과 계정 입력값 확인'}
                </span>
              </div>

              {/* Sheet 1 Preview */}
              {previewTab === 'schedule' && (
                <div className="overflow-x-auto max-h-48 text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      {/* Row 4 (Korean) */}
                      <tr className="bg-blue-50/80 text-blue-950 font-bold border-b border-blue-200">
                        <th className="p-1.5 whitespace-nowrap">캘린더(ID).캘린더명</th>
                        <th className="p-1.5 whitespace-nowrap">일정제목 (최대 64자)</th>
                        <th className="p-1.5 whitespace-nowrap">일정내용</th>
                        <th className="p-1.5 whitespace-nowrap">시작시간 (원본)</th>
                        <th className="p-1.5 whitespace-nowrap">종료시간 (원본)</th>
                        <th className="p-1.5 whitespace-nowrap">등록자(ID)</th>
                        <th className="p-1.5 whitespace-nowrap">참여자(ID)</th>
                        <th className="p-1.5 whitespace-nowrap text-center">종일</th>
                      </tr>
                      {/* Row 5 (English) */}
                      <tr className="bg-slate-100 text-slate-500 font-mono text-[9px] border-b border-slate-200">
                        <th className="p-1 whitespace-nowrap">calTitle</th>
                        <th className="p-1 whitespace-nowrap">schTitle</th>
                        <th className="p-1 whitespace-nowrap">contents</th>
                        <th className="p-1 whitespace-nowrap">startDate</th>
                        <th className="p-1 whitespace-nowrap">endDate</th>
                        <th className="p-1 whitespace-nowrap">createId</th>
                        <th className="p-1 whitespace-nowrap">schUserIdList</th>
                        <th className="p-1 whitespace-nowrap text-center">alldayYn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {targetItems.slice(0, 4).map((item) => {
                        const safeTitle = formatTitleForKiss(item.schTitle);
                        const isTitleTruncated = item.schTitle && item.schTitle.length > 64;
                        const sTime = formatToKissTime(item.startDate, false);
                        const eTime = formatToKissTime(item.endDate, true);

                        return (
                          <tr key={item.id} className="text-slate-700 hover:bg-slate-50">
                            <td className="p-1.5 font-mono text-blue-700">{calTitle || ''}</td>
                            <td className="p-1.5 font-medium max-w-xs" title={item.schTitle}>
                              <div className="flex items-center gap-1.5">
                                <span className="truncate">{safeTitle}</span>
                                <span
                                  className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold shrink-0 ${
                                    isTitleTruncated
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {safeTitle.length}/64자
                                </span>
                              </div>
                            </td>
                            <td className="p-1.5 text-slate-500 truncate max-w-xs">{item.contents}</td>
                            <td className="p-1.5 font-mono text-[10px] whitespace-nowrap text-indigo-700 font-semibold">
                              <span className="bg-indigo-50 px-1 py-0.5 rounded">
                                {sTime}
                              </span>
                            </td>
                            <td className="p-1.5 font-mono text-[10px] whitespace-nowrap text-indigo-700 font-semibold">
                              <span className="bg-indigo-50 px-1 py-0.5 rounded">
                                {eTime}
                              </span>
                            </td>
                            <td className="p-1.5 font-mono text-slate-800">{createId || ''}</td>
                            <td className="p-1.5 font-mono text-slate-800">{customParticipantText || ''}</td>
                            <td className="p-1.5 text-center font-bold">{alldayYn}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Sheet 2 Preview */}
              {previewTab === 'participants' && (
                <div className="overflow-x-auto max-h-48 text-[11px] p-2 bg-white">
                  <div className="flex items-center justify-between py-1 px-2 bg-slate-100 rounded-lg text-slate-800 mb-2">
                    <span className="font-bold">업로드 양식용 사원 목록 (A1:E1 병합 - 총 {employees.length}명)</span>
                    <button
                      type="button"
                      onClick={() => setIsEmpManagerOpen(true)}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      + 사원 추가/관리
                    </button>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-1.5 whitespace-nowrap">사원번호</th>
                        <th className="p-1.5 whitespace-nowrap">부서명</th>
                        <th className="p-1.5 whitespace-nowrap">직급명</th>
                        <th className="p-1.5 whitespace-nowrap">사원명</th>
                        <th className="p-1.5 whitespace-nowrap">사원ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {employees.map((emp) => (
                        <tr key={emp.사원ID}>
                          <td className="p-1.5 font-mono text-slate-600">{emp.사원번호}</td>
                          <td className="p-1.5 text-slate-800">{emp.부서명}</td>
                          <td className="p-1.5 text-slate-400">{emp.직급명 || '(공란)'}</td>
                          <td className="p-1.5 font-bold text-slate-900">{emp.사원명}</td>
                          <td className="p-1.5 font-mono text-blue-700 font-bold">{emp.사원ID}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Health Check Tab */}
              {previewTab === 'healthCheck' && (
                <div className="p-4 bg-white text-xs space-y-3">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span>회사 업로드 양식 확인</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600">작업 시간:</span>
                      <span className="font-bold text-emerald-700">DOCX 원본 시각 유지</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600">제목 64자 이내:</span>
                      <span className="font-bold text-emerald-700">
                        {validationSummary.safeTitleCount} / {validationSummary.totalItems}건 안전가드
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600">캘린더명 & 등록자ID:</span>
                      <span className="font-bold text-emerald-700">{calTitle.trim() && createId.trim() ? '입력 완료' : '입력 필요'}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-600">참여자 ID 형식:</span>
                      <span className="font-bold text-emerald-700 font-mono">{customParticipantText.trim() ? '; 구분자로 입력' : '입력 필요'}</span>
                    </div>
                  </div>

                  {validationSummary.nightWorkCount > 0 && (
                    <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center gap-2 text-[11px]">
                      <Moon className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>
                        야간/심야 공사 <strong>{validationSummary.nightWorkCount}건</strong>이 감지되었습니다.
                        익일 종료 시간 및 날짜가 자동으로 계산되어 엑셀에 반영됩니다.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={targetItems.length === 0}
                className="px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>일괄등록 엑셀 다운로드</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Dynamic Employee Manager Modal */}
      <EmployeeManagerModal
        isOpen={isEmpManagerOpen}
        onClose={() => setIsEmpManagerOpen(false)}
        employees={employees}
        onSaveEmployees={onSaveEmployees}
      />
    </>
  );
};
