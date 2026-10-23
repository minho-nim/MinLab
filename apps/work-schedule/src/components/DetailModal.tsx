import React, { useState, useEffect } from 'react';
import { ProcessedItem, WorkerInfo } from '../types';
import { formatToKissTime, formatTitleForKiss } from '../utils/parser';
import {
  X,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Tag,
  CheckCircle2,
  AlertCircle,
  Save,
  Users,
  Phone,
  Building2,
  Plus,
  Trash2,
  Copy,
  Info,
} from 'lucide-react';

interface DetailModalProps {
  item: ProcessedItem | null;
  onClose: () => void;
  onUpdateItem?: (updatedItem: ProcessedItem) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({ item, onClose, onUpdateItem }) => {
  const [schTitle, setSchTitle] = useState('');
  const [contents, setContents] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // New worker form inputs
  const [newRr, setNewRr] = useState('작업원');
  const [newCompany, setNewCompany] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [showAddWorker, setShowAddWorker] = useState(false);

  useEffect(() => {
    if (item) {
      setSchTitle(item.schTitle || '');
      setContents(item.contents || '');
      setStartDate(item.startDate || '');
      setEndDate(item.endDate || '');
      setLocation(item.위치 || '');
      setWorkers(item.workers && item.workers.length > 0 ? [...item.workers] : []);
      setIsSaved(false);
      setShowAddWorker(false);
    }
  }, [item]);

  if (!item) return null;

  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1500);
  };

  const handleAddWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPhone.trim()) return;

    const newW: WorkerInfo = {
      rr: newRr.trim() || '작업원',
      company: newCompany.trim() || '협력사',
      name: newName.trim(),
      phone: newPhone.trim(),
    };

    setWorkers((prev) => [...prev, newW]);
    setNewName('');
    setNewPhone('');
    setShowAddWorker(false);
  };

  const handleDeleteWorker = (idx: number) => {
    setWorkers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!onUpdateItem) return;
    const updated: ProcessedItem = {
      ...item,
      schTitle: schTitle.trim(),
      contents: contents.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      위치: location.trim(),
      workers: workers,
    };
    onUpdateItem(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const titleLength = schTitle.length;
  const isTitleOverLimit = titleLength > 64;

  const kissStartTime = formatToKissTime(startDate, false);
  const kissEndTime = formatToKissTime(endDate, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50 via-blue-50/40 to-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold font-mono shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-slate-900 font-mono">
                  {item.작업번호}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    item.매칭상태 === '✅ 성공'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.매칭상태}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">{item.파일명}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Contracts Info */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
            <div>
              <span className="font-bold text-slate-500 block mb-1">계약번호</span>
              <span className="font-mono font-bold text-slate-800 text-sm">
                {item.계약번호 || '미발견'}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block mb-1">작업 위치 (지역)</span>
              <div className="flex items-center gap-1 font-bold text-blue-700">
                <MapPin className="h-3.5 w-3.5" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-white font-bold text-blue-700 text-xs w-24"
                />
              </div>
            </div>
          </div>

          {/* 🌟 핵심 작업자 일정 및 비상연락망 (회사명, R&R, 이름, 연락처) */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white border border-indigo-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-indigo-950">
                    현장 작업자 명단 & 비상연락망 (R&R)
                  </h4>
                  <p className="text-[10px] text-indigo-600">
                    문서에서 파싱된 실제 작업 인력 정보 (등록자/참여자는 ERP 양식 업로드용 코드입니다)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAddWorker(!showAddWorker)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3 w-3" />
                <span>작업자 추가</span>
              </button>
            </div>

            {/* Add Worker Inline Form */}
            {showAddWorker && (
              <form
                onSubmit={handleAddWorker}
                className="p-3 bg-white rounded-xl border border-indigo-200 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in text-xs"
              >
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">R&R (구분)</label>
                  <select
                    value={newRr}
                    onChange={(e) => setNewRr(e.target.value)}
                    className="w-full text-xs px-2 py-1 rounded border border-slate-300 bg-white"
                  >
                    <option value="작업책임자">작업책임자</option>
                    <option value="안전관리자">안전관리자</option>
                    <option value="현장대리인">현장대리인</option>
                    <option value="화기감시자">화기감시자</option>
                    <option value="신호수">신호수</option>
                    <option value="작업원">작업원</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">회사명 (소속)</label>
                  <input
                    type="text"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="예: (주)한라통신"
                    className="w-full text-xs px-2 py-1 rounded border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">이름 (성명)</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="예: 홍길동"
                    className="w-full text-xs px-2 py-1 rounded border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 mb-0.5">연락처</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full text-xs px-2 py-1 rounded border border-slate-300 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded bg-indigo-600 text-white font-bold text-xs"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Workers Table */}
            <div className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
              {workers.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  작업계획서 문서에서 추출된 작업자 정보가 없습니다. (상단 [+ 작업자 추가]를 눌러 등록할 수 있습니다)
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-indigo-50/70 text-indigo-900 font-bold border-b border-indigo-100">
                      <th className="p-2 w-24">R&R (구분)</th>
                      <th className="p-2 w-32">회사명</th>
                      <th className="p-2 w-24">이름</th>
                      <th className="p-2">연락처 (전화번호)</th>
                      <th className="p-2 text-center w-12">삭제</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-50">
                    {workers.map((w, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30">
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              w.rr === '작업책임자' || w.rr === '현장대리인'
                                ? 'bg-blue-100 text-blue-800 font-extrabold'
                                : w.rr === '안전관리자'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {w.rr}
                          </span>
                        </td>
                        <td className="p-2 text-slate-700 font-medium">{w.company}</td>
                        <td className="p-2 font-bold text-slate-900">{w.name}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${w.phone}`}
                              className="font-mono text-indigo-600 font-bold hover:underline flex items-center gap-1"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{w.phone}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(w.phone)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100 transition-colors"
                              title="번호 복사"
                            >
                              {copiedPhone === w.phone ? (
                                <span className="text-[10px] font-bold text-emerald-600">복사됨!</span>
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteWorker(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            title="삭제"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-500 block mb-1">추출 계약명</span>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800">
              {item['추출 계약명']}
            </div>
          </div>

          <div>
            <span className="font-bold text-slate-500 block mb-1">엑셀 원본 계약명</span>
            <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700">
              {item['엑셀 원본 계약명']}
            </div>
          </div>

          {/* 작업 시간 정보 (문서 원본 시각 정확히 표시) */}
          <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>작업 일정 (문서 원본 시각 정확 반영)</span>
              </span>
              <span className="text-[10px] text-blue-700 font-semibold">
                강제 라운딩 없이 문서 시각 그대로 적용
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">시작 일시 (startDate)</label>
                <input
                  type="text"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900"
                />
                <div className="mt-1 text-[10px] text-slate-500">
                  포맷: <strong className="text-blue-700">{kissStartTime}</strong>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">종료 일시 (endDate)</label>
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs font-bold text-slate-900"
                />
                <div className="mt-1 text-[10px] text-slate-500">
                  포맷: <strong className="text-blue-700">{kissEndTime}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 일정 제목 (schTitle) & 64자 글자 수 가드 */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-indigo-600" />
                <span>일정제목 (schTitle)</span>
              </label>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  isTitleOverLimit
                    ? 'bg-red-100 text-red-700 border border-red-200'
                    : titleLength > 55
                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {titleLength} / 64자 {isTitleOverLimit && '(초과 시 63자 자동 잘림)'}
              </span>
            </div>

            <input
              type="text"
              value={schTitle}
              onChange={(e) => setSchTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 일정 내용 (contents) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
            <label className="font-bold text-slate-700 text-xs block">일정내용 (contents)</label>
            <textarea
              rows={2}
              value={contents}
              onChange={(e) => setContents(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-normal text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <span className="font-bold text-slate-500 block mb-1">작업 목적 및 내용 원문 (ㅇ목적)</span>
            <p className="p-3 rounded-xl border border-slate-200 bg-white text-slate-700 leading-relaxed font-medium">
              {item.작업명 || '내용 없음'}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {isSaved && (
              <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4" />
                <span>작업자 명단 및 일정 수정사항이 저장되었습니다!</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onUpdateItem && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Save className="h-3.5 w-3.5" />
                <span>수정사항 저장</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
