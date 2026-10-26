import type { WorkerInfo } from '../types';

const header = (value: string) => value.replace(/[\sㅁ□ㅇ:：]/g, '').replace(/＆/g, '&').replace(/[（(][^）)]*[）)]/g, '').toLowerCase();

export function extractDocumentFields(tables: string[][][]) {
  const firstRow = tables[0]?.[0] || [];
  const first = firstRow[0]?.trim() || '';
  const documentTitle = header(first) === '작업명'
    ? (firstRow[1] || tables[0]?.[1]?.[0] || '').trim()
    : first.replace(/^[ㅁ□ㅇ]?\s*작업명\s*[:：]\s*/, '').trim();
  const workers: WorkerInfo[] = [];
  let foundHeaders = false;
  for (const table of tables) {
    let columns: { company: number; rr: number; name: number; phone: number } | null = null;
    let pending = { company: -1, rr: -1, name: -1, phone: -1 };
    for (const row of table) {
      const labels = row.map(header);
      if (row.some(value => /Time\s*Table|작업(?:성공|양호)?\s*판단기준|작업\s*절차|작업\s*순서/i.test(value)) || (labels.includes('time') && labels.includes('내용'))) {
        columns = null; pending = { company: -1, rr: -1, name: -1, phone: -1 }; continue;
      }
      const next = { company: labels.findIndex(label => ['회사명', '소속', '소속회사', '업체명'].includes(label)), rr: labels.findIndex(label => ['r&r', '구분', '역할'].includes(label)), name: labels.findIndex(label => label === '이름' || label === '성명'), phone: labels.reduce((last, label, index) => ['연락처', '전화번호', '휴대폰', '휴대전화'].includes(label) ? index : last, -1) };
      // Filled procedures replace the literal '회사명' header with the actual
      // company in a vertically merged cell immediately before R&R.
      if (next.company < 0 && next.rr > 0 && next.name >= 0 && next.phone >= 0) {
        const left = next.rr - 1;
        if (row[left]?.trim() && !['연락처', '전화번호'].includes(labels[left])) next.company = left;
      }
      const count = Object.values(next).filter(index => index >= 0).length;
      if ((count >= 2 && (next.rr >= 0 || next.name >= 0)) || (!columns && count > 0)) {
        for (const key of Object.keys(next) as (keyof typeof next)[]) if (next[key] >= 0) pending[key] = next[key];
        if (Object.values(pending).every(index => index >= 0)) { columns = { ...pending }; foundHeaders = true; }
        continue;
      }
      if (!columns) continue;
      const worker = { company: (row[columns.company] || '').trim(), rr: (row[columns.rr] || '').trim(), name: (row[columns.name] || '').trim(), phone: (row[columns.phone] || '').trim() };
      if (['회사명', '소속', '소속회사', '업체명'].includes(header(worker.company))) worker.company = '';
      if (!worker.name && !worker.phone) continue;
      if (!workers.some(existing => Object.keys(worker).every(key => existing[key as keyof WorkerInfo] === worker[key as keyof WorkerInfo]))) workers.push(worker);
    }
  }
  const missingCompanies = workers.filter(worker => !worker.company).length;
  const workerExtractionReason = workers.length ? (missingCompanies ? `작업자 ${missingCompanies}명의 회사명이 원본에 입력되어 있지 않습니다. 이름·R&R·연락처는 추출했습니다.` : '') : foundHeaders
    ? '연락망 표는 찾았지만 이름·연락처에 입력된 작업자가 없습니다. 원본 명단의 빈칸을 확인해 주세요.'
    : '회사명·R&R·이름·연락처 머리글을 갖춘 연락망 표를 찾지 못했습니다. 이미지로 삽입된 명단은 자동으로 읽을 수 없습니다.';
  return { documentTitle, workers, workerExtractionReason };
}

// Read Word's original grid. HTML conversion can collapse empty/merged cells.
export function readWordTables(document: Document): string[][][] {
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const children = (element: Element, name: string) => Array.from(element.childNodes).filter(node => node.nodeType === 1 && (node as Element).localName === name) as Element[];
  return Array.from(document.getElementsByTagNameNS(ns, 'tbl')).map(table => {
    const grid: string[][] = [];
    children(table, 'tr').forEach((row, rowIndex) => {
      const before = row.getElementsByTagNameNS(ns, 'gridBefore')[0];
      let col = Number(before?.getAttributeNS(ns, 'val') || 0);
      grid[rowIndex] ||= [];
      children(row, 'tc').forEach(cell => {
        const props = children(cell, 'tcPr')[0];
        const span = Math.max(1, Number(props?.getElementsByTagNameNS(ns, 'gridSpan')[0]?.getAttributeNS(ns, 'val') || 1));
        const merge = props?.getElementsByTagNameNS(ns, 'vMerge')[0];
        const text = Array.from(cell.getElementsByTagNameNS(ns, 'p')).map(p => Array.from(p.getElementsByTagNameNS(ns, 't')).map(t => t.textContent || '').join('')).join('\n').trim();
        for (let c = 0; c < span; c++) grid[rowIndex][col + c] = merge && merge.getAttributeNS(ns, 'val') !== 'restart' ? (grid[rowIndex - 1]?.[col + c] || '') : text;
        col += span;
      });
    });
    return grid;
  });
}
