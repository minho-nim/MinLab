import React from 'react';
import {
  FileText,
  ListFilter,
  CalendarDays,
  Download,
  RotateCcw,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'analysis' | 'matching' | 'schedule';
  setCurrentTab: (tab: 'analysis' | 'matching' | 'schedule') => void;
  onOpenExportModal: () => void;
  onResetSample: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  onOpenExportModal,
  onResetSample,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  공사 일정 통합 관리 센터
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  업무관리(Kiss) 일정 연동
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                작업계획서 Word(.docx) 파싱 및 계약목록 Excel(.xlsx) 스마트 자동 매칭 시스템
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onResetSample}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
              title="초기 샘플 데이터로 복원"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">샘플 복원</span>
            </button>

            <button
              onClick={onOpenExportModal}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
              title="업무관리(Kiss) 작업일정(TEST) 일정 일괄등록 양식 엑셀 다운로드"
            >
              <Download className="h-3.5 w-3.5" />
              <span>일괄등록 엑셀 다운로드</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar (Clean 3 Tabs without Github) */}
      <div className="border-t border-slate-100 bg-slate-50/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="flex items-center justify-center space-x-2 sm:space-x-4">
            <button
              onClick={() => setCurrentTab('analysis')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentTab === 'analysis'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>문서 분석 센터</span>
            </button>

            <button
              onClick={() => setCurrentTab('matching')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentTab === 'matching'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ListFilter className="h-4 w-4" />
              <span>매칭 리스트</span>
            </button>

            <button
              onClick={() => setCurrentTab('schedule')}
              className={`flex items-center space-x-2 px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                currentTab === 'schedule'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>통합 공사 일정표</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
