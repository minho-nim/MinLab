import type { WorkerInfo } from '../types';

const header = (value: string) => value.replace(/[\sㅁ□ㅇ:：]/g, '').toLowerCase();

export function extractDocumentFields(tables: string[][][]) {
  const firstRow = tables[0]?.[0] || [];
  const first = firstRow[0]?.trim() || '';
  const documentTitle = header(first) === '작업명'
    ? (firstRow[1] || tables[0]?.[1]?.[0] || '').trim()
    : first.replace(/^[ㅁ□ㅇ]?\s*작업명\s*[:：]\s*/, '').trim();
  const workers: WorkerInfo[] = [];
  for (const table of tables) {
    let columns: { company: number; rr: number; name: number; phone: number } | null = null;
    for (const row of table) {
      const labels = row.map(header);
      const next = { company: labels.indexOf('회사명'), rr: labels.indexOf('r&r'), name: labels.findIndex(label => label === '이름' || label === '성명'), phone: labels.lastIndexOf('연락처') };
      if (Object.values(next).every(index => index >= 0)) { columns = next; continue; }
      if (!columns) continue;
      const worker = { company: (row[columns.company] || '').trim(), rr: (row[columns.rr] || '').trim(), name: (row[columns.name] || '').trim(), phone: (row[columns.phone] || '').trim() };
      if (!worker.name && !worker.phone) continue;
      if (!workers.some(existing => Object.keys(worker).every(key => existing[key as keyof WorkerInfo] === worker[key as keyof WorkerInfo]))) workers.push(worker);
    }
  }
  return { documentTitle, workers };
}

// Expand merged cells to keep company/R&R/name/phone aligned with the header row.
export function readDocumentTables(document: Document): string[][][] {
  return Array.from(document.querySelectorAll('table')).map(table => {
    const grid: string[][] = [];
    const rows = Array.from(table.querySelectorAll('tr')).filter(row => row.closest('table') === table);
    rows.forEach((row, rowIndex) => {
      grid[rowIndex] ||= [];
      let column = 0;
      Array.from(row.children).filter(cell => cell.tagName === 'TD' || cell.tagName === 'TH').forEach(element => {
        const cell = element as HTMLTableCellElement;
        while (grid[rowIndex][column] !== undefined) column++;
        const value = Array.from(cell.childNodes).map(node => node.textContent || '').join('\n').trim();
        for (let r = 0; r < Math.max(1, cell.rowSpan); r++) {
          grid[rowIndex + r] ||= [];
          for (let c = 0; c < Math.max(1, cell.colSpan); c++) grid[rowIndex + r][column + c] = value;
        }
        column += Math.max(1, cell.colSpan);
      });
    });
    return grid;
  });
}
