import type { ChangelogItem, PromptHistoryItem } from '../types';

/** Preserve older backup entries when moving the changelog into prompt history. */
export const migrateChangelogToPrompts = (
  changelog: ChangelogItem[],
  promptHistory: PromptHistoryItem[] = [],
): PromptHistoryItem[] => {
  const result = [...promptHistory];
  const existingIds = new Set(result.map((item) => item.id));

  for (const [index, entry] of changelog.entries()) {
    const id = entry.id || `legacy-changelog-${index}`;
    // A record already using this ID is the current, possibly edited version.
    if (existingIds.has(id)) continue;

    const firstLine = entry.description.split(/\r?\n/).find((line) => line.trim()) || '';
    const heading = firstLine.replace(/^\s*#{1,6}\s*/, '').trim() || '이전 기록';
    result.push({
      id,
      date: entry.date,
      title: entry.version.trim() ? `${entry.version} · ${heading}` : heading,
      prompt: entry.description,
      outcome: '',
    });
    existingIds.add(id);
  }

  return result;
};
