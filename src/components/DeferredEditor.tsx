import React, { Suspense, useEffect, useState } from "react";
import { useModalFocus } from "../utils/useModalFocus";

function EditorStatus({
  failed = false,
  onCancel,
}: {
  failed?: boolean;
  onCancel?: () => void;
}) {
  const dialogRef = useModalFocus(!!onCancel, onCancel || (() => {}));
  const content = (
    <div className="rounded-xl border border-line bg-surface p-6 text-ink">
      <p role={failed ? "alert" : "status"}>
        {failed
          ? "편집 화면을 불러오지 못했습니다. 연결 상태를 확인한 뒤 다시 불러와 주세요."
          : "편집 화면을 불러오는 중입니다."}
      </p>
      {failed && (
        <button className="primary-link mt-4" onClick={() => location.reload()}>
          화면 다시 불러오기
        </button>
      )}
      {onCancel && (
        <button className="text-link mt-4 ml-4" onClick={onCancel}>
          닫기
        </button>
      )}
    </div>
  );
  return onCancel ? (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={failed ? "편집 화면 연결 오류" : "편집 화면 불러오기"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      {content}
    </div>
  ) : (
    content
  );
}

type Props = {
  children: React.ReactNode;
  active?: boolean;
  onCancel?: () => void;
};

class EditorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      this.props.active ? (
        <EditorStatus failed onCancel={this.props.onCancel} />
      ) : null
    ) : (
      this.props.children
    );
  }
}

// Mount on first use, then retain form state across close/reopen as before.
export function DeferredEditor({ children, active = true, onCancel }: Props) {
  const [requested, setRequested] = useState(active);
  useEffect(() => {
    if (active) setRequested(true);
  }, [active]);
  if (!active && !requested) return null;
  return (
    <EditorBoundary active={active} onCancel={onCancel}>
      <Suspense fallback={active ? <EditorStatus onCancel={onCancel} /> : null}>
        {children}
      </Suspense>
    </EditorBoundary>
  );
}
