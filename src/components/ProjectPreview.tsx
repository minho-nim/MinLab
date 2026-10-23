import React, { useState } from 'react';
import { ExternalLink, Monitor, Play, RotateCcw, Smartphone, X } from 'lucide-react';

export function ProjectPreview({ name, url, autoOpen = false }: { name: string; url: string; autoOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [mobile, setMobile] = useState(false);
  const [revision, setRevision] = useState(0);

  return (
    <section className="space-y-4 rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">앱 미리보기</h2>
          <p className="mt-1 break-all text-xs text-muted">{url}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isOpen ? (
            <>
              <button type="button" onClick={() => setMobile(!mobile)} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-ink-secondary" aria-pressed={mobile}>
                {mobile ? <Monitor className="h-3.5 w-3.5" /> : <Smartphone className="h-3.5 w-3.5" />}
                {mobile ? '넓게 보기' : '모바일 너비'}
              </button>
              <button type="button" onClick={() => setRevision((value) => value + 1)} aria-label="미리보기 새로고침" className="rounded-md border border-line p-2 text-ink-secondary"><RotateCcw className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="미리보기 닫기" className="rounded-md border border-line p-2 text-ink-secondary"><X className="h-3.5 w-3.5" /></button>
            </>
          ) : (
            <button type="button" onClick={() => setIsOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 font-medium text-white hover:bg-accent-hover"><Play className="h-3.5 w-3.5" />미리보기 시작</button>
          )}
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-2 text-ink-secondary">새 탭으로 열기<ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </div>
      {isOpen ? (
        <div className="rounded-lg border border-line bg-surface-alt p-2 sm:p-3">
          <iframe
            key={revision}
            src={url}
            title={`${name} 앱 미리보기`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-modals allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            className={`mx-auto h-[640px] w-full rounded-md border border-line bg-white ${mobile ? 'max-w-[390px]' : ''}`}
          />
          <p className="mt-2 text-[11px] text-muted">화면이 표시되지 않으면 새 탭으로 열어 주세요. 배포 서비스의 설정에 따라 내부 미리보기가 제한될 수 있습니다.</p>
        </div>
      ) : <p className="text-xs text-muted">시작 버튼을 누르면 이 화면에서 앱을 사용할 수 있습니다.</p>}
    </section>
  );
}
