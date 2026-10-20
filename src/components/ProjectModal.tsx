import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../types';
import { X } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  initialProject?: Project | null;
}

const STATUS_OPTIONS: ProjectStatus[] = ['기획 중', '개발 중', '테스트 중', '완료', '운영 중'];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialProject,
}) => {
  const [name, setName] = useState('');
  const [englishName, setEnglishName] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('개발 중');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name);
      setEnglishName(initialProject.englishName || '');
      setStatus(initialProject.status);
      setCategory(initialProject.category || '');
      setDescription(initialProject.description || '');
      setTechStackInput(initialProject.techStack ? initialProject.techStack.join(', ') : '');
      setLiveUrl(initialProject.liveUrl || '');
    } else {
      setName('');
      setEnglishName('');
      setStatus('개발 중');
      setCategory('업무 자동화');
      setDescription('');
      setTechStackInput('Python');
      setLiveUrl('');
    }
    setError('');
  }, [initialProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('프로젝트명을 입력해 주세요.');
      return;
    }

    const techStack = techStackInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const now = new Date().toISOString();

    const projectToSave: Project = {
      id: initialProject ? initialProject.id : `proj-${Date.now()}`,
      name: name.trim(),
      englishName: englishName.trim(),
      status,
      category: category.trim() || '기타',
      description: description.trim(),
      keyFeatures: initialProject ? initialProject.keyFeatures : [],
      techStack: techStack.length > 0 ? techStack : ['Python'],
      liveUrl: liveUrl.trim(),
      workLogs: initialProject ? initialProject.workLogs : [],
      changelog: initialProject ? initialProject.changelog : [],
      createdAt: initialProject ? initialProject.createdAt : now,
      updatedAt: now,
    };

    onSave(projectToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#21262D]">
          <h3 className="text-sm font-semibold text-[#F0F6FC]">
            {initialProject ? '프로젝트 정보 수정' : '새 프로젝트 등록'}
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

          {/* Project Name */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              프로젝트명 <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 위험성평가서 / 작업계획서 자동화 도구"
              required
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* English Name */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              영문 표시명
            </label>
            <input
              type="text"
              value={englishName}
              onChange={(e) => setEnglishName(e.target.value)}
              placeholder="예: Risk Assessment & Work Plan Automation"
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Status & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
                진행 상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] focus:outline-none focus:border-purple-500"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st} className="bg-[#161B22]">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
                카테고리
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 업무 자동화"
                className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              프로젝트 설명
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 목적 및 개요 작성"
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              사용 기술 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="예: Python, pandas, openpyxl"
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Live URL */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              실행 주소 (선택)
            </label>
            <input
              type="text"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="비워둘 경우 '미등록'으로 표시 (예: https://...)"
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Actions */}
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
