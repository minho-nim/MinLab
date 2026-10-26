import React, { useState } from 'react';
import { EmployeeInfo } from '../types';
import { Users, X, Plus, Trash2, RotateCcw, Check, AlertCircle, Building2, User, KeyRound, Hash } from 'lucide-react';

interface EmployeeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: EmployeeInfo[];
  onSaveEmployees: (employees: EmployeeInfo[]) => void;
}

export const EmployeeManagerModal: React.FC<EmployeeManagerModalProps> = ({
  isOpen,
  onClose,
  employees,
  onSaveEmployees,
}) => {
  const [empNo, setEmpNo] = useState('');
  const [dept, setDept] = useState('');
  const [position, setPosition] = useState('');
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedId = empId.trim();
    const trimmedName = name.trim();
    const trimmedNo = empNo.trim();

    if (!trimmedId || !trimmedName) {
      setErrorMsg('사원명과 사원ID는 필수 입력값입니다.');
      return;
    }

    if (employees.some((e) => e.사원ID.toLowerCase() === trimmedId.toLowerCase())) {
      setErrorMsg(`사원ID "${trimmedId}"가 이미 목록에 존재합니다.`);
      return;
    }

    const newEmp: EmployeeInfo = {
      사원번호: trimmedNo || `${Math.floor(1000 + Math.random() * 9000)}`,
      부서명: dept.trim(),
      직급명: position.trim(),
      사원명: trimmedName,
      사원ID: trimmedId,
    };

    const updated = [...employees, newEmp];
    onSaveEmployees(updated);

    // Reset inputs
    setEmpNo('');
    setPosition('');
    setName('');
    setEmpId('');
  };

  const handleDelete = (targetId: string) => {
    if (employees.length <= 1) {
      alert('최소 1명 이상의 사원 정보가 존재해야 합니다.');
      return;
    }
    const updated = employees.filter((e) => e.사원ID !== targetId);
    onSaveEmployees(updated);
  };


  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                캘린더 참여자 / 사원 목록 동적 관리
              </h3>
              <p className="text-xs text-slate-500">
                엑셀 [캘린더 참여자] 시트 및 등록자/참여자 선택 목록에 자동 반영됩니다.
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

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Add Employee Form */}
          <form
            onSubmit={handleAddEmployee}
            className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <Plus className="h-4 w-4 text-indigo-600" />
                새 사원 추가
              </span>
              <span className="text-[10px] text-slate-400">사원명 및 사원ID 필수</span>
            </div>

            {errorMsg && (
              <div className="p-2 rounded-lg bg-red-50 text-red-700 text-[11px] flex items-center gap-1.5 border border-red-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">사원번호</label>
                <input
                  type="text"
                  value={empNo}
                  onChange={(e) => setEmpNo(e.target.value)}
                  placeholder="예: 1001"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">부서명</label>
                <input
                  type="text"
                  value={dept}
                  onChange={(e) => setDept(e.target.value)}
                  placeholder="예시 부서"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">직급명</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="공란 가능"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  사원명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 홍길동"
                  className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                  사원ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  placeholder="예: gdhong"
                  className="w-full text-xs font-mono font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-indigo-700"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>사원 목록에 추가</span>
              </button>
            </div>
          </form>

          {/* Current Employee Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-100 flex items-center justify-between border-b border-slate-200">
              <span className="font-bold text-slate-800 text-xs">
                현재 등록된 사원 목록 (총 {employees.length}명)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-2.5 text-center w-12">No</th>
                    <th className="p-2.5 w-24">사원번호</th>
                    <th className="p-2.5 w-32">부서명</th>
                    <th className="p-2.5 w-20">직급명</th>
                    <th className="p-2.5">사원명</th>
                    <th className="p-2.5 font-mono">사원ID</th>
                    <th className="p-2.5 text-center w-16">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {employees.map((emp, idx) => (
                    <tr key={emp.사원ID} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-mono text-slate-600">{emp.사원번호}</td>
                      <td className="p-2.5 text-slate-700 font-medium">{emp.부서명}</td>
                      <td className="p-2.5 text-slate-400">{emp.직급명 || '-'}</td>
                      <td className="p-2.5 font-bold text-slate-900">{emp.사원명}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-600">{emp.사원ID}</td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDelete(emp.사원ID)}
                          title="삭제"
                          className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
};
