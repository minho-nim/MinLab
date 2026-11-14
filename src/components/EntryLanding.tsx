import { ArrowUpRight } from "lucide-react";
import { useEffect } from "react";

const destinations = [
  { name: "홈", href: "#/home" },
  { name: "프로젝트", href: "#/" },
  { name: "개발일지", href: "#/development-log" },
  { name: "소개", href: "#/about" },
];

export function EntryLanding() {
  useEffect(() => {
    const theme = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    const previous = theme?.content;
    if (theme) theme.content = "#194D38";
    return () => {
      if (theme && previous) theme.content = previous;
    };
  }, []);
  return (
    <section className="entry-landing" aria-labelledby="entry-title">
      <a
        className="entry-skip"
        href="#entry-navigation"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("entry-navigation")?.focus();
        }}
      >
        탐색 메뉴로 건너뛰기
      </a>
      <header className="entry-header">
        <a className="entry-brand" href="#/start" aria-label="MinLab 메인">
          MinLab.
        </a>
      </header>
      <div className="entry-content">
        <h1 id="entry-title">MinLab 둘러보기</h1>
        <nav tabIndex={-1} id="entry-navigation" aria-label="메인 화면 탐색">
          {destinations.map((destination, index) => (
            <a key={destination.href} href={destination.href}>
              <small aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </small>
              <span>{destination.name}</span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
