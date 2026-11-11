import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
export function SmartHeader({ view }: { view: string }) {
  const [open, setOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    let last = scrollY;
    const scroll = () => {
      setCompact(scrollY > 100 && scrollY > last);
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
    ["home", "Overview", "#/home"],
    ["archive", "Projects", "#/"],
    ["records", "Devlog", "#/development-log"],
    ["about", "About", "#/about"],
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
          <span className="header-subtitle">A LAB OF IDEAS</span>
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
            <span>MENU</span>
            <Menu size={19} />
          </button>
        </div>
      </header>
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
        <p className="eyebrow">EXPLORE MINLAB</p>
        <nav aria-label="전체 메뉴">
          {links.map(([id, title, url], i) => (
            <a key={id} href={url} onClick={() => setOpen(false)}>
              <small>0{i + 1}</small>
              {title}
              <ArrowUpRight />
            </a>
          ))}
        </nav>
        <a className="text-link" href="#/admin" onClick={() => setOpen(false)}>
          관리자 · 이 브라우저의 데이터 관리 ↗
        </a>
        <p className="menu-note">
          프로젝트 편집 내용은 이 브라우저에 저장됩니다.
        </p>
      </dialog>
    </>
  );
}
