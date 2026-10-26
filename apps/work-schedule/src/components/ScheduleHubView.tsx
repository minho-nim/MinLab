import React, { useState } from 'react';
import { ProcessedItem } from '../types';
import {
  ChevronLeft,
  ChevronRight,
  List,
  Calendar,
  BarChart3,
  Search,
  Filter,
  ExternalLink,
  Clock,
  MapPin,
} from 'lucide-react';

interface ScheduleHubViewProps {
  items: ProcessedItem[];
  onSelectItem: (item: ProcessedItem) => void;
}

export const ScheduleHubView: React.FC<ScheduleHubViewProps> = ({
  items,
  onSelectItem,
}) => {
  const [subTab, setSubTab] = useState<'list' | 'calendar' | 'gantt'>('list');

  // Find initial year and month from items
  const validDates = items
    .filter((i) => i.매칭상태 === '✅ 성공' && i.작업일자 !== '미발견')
    .map((i) => i.작업일자);

  const initialYear = validDates.length > 0 ? parseInt(validDates[0].split('.')[0], 10) : new Date().getFullYear();
  const initialMonth = validDates.length > 0 ? parseInt(validDates[0].split('.')[1], 10) : new Date().getMonth() + 1;

  const [currYear, setCurrYear] = useState<number>(initialYear);
  const [currMonth, setCurrMonth] = useState<number>(initialMonth);
  const [selectedContract, setSelectedContract] = useState<string>('전체 보기');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Tooltip hover state
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Month navigation
  const changeMonth = (delta: number) => {
    let nextMonth = currMonth + delta;
    let nextYear = currYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setCurrYear(nextYear);
    setCurrMonth(nextMonth);
  };

  // Contracts list for dropdown
  const uniqueContracts = Array.from(
    new Set(
      items
        .filter((r) => r.매칭상태 === '✅ 성공' && r['추출 계약명'] !== '미발견')
        .map((r) => r['추출 계약명'])
    )
  ).sort();

  const contractOptions = ['전체 보기', ...uniqueContracts];

  // Filtered items
  const validData = items.filter((r) => r.매칭상태 === '✅ 성공' && r.작업일자 !== '미발견');

  const filteredData = validData.filter((r) => {
    const parts = r.작업일자.split('.');
    if (parts.length < 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);

    const matchYM = y === currYear && m === currMonth;
    const matchContract = selectedContract === '전체 보기' || r['추출 계약명'] === selectedContract;

    let matchSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      matchSearch = Boolean(
        (r.작업번호 && r.작업번호.toLowerCase().includes(q)) ||
        (r.계약번호 && r.계약번호.toLowerCase().includes(q)) ||
        (r['추출 계약명'] && r['추출 계약명'].toLowerCase().includes(q)) ||
        (r.작업명 && r.작업명.toLowerCase().includes(q)) ||
        r.workers?.some((worker) =>
          worker.rr.toLowerCase().includes(q) ||
          worker.company.toLowerCase().includes(q) ||
          worker.name.toLowerCase().includes(q) ||
          worker.phone.includes(q)
        )
      );
    }

    return matchYM && matchContract && matchSearch;
  });

  // Sort list view chronologically
  const sortedListData = [...filteredData].sort((a, b) => a.작업일자.localeCompare(b.작업일자));

  // Calendar generation helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };
  const totalDays = getDaysInMonth(currYear, currMonth);

  // Month grid for calendar view (Sunday first)
  const firstDayWeekday = new Date(currYear, currMonth - 1, 1).getDay(); // 0 is Sunday
  const calendarWeeks: Array<Array<number | null>> = [];
  let currentWeek: Array<number | null> = [];

  for (let i = 0; i < firstDayWeekday; i++) {
    currentWeek.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      calendarWeeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    calendarWeeks.push(currentWeek);
  }

  // Events map for calendar view: day -> items
  const calendarEventsMap: { [day: number]: ProcessedItem[] } = {};
  filteredData.forEach((item) => {
    const d = parseInt(item.작업일자.split('.')[2], 10);
    if (!calendarEventsMap[d]) calendarEventsMap[d] = [];
    calendarEventsMap[d].push(item);
  });

  // Gantt Chart Data
  // Unique contracts active in current month
  const ganttContracts = Array.from(new Set(filteredData.map((r) => r['추출 계약명']))).sort();
  const ganttEventsMap: { [contract: string]: { [day: number]: ProcessedItem } } = {};

  filteredData.forEach((item) => {
    const d = parseInt(item.작업일자.split('.')[2], 10);
    const cName = item['추출 계약명'];
    if (!ganttEventsMap[cName]) {
      ganttEventsMap[cName] = {};
    }
    ganttEventsMap[cName][d] = item;
  });

  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div className="space-y-4">
      {/* Tooltip Overlay */}
      {tooltip && (
        <div
          style={{ top: tooltip.y, left: tooltip.x }}
          className="fixed z-50 pointer-events-none bg-slate-900 text-white text-[11px] font-sans px-3 py-1.5 rounded-lg shadow-xl border border-slate-700 whitespace-pre-wrap leading-tight animate-in fade-in-50"
        >
          {tooltip.text}
        </div>
      )}

      {/* Master Control Bar matching Python script */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Month Navigation & Selector */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeMonth(-1)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>이전</span>
            </button>

            <div className="flex items-center space-x-1">
              <select
                value={currYear}
                onChange={(e) => setCurrYear(Number(e.target.value))}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>

              <select
                value={currMonth}
                onChange={(e) => setCurrMonth(Number(e.target.value))}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}월
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1"
            >
              <span>다음</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Filter & Search Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-xs font-bold text-slate-600 hidden sm:inline">계약 필터:</span>
              <select
                value={selectedContract}
                onChange={(e) => setSelectedContract(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 max-w-[220px] truncate focus:ring-2 focus:ring-blue-500"
              >
                {contractOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="작업번호 검색..."
                className="text-xs font-medium pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 w-36 sm:w-44 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar matching Python: [리스트 보기] [달력 보기] [간트 차트] */}
      <div className="bg-white rounded-xl border border-slate-200 p-1.5 flex items-center justify-center space-x-2 shadow-xs">
        <button
          onClick={() => setSubTab('list')}
          className={`flex items-center space-x-2 px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'list'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <List className="h-4 w-4" />
          <span>리스트 보기</span>
        </button>

        <button
          onClick={() => setSubTab('calendar')}
          className={`flex items-center space-x-2 px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'calendar'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>달력 보기</span>
        </button>

        <button
          onClick={() => setSubTab('gantt')}
          className={`flex items-center space-x-2 px-6 py-1.5 rounded-lg text-xs font-bold transition-all ${
            subTab === 'gantt'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>간트 차트</span>
        </button>
      </div>

      {/* SUB-VIEW 1: 리스트 보기 (List View) */}
      {subTab === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <h3 className="font-extrabold text-xs text-slate-800">
              {currYear}년 {currMonth}월 공사 작업 일정 리스트 (총 {sortedListData.length}건)
            </h3>
            <span className="text-[11px] text-slate-500">더블클릭 또는 클릭하여 상세 조회</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3 w-32 text-center">작업일자</th>
                  <th className="p-3 w-32 text-center">작업번호</th>
                  <th className="p-3 w-32 text-center">계약번호</th>
                  <th className="p-3 min-w-[280px]">추출 계약명</th>
                  <th className="p-3 w-24 text-center">시작~종료 시각</th>
                  <th className="p-3 min-w-[200px]">작업내용 (목적)</th>
                  <th className="p-3 min-w-[260px]">실제 작업자 일정 (DOCX R&amp;R)</th>
                  <th className="p-3 w-20 text-center">위치</th>
                  <th className="p-3 min-w-[180px]">파일명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedListData.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-400">
                      해당 월/조건에 해당하는 공사 일정이 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedListData.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => onSelectItem(row)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3 text-center text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="p-3 text-center font-bold text-blue-700">{row.작업일자}</td>
                      <td className="p-3 text-center font-mono font-bold text-slate-900">
                        {row.작업번호}
                      </td>
                      <td className="p-3 text-center font-mono text-slate-600">{row.계약번호}</td>
                      <td className="p-3 font-semibold text-slate-800">{row['추출 계약명']}</td>
                      <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                        {row.startDate ? row.startDate.split(' ')[1] : ''} ~{' '}
                        {row.endDate ? row.endDate.split(' ')[1] : ''}
                      </td>
                      <td className="p-3 text-slate-600 max-w-xs truncate">{row.작업명}</td>
                      <td className="p-3 text-slate-700">
                        {row.workers?.length ? (
                          <div className="space-y-1">
                            {row.workers.map((worker, workerIndex) => (
                              <div key={`${worker.phone}-${workerIndex}`} className="leading-4">
                                <span className="font-bold text-indigo-800">{worker.rr}</span>
                                <span> · {worker.company} · {worker.name} · </span>
                                <span className="font-mono">{worker.phone}</span>
                              </div>
                            ))}
                          </div>
                        ) : <span className="text-slate-400">DOCX 작업자 정보 없음</span>}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {row.위치}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-mono truncate max-w-xs">{row.파일명}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: 달력 보기 (Calendar View) matching Python calendar sheet and UI */}
      {subTab === 'calendar' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Calendar Header with Days of Week */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold">
            {dayNames.map((d, i) => (
              <div
                key={d}
                className={`py-2.5 ${
                  i === 0 ? 'text-red-600' : i === 6 ? 'text-sky-600' : 'text-slate-700'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 border-b border-slate-200">
            {calendarWeeks.map((week, wIdx) =>
              week.map((day, dIdx) => {
                const dayItems = day ? calendarEventsMap[day] || [] : [];
                const isSunday = dIdx === 0;
                const isSaturday = dIdx === 6;

                return (
                  <div
                    key={`${wIdx}-${dIdx}`}
                    className={`min-h-[110px] p-1.5 transition-colors ${
                      day ? 'bg-white hover:bg-slate-50/50' : 'bg-slate-50/30'
                    }`}
                  >
                    {day && (
                      <>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-extrabold ${
                              isSunday
                                ? 'text-red-600'
                                : isSaturday
                                ? 'text-sky-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {day}
                          </span>
                          {dayItems.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
                              {dayItems.length}
                            </span>
                          )}
                        </div>

                        {/* Events Pills */}
                        <div className="space-y-1">
                          {dayItems.map((evt) => (
                            <div
                              key={evt.id}
                              onClick={() => onSelectItem(evt)}
                              onMouseEnter={(e) =>
                                setTooltip({
                                  text: `작업번호: ${evt.작업번호}\n계약명: ${evt['추출 계약명']}\n작업내용: ${evt.작업명}\n위치: ${evt.위치}\n실제 작업자:\n${evt.workers?.map((worker) => `${worker.rr} · ${worker.company} · ${worker.name} · ${worker.phone}`).join('\n') || 'DOCX 작업자 정보 없음'}`,
                                  x: e.clientX + 10,
                                  y: e.clientY + 10,
                                })
                              }
                              onMouseLeave={() => setTooltip(null)}
                              className="text-[10px] font-bold px-1.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 truncate cursor-pointer transition-colors shadow-2xs leading-tight"
                            >
                              • [{evt.작업번호}] {evt['추출 계약명']} {evt.workers?.length ? `· 작업자 ${evt.workers.length}명` : '· 작업자 미확인'}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: 간트 차트 (Gantt Chart) matching Python canvas render */}
      {subTab === 'gantt' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {currYear}년 {currMonth}월 공사 계약별 간트 타임라인 (Gantt Chart)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ● 마크를 클릭하면 해당 작업절차서의 세부 제원과 일정을 확인합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-bold text-blue-700">
                <span className="inline-block h-3 w-3 rounded-full bg-blue-600"></span> 작업 예정일
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                  <th className="p-2.5 w-72 min-w-[280px] sticky left-0 bg-slate-100 z-10 border-r border-slate-300">
                    계약명
                  </th>
                  {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                    const dt = new Date(currYear, currMonth - 1, d);
                    const wIdx = dt.getDay();
                    const isSunday = wIdx === 0;
                    const isSaturday = wIdx === 6;

                    return (
                      <th
                        key={d}
                        className={`p-1.5 w-9 min-w-[36px] text-center border-r border-slate-200 ${
                          isSunday
                            ? 'text-red-600 bg-red-50/40'
                            : isSaturday
                            ? 'text-sky-600 bg-sky-50/40'
                            : 'text-slate-700'
                        }`}
                      >
                        <div className="text-[11px] font-black">{d}</div>
                        <div className="text-[9px] font-normal">({dayNames[wIdx]})</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ganttContracts.length === 0 ? (
                  <tr>
                    <td colSpan={totalDays + 1} className="p-12 text-center text-slate-400">
                      (조회된 데이터가 없습니다. 문서를 분석해주세요.)
                    </td>
                  </tr>
                ) : (
                  ganttContracts.map((cName) => {
                    const contractEvents = ganttEventsMap[cName] || {};

                    return (
                      <tr key={cName} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2.5 font-bold text-slate-800 sticky left-0 bg-white hover:bg-slate-50 z-10 border-r border-slate-200 truncate max-w-xs shadow-xs">
                          {cName}
                        </td>

                        {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
                          const eventItem = contractEvents[d];
                          const dt = new Date(currYear, currMonth - 1, d);
                          const isWeekend = dt.getDay() === 0 || dt.getDay() === 6;

                          return (
                            <td
                              key={d}
                              className={`p-1 text-center border-r border-slate-200 ${
                                isWeekend ? 'bg-slate-50/50' : 'bg-white'
                              }`}
                            >
                              {eventItem ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectItem(eventItem)}
                                  onMouseEnter={(e) =>
                                    setTooltip({
                                      text: `작업 일자: ${currYear}년 ${currMonth}월 ${d}일\n작업번호: ${eventItem.작업번호}\n계약명: ${eventItem['추출 계약명']}\n작업목적: ${eventItem.작업명}`,
                                      x: e.clientX + 10,
                                      y: e.clientY + 10,
                                    })
                                  }
                                  onMouseLeave={() => setTooltip(null)}
                                  className="h-6 w-6 mx-auto rounded-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center shadow-xs transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                                  title="상세 보기"
                                >
                                  ●
                                </button>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
