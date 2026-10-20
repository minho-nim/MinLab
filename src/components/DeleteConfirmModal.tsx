import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title?: string;
  itemName: string;
  description?: string;
  warningText?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title = '삭제 확인',
  itemName,
  description,
  warningText = '주의: 삭제 시 데이터가 영구적으로 제거되며 되돌릴 수 없습니다.',
  confirmText = '삭제',
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#21262D]">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-semibold text-[#F0F6FC]">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#8B949E] hover:text-[#F0F6FC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3 text-xs">
          <p className="text-[#C9D1D9] leading-relaxed">
            정말로 <span className="font-semibold text-white">'{itemName}'</span>을(를) 삭제하시겠습니까?
          </p>
          {description && (
            <p className="text-[#8B949E] leading-relaxed">
              {description}
            </p>
          )}
          {warningText && (
            <div className="p-3 rounded-md bg-rose-950/20 border border-rose-900/40 text-[#8B949E]">
              <p className="text-rose-300 font-medium">{warningText}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#21262D] bg-[#0D1117]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-[#C9D1D9] bg-[#21262D] hover:bg-[#30363D] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-sm"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
