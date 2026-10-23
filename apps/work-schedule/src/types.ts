export interface WorkerInfo {
  rr: string;        // R&R (구분/역할: 작업책임자, 안전관리자, 현장대리인, 작업원, 신호수 등)
  company: string;   // 회사명 (소속 협력사/업체명)
  name: string;      // 이름 (성명)
  phone: string;     // 연락처 (휴대폰 번호)
}

export interface ParsedWorkPlan {
  작업번호: string;
  계약번호: string;
  계약명: string;
  작업일자: string;
  작업시각시작: string;
  작업시각종료: string;
  작업명: string;
  위치: string;
  rawText?: string;
  documentTitle?: string; // DOCX 첫 표의 작업명 값
  workers?: WorkerInfo[]; // 현장 작업자/비상연락망 목록
}

export interface ExcelContractRow {
  계약번호: string;
  계약명: string;
}

export interface ProcessedItem {
  sourceFile?: File; // 업로드한 원본 파일: 현재 브라우저 메모리에서만 보관
  id: string;
  파일명: string;
  파일절대경로?: string;
  매칭상태: '✅ 성공' | '❌ 실패';
  작업번호: string;
  계약번호: string;
  '추출 계약명': string;
  '엑셀 원본 계약명': string;
  작업일자: string;
  '작업명(목적)': string;
  작업명: string;
  schTitle: string;
  contents: string;
  startDate: string;
  endDate: string;
  위치: string;
  rawText?: string;
  dt?: Date;
  workers?: WorkerInfo[]; // 현장 작업자/비상연락망 (회사명, R&R, 이름, 연락처)
}

export interface KissExcelOptions {
  calTitle: string;        // 캘린더(ID).캘린더명 (예: (작업일정(TEST)))
  createId: string;        // 등록자(ID) (시스템 업로드용 계정: demo1)
  schUserIdList: string;   // 참여자(ID) (시스템 업로드용 계정: demo1; demo2)
  alldayYn: 'Y' | 'N';     // 종일여부
  fileName?: string;       // 파일명
}

export interface EmployeeInfo {
  사원번호: string;
  부서명: string;
  직급명: string;
  사원명: string;
  사원ID: string;
}
