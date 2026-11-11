import { ExternalLink } from "lucide-react";
// Keep this interface for existing management screens. Applications run in a separate tab.
export function ProjectPreview({
  name,
  url,
}: {
  name: string;
  url: string;
  autoOpen?: boolean;
}) {
  return (
    <section className="external-preview">
      <p className="eyebrow">EXTERNAL APPLICATION</p>
      <h2>{name}</h2>
      <p>앱은 새 탭에서 실행합니다.</p>
      {url?.trim() && (
        <a className="primary-link" href={url} target="_blank" rel="noreferrer">
          앱 실행하기 <ExternalLink size={16} />
        </a>
      )}
    </section>
  );
}
