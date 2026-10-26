import mammoth from 'mammoth';
import { kissDate } from './kissExport';
import { extractDocumentFields, readDocumentTables } from './docxTables';
import * as XLSX from 'xlsx';
import {
  ParsedWorkPlan,
  ProcessedItem,
  ExcelContractRow,
  EmployeeInfo,
  WorkerInfo,
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

  // 작업자 / 비상연락망 / R&R 파싱
  const workers: WorkerInfo[] = [];
  const lines = combinedText.split('\n');
  const phoneRegex = /(01[016789][-\s.]?\d{3,4}[-\s.]?\d{4})/;
  const roleKeywords = [
    '작업책임자',
    '현장대리인',
    '안전관리자',
    '화기감시자',
    '신호수',
    '유도원',
    '공사담당자',
    '작업원',
    '작업자',
    '반장',
    '소장',
    '팀장',
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const phoneMatch = trimmed.match(phoneRegex);
    if (phoneMatch) {
      const phone = phoneMatch[1].replace(/[\s.]/g, '-');

      let foundRole = '작업원';
      for (const r of roleKeywords) {
        if (trimmed.includes(r)) {
          foundRole = r;
          break;
        }
      }

      let foundCompany = '협력사';
      const companyMatch = trimmed.match(
        /(?:주식회사|\(주\)|주\)|[가-힣A-Za-z0-9]{2,15}(?:통신|전기|건설|이엔지|ENG|정보|네트워크|시스템|테크|설비|엔지니어링|기술))/
      );
      if (companyMatch) {
        foundCompany = companyMatch[0];
      }

      let foundName = '';
      const nameMatch = trimmed.match(/([가-힣]{2,4})(?:\s*[\(\/]|[\s:]*010)/);
      if (nameMatch && !roleKeywords.includes(nameMatch[1])) {
        foundName = nameMatch[1];
      } else {
        const tokens = trimmed.replace(phone, '').split(/[\s,:\(\)\[\]\/]+/);
        for (const t of tokens) {
          if (
            /^[가-힣]{2,4}$/.test(t) &&
            !roleKeywords.includes(t) &&
            !t.includes('공사') &&
            !t.includes('작업') &&
            !t.includes('팀')
          ) {
            foundName = t;
            break;
          }
        }
      }

      workers.push({
        rr: foundRole,
        company: foundCompany,
        name: foundName || '현장작업자',
        phone,
      });
    }
  }

  // 중복 제거
  const uniqueWorkers: WorkerInfo[] = [];
  const seen = new Set<string>();
  for (const w of workers) {
    const key = `${w.name}-${w.phone}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueWorkers.push(w);
    }
  }

  result.workers = uniqueWorkers;

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

  for (const row of excelContracts) {
    const excelRaw = String(row.계약명 || '');
    const excelNorm = normalizeText(excelRaw);

    if (wordNorm && excelNorm) {
      if (
        wordNorm === excelNorm ||
        (wordNorm.includes(excelNorm) && wordNorm.length >= excelNorm.length * 0.7) ||
        (excelNorm.includes(wordNorm) && excelNorm.length >= wordNorm.length * 0.7)
      ) {
        matchedNo = row.계약번호;
        matchedName = excelRaw;
        status = '✅ 성공';
        break;
      }
    }
  }

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
  };
}

export async function parseDocxFile(file: File): Promise<ParsedWorkPlan> {
  const arrayBuffer = await file.arrayBuffer();
  const [res, html] = await Promise.all([
    mammoth.extractRawText({ arrayBuffer }),
    mammoth.convertToHtml({ arrayBuffer }),
  ]);
  const text = res.value || '';
  const parsed = parseWorkPlanText(text);
  const document = new DOMParser().parseFromString(html.value, 'text/html');
  const fields = extractDocumentFields(readDocumentTables(document));
  return { ...parsed, ...fields };
}

export async function parseExcelFile(file: File): Promise<ExcelContractRow[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const contracts: ExcelContractRow[] = [];

  // In the user's python code:
  // df_raw = pd.read_excel(excel_path, header=None)
  // df_data = df_raw.iloc[3:].copy()
  // df_data = df_data[[4, 5]].dropna(subset=[5])
  // df_data.columns = ['계약번호', '계약명']
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[5]) {
      contracts.push({
        계약번호: String(row[4] || '미발견').trim(),
        계약명: String(row[5]).trim(),
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
