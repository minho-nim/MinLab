import type { RecordSource } from '../types';

export function parseRecordSource(value: unknown): RecordSource | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const item = value as Record<string, unknown>;
  if (typeof item.fingerprint !== 'string' || typeof item.repository !== 'string' || typeof item.generatedAt !== 'string' || !['codex', 'gemini', 'github'].includes(String(item.engine))) return undefined;
  if (!Array.isArray(item.urls) || !item.urls.every(url => typeof url === 'string' && /^https:\/\/github\.com\//.test(url))) return undefined;
  return { fingerprint: item.fingerprint, repository: item.repository, generatedAt: item.generatedAt, engine: item.engine as RecordSource['engine'], urls: item.urls as string[] };
}
