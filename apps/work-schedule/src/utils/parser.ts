import mammoth from 'mammoth';
import JSZip from 'jszip';
import { kissDate } from './kissExport';
import { extractDocumentFields, readWordTables } from './docxTables';
import * as XLSX from 'xlsx';
import {
  ParsedWorkPlan,
  ProcessedItem,
  ExcelContractRow,
  EmployeeInfo,
} from '../types';

export function normalizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[\s_\-\(\)\[\]\.\,\/]/g, '');
}

export function optimizeContractName(name: string, maxLen = 20): string {
  if (!name || name === '미발견') return '계약명없음';

  let cleaned = name.replace(/\s+/g, ' ').trim();

  const bracketMatch = cleaned.match(/\(([^)]+)\)/);
  if (bracketMatch) {
    const innerText = bracketMatch[1].trim();
    if (innerText.length >= 3) {
      cleaned = innerText;
    }
  }

  const prefixes = ['대한민국', '주식회사', '한국', '공사'];
  for (const prefix of prefixes) {
    if (cleaned.startsWith(prefix) && cleaned.length > prefix.length) {
      cleaned = cleaned.substring(prefix.length).trim();
    }
  }

  if (cleaned.length <= maxLen) {
    return cleaned;
  } else {
    return cleaned.substring(0, maxLen).trim() + '…';
  }
}

export function parseWorkPlanText(combinedText: string): ParsedWorkPlan {
  const result: ParsedWorkPlan = {
    작업번호: '미발견',
    계약번호: '미발견',
    계약명: '미발견',
    작업일자: '미발견',
    작업시각시작: '09:00:00',
    작업시각종료: '18:00:00',
    작업명: '미발견',
    위치: '미발견',
    rawText: combinedText,
  };

  // 위치(지역명) 정비: 판교, 보라매, 성수, 장안, 대덕, 둔산, 분당, 수유, 인천, 오리
  const regions = ['판교', '보라매', '성수', '장안', '대덕', '둔산', '분당', '수유', '인천', '오리'];
  let foundRegion = '기타';
  for (const r of regions) {
    if (combinedText.includes(r)) {
      foundRegion = r;
      break;
    }
  }
  result['위치'] = foundRegion;

  // ㅇ작업번호 : ([A-Za-z0-9_\-]+)
  const taskNoMatch = combinedText.match(/ㅇ작업번호\s*:\s*([A-Za-z0-9_\-]+)/);
  if (taskNoMatch) {
    result['작업번호'] = taskNoMatch[1].trim();
  }

  // ㅇ근거 : (.+)
  const contractMatch = combinedText.match(/ㅇ근거\s*:\s*(.+)/);
  if (contractMatch) {
    const contractStr = contractMatch[1].trim();
    const bracketMatch = contractStr.match(/\(([^)]+)\)/);
    if (bracketMatch) {
      const innerVal = bracketMatch[1].trim();
      if (/[A-Za-z0-9\-_]+/.test(innerVal) && !innerVal.includes(' ')) {
        result['계약번호'] = innerVal;
        const cleanName = contractStr.replace(bracketMatch[0], '').trim();
        result['계약명'] = cleanName || contractStr;
      } else {
        result['계약명'] = contractStr;
      }
    } else {
      result['계약명'] = contractStr;
    }

    if (result['계약명'].startsWith('(') && result['계약명'].endsWith(')')) {
      result['계약명'] = result['계약명'].slice(1, -1).trim();
    }
  }

  // 날짜 및 시간 동적 추출
  // [‘\'`"]?(\d{2,4})[\.\-년]\s*(\d{1,2})[\.\-월]\s*(\d{1,2})[^0-9]*(\d{1,2}:\d{2})\s*(?:~|-)\s*(\d{1,2}:\d{2})
  const dateTimeMatch = combinedText.match(
    /[‘'`"]?(\d{2,4})[\.\-년]\s*(\d{1,2})[\.\-월]\s*(\d{1,2})[^0-9]*(\d{1,2}:\d{2})\s*(?:~|-)\s*(\d{1,2}:\d{2})/
  );

  if (dateTimeMatch) {
    const [, yRaw, mRaw, dRaw, tStart, tEnd] = dateTimeMatch;
    let year = parseInt(yRaw, 10);
    if (year < 100) year += 2000;
    const m = parseInt(mRaw, 10).toString().padStart(2, '0');
    const d = parseInt(dRaw, 10).toString().padStart(2, '0');
    result['작업일자'] = `${year}.${m}.${d}`;
    result['작업시각시작'] = tStart.length === 5 ? `${tStart}:00` : `0${tStart}:00`;
    result['작업시각종료'] = tEnd.length === 5 ? `${tEnd}:00` : `0${tEnd}:00`;
  } else {
    const dateMatch = combinedText.match(
      /[‘'`"]?(\d{2,4})[\.\-년]\s*(\d{1,2})[\.\-월]\s*(\d{1,2})/
    );
    if (dateMatch) {
      const [, yRaw, mRaw, dRaw] = dateMatch;
      let year = parseInt(yRaw, 10);
      if (year < 100) year += 2000;
      const m = parseInt(mRaw, 10).toString().padStart(2, '0');
      const d = parseInt(dRaw, 10).toString().padStart(2, '0');
      result['작업일자'] = `${year}.${m}.${d}`;
    }

    const startTMatch = combinedText.match(/작\s*업\s*시\s*작\s*[^0-9]*(\d{1,2}:\d{2})/);
    const endTMatch = combinedText.match(/작\s*업\s*종\s*료\s*[^0-9]*(\d{1,2}:\d{2})/);
    if (startTMatch) {
      result['작업시각시작'] = `${startTMatch[1].trim()}:00`;
    }
    if (endTMatch) {
      result['작업시각종료'] = `${endTMatch[1].trim()}:00`;
    }
  }

  // ㅇ목적 : ([^\n]+)
  const purposeMatch = combinedText.match(/ㅇ목적\s*:\s*([^\n]+)/);
  if (purposeMatch) {
    result['작업명'] = purposeMatch[1].trim();
  }

  result.workers = [];

  return result;
}

export function processSinglePlan(
  wordData: ParsedWorkPlan,
  fileName: string,
  excelContracts: ExcelContractRow[]
): ProcessedItem {
  const wordRaw = wordData.계약명;
  const wordNorm = normalizeText(wordRaw);

  let matchedNo = '미발견';
  let matchedName = '미발견';
  let status: '✅ 성공' | '❌ 실패' = '❌ 실패';

  const docNo = wordData.계약번호 === '미발견' ? '' : normalizeText(wordData.계약번호);
  const docName = wordRaw === '미발견' ? '' : wordNorm;
  const byNumber = docNo ? excelContracts.filter(row => normalizeText(row.계약번호) === docNo) : [];
  const exactNames = docName ? excelContracts.filter(row => normalizeText(row.계약명) === docName) : [];
  const similarNames = docName ? excelContracts.filter(row => {
    const name = normalizeText(row.계약명);
    return name && (docName.includes(name) || name.includes(docName)) && Math.min(name.length, docName.length) / Math.max(name.length, docName.length) >= 0.7;
  }) : [];
  const candidates = byNumber.length ? byNumber : exactNames.length ? exactNames : similarNames;
  let matchFailureReason = '';
  if (candidates.length === 1) {
    matchedNo = candidates[0].계약번호;
    matchedName = candidates[0].계약명;
    status = '✅ 성공';
  } else if (!excelContracts.length) matchFailureReason = '계약목록이 업로드되지 않았거나 목록이 비어 있습니다.';
  else if (!docNo && !docName) matchFailureReason = '작업절차서에서 계약번호와 계약명(근거)을 찾지 못했습니다.';
  else if (candidates.length > 1) matchFailureReason = `일치 후보가 ${candidates.length}건입니다. 계약번호·계약명을 확인해 주세요.`;
  else matchFailureReason = `계약목록에서 일치하는 항목이 없습니다. 문서 계약번호: ${wordData.계약번호}, 계약명: ${wordRaw}`;

  const workDate = wordData.작업일자;
  const tStart = wordData.작업시각시작 || '09:00:00';
  const tEnd = wordData.작업시각종료 || '18:00:00';

  let startDtStr = '미발견';
  let endDtStr = '미발견';

  if (workDate !== '미발견') {
    startDtStr = `${workDate} ${tStart}`;
    try {
      const [y, m, d] = workDate.split('.').map(Number);
      const [sh, sm, ss] = tStart.split(':').map(Number);
      const [eh, em, es] = tEnd.split(':').map(Number);

      const dtStart = new Date(y, m - 1, d, sh, sm, ss);
      let dtEnd = new Date(y, m - 1, d, eh, em, es);

      if (dtEnd <= dtStart) {
        dtEnd.setDate(dtEnd.getDate() + 1);
      }

      const ey = dtEnd.getFullYear();
      const emStr = String(dtEnd.getMonth() + 1).padStart(2, '0');
      const edStr = String(dtEnd.getDate()).padStart(2, '0');
      const ehStr = String(dtEnd.getHours()).padStart(2, '0');
      const eminStr = String(dtEnd.getMinutes()).padStart(2, '0');
      const esStr = String(dtEnd.getSeconds()).padStart(2, '0');

      endDtStr = `${ey}.${emStr}.${edStr} ${ehStr}:${eminStr}:${esStr}`;
    } catch {
      endDtStr = `${workDate} ${tEnd}`;
    }
  }

  const locationStr = wordData.위치;
  const optimizedContractNameVal = optimizeContractName(wordRaw, 20);

  let schTitle = `${locationStr} / ${wordData.작업번호} / ${optimizedContractNameVal}`;
  if (schTitle.length > 49) {
    schTitle = schTitle.substring(0, 47) + '…';
  }

  const contents = wordData.documentTitle || wordData.작업명;

  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    파일명: fileName,
    매칭상태: status,
    matchFailureReason,
    작업번호: wordData.작업번호,
    계약번호: wordData.계약번호 !== '미발견' ? wordData.계약번호 : matchedNo,
    '추출 계약명': wordRaw,
    '엑셀 원본 계약명': matchedName,
    작업일자: workDate,
    '작업명(목적)': wordData.작업명,
    작업명: wordData.작업명,
    schTitle,
    contents,
    startDate: startDtStr,
    endDate: endDtStr,
    위치: locationStr,
    rawText: wordData.rawText,
    workers: wordData.workers || [],
    workerExtractionReason: wordData.workerExtractionReason,
  };
}

export async function parseDocxFile(file: File): Promise<ParsedWorkPlan> {
  const arrayBuffer = await file.arrayBuffer();
  const [res, zip] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    JSZip.loadAsync(arrayBuffer),
  ]);
  const source = zip.file('word/document.xml');
  if (!source) throw new Error('DOCX 본문을 찾지 못했습니다.');
  const parsed = parseWorkPlanText(res.value || '');
  const document = new DOMParser().parseFromString(await source.async('string'), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) throw new Error('DOCX 본문 XML을 읽지 못했습니다.');
  const fields = extractDocumentFields(readWordTables(document));
  return { ...parsed, ...fields };
}

export async function parseExcelFile(file: File): Promise<ExcelContractRow[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const contracts: ExcelContractRow[] = [];

  const label = (value: unknown) => String(value || '').replace(/\s/g, '');
  const headerIndex = rows.findIndex(row => row?.some(value => label(value) === '계약번호') && row?.some(value => label(value) === '계약명'));
  const numberColumn = headerIndex >= 0 ? rows[headerIndex].findIndex(value => label(value) === '계약번호') : 4;
  const nameColumn = headerIndex >= 0 ? rows[headerIndex].findIndex(value => label(value) === '계약명') : 5;
  // Retain E/F row-four compatibility for the existing contract list format.
  for (let i = headerIndex >= 0 ? headerIndex + 1 : 3; i < rows.length; i++) {
    const row = rows[i];
    if (row && String(row[nameColumn] || '').trim()) {
      contracts.push({
        계약번호: String(row[numberColumn] || '미발견').trim(),
        계약명: String(row[nameColumn]).trim(),
      });
    }
  }

  return contracts;
}

export const DEFAULT_EMPLOYEES: EmployeeInfo[] = [];

export function formatTitleForKiss(title: string): string {
  if (!title) return '';
  const trimmed = title.trim();
  if (trimmed.length <= 64) return trimmed;
  return trimmed.substring(0, 63) + '…';
}

export function formatToKissTime(rawTimeStr: string, _isEnd = false): string {
  return kissDate(rawTimeStr, false) || rawTimeStr || '';
}

export { exportToKissExcel } from './kissExport';
