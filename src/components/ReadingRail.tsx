import "../readingProgress.css";

export function ReadingRail() {
  return (
    <div className="reading-progress" aria-hidden="true">
      <i className="reading-progress-fill" />
      <i className="reading-progress-dot" />
    </div>
  );
}
