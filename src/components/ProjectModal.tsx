import React, { useState, useEffect } from 'react';
import { Project, ProjectStatus } from '../types';
import { X, Image as ImageIcon } from 'lucide-react';
import { normalizeProjectStatus } from '../utils/storage';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => boolean;
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
  const [previewUrl, setPreviewUrl] = useState('');
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
      setPreviewUrl(initialProject.previewUrl || '');
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
      setPreviewUrl('');
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

    if (previewUrl.trim() && !/^(https?:\/\/|\/(?!\/)|\.\.?\/)/i.test(previewUrl.trim())) {
      setError('미리보기 URL은 http(s) 주소 또는 상대 경로로 입력해 주세요.');
      return;
    }

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
      previewUrl: previewUrl.trim(),
      githubUrl: githubUrl.trim(),
      workLogs: initialProject ? initialProject.workLogs : [],
      changelog: initialProject ? initialProject.changelog : [],
      promptHistory: initialProject ? initialProject.promptHistory || [] : [],
      createdAt: initialProject ? initialProject.createdAt : now,
      updatedAt: now,
    };

    if (!onSave(projectToSave)) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-surface border border-line-strong rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">
            {initialProject ? '프로젝트 수정' : '새 프로젝트 등록'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto text-xs">
          {error && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-850 rounded-md">
              {error}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              프로젝트명 <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 위험성평가서 / 작업계획서 자동화 도구"
              required
              className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink focus:outline-none focus:border-accent"
            />
          </div>

          {/* English Name */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              영문 표시명
            </label>
            <input
              type="text"
              value={englishName}
              onChange={(e) => setEnglishName(e.target.value)}
              placeholder="예: Risk Assessment & Work Plan Automation"
              className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {/* Project Description (소개) */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              프로젝트 소개
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트 목적, 배경 및 소개 내용 작성 (비워둘 수 있습니다)"
              className="w-full px-3 py-2 bg-surface-alt border border-line-strong rounded-md text-ink placeholder-muted focus:outline-none focus:border-accent leading-relaxed"
            />
          </div>

          {/* Representative Image URL (대표 이미지) */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              대표 이미지 URL (선택)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://... (비워둘 시 기본 기술 그래픽 커버 적용)"
                className="flex-1 px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink font-mono focus:outline-none focus:border-accent"
              />
            </div>
            {thumbnailUrl && (
              <div className="mt-2 relative h-20 w-full rounded-md border border-line-strong overflow-hidden bg-surface-alt">
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
              <label className="block text-[11px] font-medium text-muted mb-1">
                진행 상태
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink focus:outline-none focus:border-accent"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st} className="bg-surface">
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-muted mb-1">
                카테고리
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="예: 업무 자동화"
                className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Program Live URL */}
          <div>
            <label htmlFor="project-preview-url" className="block text-[11px] font-medium text-muted mb-1">
              미리보기 앱 URL (선택)
            </label>
            <input
              id="project-preview-url"
              type="text"
              value={previewUrl}
              onChange={(e) => setPreviewUrl(e.target.value)}
              placeholder="프로젝트를 배포한 https:// 주소"
              className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink font-mono focus:outline-none focus:border-accent"
            />
            <p className="mt-1 text-[10px] text-muted">상세 화면 안에서 앱을 미리 봅니다. 실행 URL과 같은 주소를 사용해도 됩니다.</p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              프로그램 실행 URL
            </label>
            <input
              type="text"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="실제 배포 주소가 있을 때만 입력 (미등록 시 빈칸 유지, 임의 생성 금지)"
              className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {/* GitHub Repo URL */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              GitHub 저장소 URL
            </label>
            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="예: https://github.com/minho-nim/MinLab"
              className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {/* Tech Stack */}
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">
              사용 기술 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={techStackInput}
              onChange={(e) => setTechStackInput(e.target.value)}
              placeholder="예: Python, FastAPI, React"
              className="w-full px-3 py-1.5 bg-surface-alt border border-line-strong rounded-md text-ink font-mono focus:outline-none focus:border-accent"
            />
          </div>

          {/* Archived toggle */}
          <div className="pt-1 flex items-center justify-between p-2.5 rounded-md bg-surface-alt border border-line-strong">
            <div>
              <div className="text-[11px] font-medium text-ink-secondary">아카이브 보관</div>
              <div className="text-[10px] text-muted">
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
              <div className="w-9 h-5 bg-surface-alt peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-accent"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-ink-secondary bg-surface-alt hover:bg-line-strong transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-accent hover:bg-accent-hover transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
