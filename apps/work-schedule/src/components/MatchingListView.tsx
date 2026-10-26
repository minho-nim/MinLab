import React, { useState } from 'react';
import { ProcessedItem } from '../types';
import { Search, FileText, CheckCircle2, AlertCircle, ExternalLink, Phone, Users, ShieldAlert } from 'lucide-react';

interface MatchingListViewProps {
  items: ProcessedItem[];
  onSelectItem: (item: ProcessedItem) => void;
}

export const MatchingListView: React.FC<MatchingListViewProps> = ({
  items,
  onSelectItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();

    const workerMatch = item.workers?.some(
      (w) =>
        w.name.toLowerCase().includes(query) ||
        w.phone.includes(query) ||
        w.company.toLowerCase().includes(query) ||
        w.rr.toLowerCase().includes(query)
    );

    return (
      (item.작업번호 && item.작업번호.toLowerCase().includes(query)) ||
      (item.계약번호 && item.계약번호.toLowerCase().includes(query)) ||
      (item['추출 계약명'] && item['추출 계약명'].toLowerCase().includes(query)) ||
      (item['엑셀 원본 계약명'] && item['엑셀 원본 계약명'].toLowerCase().includes(query)) ||
      (item.파일명 && item.파일명.toLowerCase().includes(query)) ||
      (item.위치 && item.위치.toLowerCase().includes(query)) ||
      item.matchFailureReason?.toLowerCase().includes(query) ||
      workerMatch
    );
  });

  return (
    <div className="space-y-4">
      {/* Search Bar matching python entry_search */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="작업번호, 계약명, 작업자 이름, 회사명, 연락처, 위치 검색..."
            className="w-full bg-white border border-slate-200 text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            초기화
          </button>
        )}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h3 className="font-extrabold text-sm text-slate-900">
              계약 및 작업자 매칭 리스트 (총 {filteredItems.length}건)
            </h3>
            <span className="text-xs text-slate-500">
              (행을 클릭하면 현장 작업자 연락처 및 작업절차서 세부 내용을 확인합니다)
            </span>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
            현장 작업자/비상연락망(R&R) 연동
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300">
                <th className="p-3 w-12 text-center">No</th>
                <th className="p-3 w-28 text-center">작업번호</th>
                <th className="p-3 w-24 text-center">계약번호</th>
                <th className="p-3 min-w-48 text-center">상태 / 실패 사유</th>
                <th className="p-3 min-w-[240px]">공사 계약명</th>
                <th className="p-3 min-w-[240px] bg-indigo-50/50 text-indigo-950">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-indigo-600" />
                    <span>현장 작업자 / 비상연락망 (R&R)</span>
                  </div>
                </th>
                <th className="p-3 w-32 text-center">작업 일시</th>
                <th className="p-3 w-16 text-center">위치</th>
                <th className="p-3 w-16 text-center">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 text-xs">
                    검색 결과가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const primaryWorker = item.workers && item.workers.length > 0 ? item.workers[0] : null;
                  const otherCount = item.workers && item.workers.length > 1 ? item.workers.length - 1 : 0;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectItem(item)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="p-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="p-3 text-center font-bold text-slate-900 font-mono">
                        {item.작업번호}
                      </td>
                      <td className="p-3 text-center font-semibold text-slate-600 font-mono">
                        {item.계약번호}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.매칭상태 === '✅ 성공'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.매칭상태}
                        </span>
                        {item.matchFailureReason && <p className="mt-1 text-left text-[11px] text-red-700">{item.matchFailureReason}</p>}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 max-w-xs truncate" title={item['추출 계약명']}>
                        {item['추출 계약명']}
                      </td>

                      {/* 현장 작업자 / 비상연락망 열 */}
                      <td className="p-3 bg-indigo-50/30">
                        {primaryWorker ? (
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  primaryWorker.rr === '관리책임자' || primaryWorker.rr === '관리감독자'
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-slate-200 text-slate-800'
                                }`}
                              >
                                {primaryWorker.rr}
                              </span>
                              <span className="font-bold text-slate-900">{primaryWorker.name}</span>
                              <span className="font-mono text-indigo-700 font-semibold text-[11px]">
                                {primaryWorker.phone}
                              </span>
                              {otherCount > 0 && (
                                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-indigo-100 text-indigo-800 font-bold">
                                  +{otherCount}명
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium truncate max-w-xs">
                              {primaryWorker.company}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">{item.workerExtractionReason || '작업자 미지정'}</span>
                        )}
                      </td>

                      <td className="p-3 text-center font-medium text-slate-700 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{item.작업일자}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {item.startDate.split(' ')[1]?.substring(0, 5) || '09:00'} ~{' '}
                          {item.endDate.split(' ')[1]?.substring(0, 5) || '18:00'}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.위치}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItem(item);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          title="상세 보기"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
