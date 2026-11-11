import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
export function SmartHeader({ view }: { view: string }) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let last = scrollY;
    const scroll = () => {
      if (Math.abs(scrollY - last) < 8) return;
      setCompact(scrollY > 160 && scrollY > last);
      last = scrollY;
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    if (open) {
      menu.current?.showModal();
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
    menu.current?.close();
  }, [open]);
  const links = [
    ["home", "홈", "#/home"],
    ["archive", "프로젝트", "#/"],
    ["records", "개발일지", "#/development-log"],
    ["about", "소개", "#/about"],
  ];
  return (
    <>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <header className={"smart-header " + (compact ? "compact" : "")}>
        <div>
          <a href="#/home" className="brand" aria-label="MinLab 홈">
            MinLab<span>.</span>
          </a>
          <span className="header-subtitle">프로젝트 아카이브</span>
          <nav aria-label="메인 메뉴">
            {links.map(([id, title, url]) => (
              <a
                key={id}
                href={url}
                aria-current={view === id ? "page" : undefined}
              >
                {title}
              </a>
            ))}
          </nav>
          <button
            aria-label="전체 메뉴 열기"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span>메뉴</span>
            <Menu size={19} />
          </button>
        </div>
      </header>
      {compact && !open && (
        <div className="floating-navigation">
          <a href="#/" className="floating-project-link">
            프로젝트
          </a>
          <button
            aria-label="플로팅 전체 메뉴 열기"
            onClick={() => setOpen(true)}
          >
            메뉴 <Menu size={18} />
          </button>
        </div>
      )}
      <dialog
        ref={menu}
        className="full-menu"
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
      >
        <div className="menu-top">
          <a className="brand" href="#/home" onClick={() => setOpen(false)}>
            MinLab.
          </a>
          <button aria-label="전체 메뉴 닫기" onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>
        <p className="eyebrow">MinLab 둘러보기</p>
        <nav aria-label="전체 메뉴">
          {links.map(([id, title, url], i) => (
            <a key={id} href={url} onClick={() => setOpen(false)}>
              <small>0{i + 1}</small>
              {title}
              <ArrowUpRight />
            </a>
          ))}
        </nav>
      </dialog>
    </>
  );
}
