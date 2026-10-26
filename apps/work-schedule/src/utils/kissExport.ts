import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import templateParts from './kissTemplate.json';
import type { EmployeeInfo, KissExcelOptions, ProcessedItem } from '../types';

export const DEFAULT_KISS_CALENDAR = '3401. 작업일정 등록 TEST';

export function readKissAccounts(data: ArrayBuffer): { calTitle: string; employees: EmployeeInfo[] } {
  const wb = XLSX.read(data);
  const schedule = wb.Sheets['일정리스트'];
  const accounts = wb.Sheets['캘린더 참여자'];
  if (wb.SheetNames.join('|') !== '일정리스트|dropdown_hidden|캘린더 참여자' || !schedule || schedule.A5?.v !== 'calTitle' || schedule.H5?.v !== 'alldayYn' || !accounts) {
    throw new Error('회사 시스템에서 받은 일정 일괄등록 원본 양식을 선택해 주세요.');
  }
  const calTitle = String(schedule.A7?.v || '');
  if (!/^\d+\.\s*\S/.test(calTitle)) throw new Error('원본 양식 A7에서 캘린더 번호와 이름을 찾지 못했습니다.');
  const rows = XLSX.utils.sheet_to_json<string[]>(accounts, { header: 1, raw: false, defval: '' });
  const employees = rows.slice(2).filter(row => row[4]?.trim()).map(row => ({
    사원번호: row[0] || '', 부서명: row[1] || '', 직급명: row[2] || '', 사원명: row[3] || '', 사원ID: row[4].trim(),
  }));
  return { calTitle, employees };
}

function escapeXml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// KISS expects text dates, including dates without a time for all-day schedules.
export function kissDate(raw: string, allDay: boolean): string | null {
  const match = raw?.trim().match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;
  const [, y, m, d, h, min, sec] = match;
  const date = new Date(Date.UTC(+y, +m - 1, +d));
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d) return null;
  const day = `${y}.${m.padStart(2, '0')}.${d.padStart(2, '0')}`;
  if (allDay) return day;
  if (h === undefined || +h > 23 || +min > 59 || (sec && +sec !== 0)) return null;
  return `${day} ${h.padStart(2, '0')}:${min}`;
}

export function validateKissExport(items: ProcessedItem[], options: KissExcelOptions): string[] {
  const errors: string[] = [];
  if (!items.length) errors.push('내보낼 일정이 없습니다.');
  if (!/^\d+\.\s*\S/.test(options.calTitle)) errors.push('캘린더는 번호를 포함한 원본 양식의 값으로 입력해 주세요.');
  if (!options.createId.trim() || /[;\s]/.test(options.createId.trim())) errors.push('등록자 사원 ID를 확인해 주세요.');
  const participants = options.schUserIdList.split(';').map(s => s.trim());
  if (participants.some(s => !s || /\s/.test(s))) errors.push('참여자 사원 ID를 세미콜론(;)으로 구분해 주세요.');
  const allDay = options.alldayYn === 'Y';
  items.forEach((item, index) => {
    const label = `${index + 7}행 (${item.파일명 || item.schTitle})`;
    if (!item.schTitle.trim() || item.schTitle.trim().length > 64) errors.push(`${label}: 일정제목은 1~64자로 수정해 주세요.`);
    const start = kissDate(item.startDate, allDay);
    const end = kissDate(item.endDate, allDay);
    if (!start || !end) errors.push(`${label}: 시작·종료 ${allDay ? '날짜' : '날짜와 시간'}을 확인해 주세요.`);
    else {
      if (allDay ? end < start : end <= start) errors.push(`${label}: 종료가 시작보다 ${allDay ? '빠릅니다' : '늦어야 합니다'}.`);
      if (!allDay && [+start.slice(-2), +end.slice(-2)].some(min => min % 15 !== 0)) {
        errors.push(`${label}: ${start} ~ ${end} — 서버는 15분 단위만 받습니다. 일정 상세에서 시간을 수정해 주세요. 자동 반올림은 하지 않습니다.`);
      }
    }
  });
  return errors;
}

type CellWriter = (ref: string, value: string, style?: string) => string;

function replaceDataRows(xml: string, firstRow: number, values: string[][], lastColumn: string, textCell: CellWriter): string {
  const rows = [...xml.matchAll(/<row\b[^>]*\br="(\d+)"[^>]*>[\s\S]*?<\/row>/g)];
  const sample = rows.find(row => +row[1] === firstRow)?.[0] || '';
  const styleByCol = new Map<string, string>();
  for (const cell of sample.matchAll(/<c\b([^>]*)(?:\/>|>[\s\S]*?<\/c>)/g)) {
    const col = cell[1].match(/\br="([A-Z]+)\d+"/)?.[1];
    const style = cell[1].match(/\bs="(\d+)"/)?.[1];
    if (col && style) styleByCol.set(col, style);
  }
  const rowAttrs = sample.match(/^<row\b([^>]*)>/)?.[1].replace(/\br="\d+"/, '').trim() || '';
  const fixed = rows.filter(row => +row[1] < firstRow).map(row => row[0]).join('');
  const data = values.map((row, index) => {
    const n = firstRow + index;
    return `<row r="${n}" ${rowAttrs}>${row.map((value, col) => {
      const letter = String.fromCharCode(65 + col);
      return textCell(`${letter}${n}`, value, styleByCol.get(letter));
    }).join('')}</row>`;
  }).join('');
  // Retain the original blank styled schedule rows below the populated rows.
  const blanks = firstRow === 7 ? rows.filter(row => +row[1] >= firstRow + values.length && +row[1] <= 17).map(row =>
    row[0].replace(/<c\b([^>]*)(?:\/>|>[\s\S]*?<\/c>)/g, (_, attrs: string) =>
      `<c${attrs.replace(/\s+t="[^"]*"/, '').replace(/\/$/, '')}/>`)
  ).join('') : '';
  const last = Math.max(firstRow - 1 + values.length, firstRow === 7 ? 17 : 2);
  return xml.replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData>${fixed}${data}${blanks}</sheetData>`)
    .replace(/<dimension\b[^>]*\/>/, `<dimension ref="A1:${lastColumn}${last}"/>`);
}

/** Preserve the server template's sheets, relationships, styles, headers and validations.
 * The bundled XML parts omit personal calendars/accounts from the supplied source.
 * Only upload data and its dropdown ranges are changed at export time.
 */
export async function buildKissWorkbook(items: ProcessedItem[], options: KissExcelOptions, employees: EmployeeInfo[] = []): Promise<Uint8Array> {
  const errors = validateKissExport(items, options);
  if (errors.length) throw new Error(errors.join('\n'));
  const zip = options.templateData ? await JSZip.loadAsync(options.templateData) : new JSZip();
  const parts: Record<string, string> = { ...templateParts };
  if (options.templateData) {
    readKissAccounts(options.templateData);
    const hidden = XLSX.read(options.templateData).Sheets.dropdown_hidden;
    const calendars = XLSX.utils.sheet_to_json<string[]>(hidden, { header: 1, raw: false }).map(row => row[0]);
    if (!calendars.includes(options.calTitle)) throw new Error('캘린더 번호와 이름이 원본 양식의 드롭다운 값과 다릅니다. 띄어쓰기까지 확인해 주세요.');
    for (const name of ['xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml', 'xl/worksheets/sheet3.xml', 'xl/sharedStrings.xml']) {
      const part = zip.file(name);
      if (!part) throw new Error('회사 원본 양식의 시트 구성을 확인해 주세요.');
      parts[name] = await part.async('string');
    }
  } else {
    for (const [name, content] of Object.entries(parts)) zip.file(name, content);
  }
  // Match the original cell encoding as well as its displayed values. Some upload
  // readers expect shared strings rather than the equally valid inline strings.
  const baseStrings = (parts['xl/sharedStrings.xml'].match(/<si\b/g) || []).length;
  const addedStrings = new Map<string, number>();
  const textCell: CellWriter = (ref, value, style) => {
    if (!addedStrings.has(value)) addedStrings.set(value, baseStrings + addedStrings.size);
    return `<c r="${ref}"${style ? ` s="${style}"` : ''} t="s"><v>${addedStrings.get(value)}</v></c>`;
  };
  const data = items.map(item => [
    options.calTitle, item.schTitle.trim(), item.contents || '',
    kissDate(item.startDate, options.alldayYn === 'Y')!, kissDate(item.endDate, options.alldayYn === 'Y')!,
    options.createId.trim(), options.schUserIdList.split(';').map(s => s.trim()).join('; '), options.alldayYn,
  ]);
  const last = Math.max(17, items.length + 6);
  let schedule = replaceDataRows(parts['xl/worksheets/sheet1.xml'], 7, data, 'AB', textCell);
  schedule = schedule.replace(/sqref="([AH])(7|10):[AH]17"/g, (_, col, start) => `sqref="${col}${start}:${col}${last}"`);
  zip.file('xl/worksheets/sheet1.xml', schedule);
  const dropdown = options.templateData ? parts['xl/worksheets/sheet2.xml'] : parts['xl/worksheets/sheet2.xml']
    .replace(/<sheetData>[\s\S]*?<\/sheetData>/, `<sheetData><row r="1">${textCell('A1', options.calTitle)}</row></sheetData>`);
  const participants = replaceDataRows(parts['xl/worksheets/sheet3.xml'], 3,
    employees.map(e => [e.사원번호, e.부서명, e.직급명 || '', e.사원명, e.사원ID]), 'E', textCell);
  zip.file('xl/worksheets/sheet2.xml', dropdown);
  zip.file('xl/worksheets/sheet3.xml', participants);
  const stringCount = ([schedule, dropdown, participants].join('').match(/\bt="s"/g) || []).length;
  const sharedStrings = parts['xl/sharedStrings.xml']
    .replace(/\bcount="\d+"/, `count="${stringCount}"`)
    .replace(/\buniqueCount="\d+"/, `uniqueCount="${baseStrings + addedStrings.size}"`)
    .replace('</sst>', [...addedStrings.keys()].map(value => `<si><t xml:space="preserve">${escapeXml(value)}</t></si>`).join('') + '</sst>');
  zip.file('xl/sharedStrings.xml', sharedStrings);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}

export async function exportToKissExcel(items: ProcessedItem[], options: KissExcelOptions, employees: EmployeeInfo[] = []): Promise<void> {
  const data = await buildKissWorkbook(items, options, employees);
  const url = URL.createObjectURL(new Blob([new Uint8Array(data)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = document.createElement('a');
  link.href = url;
  const name = options.fileName?.trim() || '업무관리(Kiss) 작업일정(TEST) 일정 일괄등록 양식.xlsx';
  link.download = /\.xlsx$/i.test(name) ? name : `${name}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
