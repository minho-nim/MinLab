import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../types';
import { X, Image as ImageIcon } from 'lucide-react';
import { normalizeProjectStatus } from '../utils/storage';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  initialProject?: Project | null;
}

const STATUS_OPTIONS: ('구상 중' | '개발 중' | '완성' | '보류')[] = ['구상 중', '개발 중', '완성', '보류'];

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
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [techStackInput, setTechStackInput] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || '');
      setEnglishName(initialProject.englishName || '');
      setStatus(normalizeProjectStatus(initialProject.status));
      setCategory(initialProject.category || '');
      setDescription(initialProject.description || '');
      setThumbnailUrl(initialProject.thumbnailUrl || '');
      setTechStackInput(initialProject.techStack ? initialProject.techStack.join(', ') : '');
      setLiveUrl(initialProject.liveUrl || '');
      setGithubUrl(initialProject.githubUrl || '');
      setArchived(Boolean(initialProject.archived));
    } else {
      setName('');
      setEnglishName('');
      setStatus('개발 중');
      setCategory('업무 자동화');
      setDescription('');
      setThumbnailUrl('');
      setTechStackInput('Python');
      setLiveUrl('');
      setGithubUrl('');
      setArchived(false);
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
      thumbnailUrl: thumbnailUrl.trim(),
      isSample: initialProject ? Boolean(initialProject.isSample) : false, // 새로 등록한 프로젝트는 실제 사용자 프로젝트
      archived,
      keyFeatures: initialProject ? initialProject.keyFeatures : [],
      techStack: techStack.length > 0 ? techStack : ['Python'],
      liveUrl: liveUrl.trim(),
      githubUrl: githubUrl.trim(),
      workLogs: initialProject ? initialProject.workLogs : [],
      changelog: initialProject ? initialProject.changelog : [],
      createdAt: initialProject ? initialProject.createdAt : now,
      updatedAt: now,
    };

    onSave(projectToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#21262D]">
          <h3 className="text-sm font-semibold text-[#F0F6FC]">
            {initialProject ? '프로젝트 수정' : '새 프로젝트 등록'}
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

          {/* Project Description (소개) */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              프로젝트 소개
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 목적, 배경 및 소개 내용 작성 (비워둘 수 있습니다)"
              className="w-full px-3 py-2 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] placeholder-[#6E7681] focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Representative Image URL (대표 이미지) */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              대표 이미지 URL (선택)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://... (비워둘 시 기본 기술 그래픽 커버 적용)"
                className="flex-1 px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            {thumbnailUrl && (
              <div className="mt-2 relative h-20 w-full rounded-md border border-[#30363D] overflow-hidden bg-[#0D1117]">
                <img
                  src={thumbnailUrl}
                  alt="미리보기"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
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

          {/* Program Live URL */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              프로그램 실행 URL
            </label>
            <input
              type="text"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="실제 배포 주소가 있을 때만 입력 (미등록 시 빈칸 유지, 임의 생성 금지)"
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* GitHub Repo URL */}
          <div>
            <label className="block text-[11px] font-medium text-[#8B949E] mb-1">
              GitHub 저장소 URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="예: https://github.com/minho-nim/MinLab"
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
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
              placeholder="예: Python, FastAPI, React"
              className="w-full px-3 py-1.5 bg-[#0D1117] border border-[#30363D] rounded-md text-[#E6EDF3] font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Archived toggle */}
          <div className="pt-1 flex items-center justify-between p-2.5 rounded-md bg-[#0D1117] border border-[#30363D]">
            <div>
              <div className="text-[11px] font-medium text-[#C9D1D9]">아카이브 보관</div>
              <div className="text-[10px] text-[#8B949E]">
                완료되었거나 이전 버전으로 보관 목록(Archive)에 이동합니다.
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => setArchived(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-[#21262D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
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
