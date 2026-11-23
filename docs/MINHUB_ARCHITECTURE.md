# MINIHUB — 공통 플랫폼 구축 및 앱 연동 계획
작성일: 2026-11-23
상태: 방향 확정, 구현 전

## 결정
- **확정 명칭은 MINIHUB (미니허브)**. 이전 문서의 MINHUB는 폐기 명칭.
- 기존 `minho-nim/minially` 저장소를 `minho-nim/minihub`로 이름 변경하는 안을 채택하며, 기존 Minially 기능을 `apps/minially`, 신규 MINILOG를 `apps/minilog`로 분리하는 모노레포를 목표로 한다.
- 공통 코드는 `packages/auth`, `packages/ai`, `packages/ui` 등으로 분리하고 Cloudflare Worker 및 앱별 배포·데이터 접근은 독립적으로 유지한다.
- 저장소 이름 변경, 폴더 이동, Cloudflare 프로젝트 생성은 **아직 실제 수행 전**. 기존 데이터와 배포 경로를 확인하고 단계적으로 작업할 것.
- MINIHUB를 사용자 C, D를 위한 **상위 공통 플랫폼**으로 신설한다.
- 공통 기능: 로그인/세션, 사용자별 Gemini API 키 관리, 앱 런처, AI 호출량 계측.
- 연결 앱: Minially (기존 테스트 배포, 아직 실사용 전), MINILOG (사진 기반 네이버 블로그), Minoffia (추후 운영 모니터).
- Minially와 MINILOG의 콘텐츠 데이터는 반드시 독립 저장. 통합 로그인은 데이터를 합치는 것이 아니다.
- 사용자 C = Google 계정 C + Gemini 키 C, 사용자 D = Google 계정 D + Gemini 키 D. 각자 동일 키를 Minially와 MINILOG에서 사용. 다른 사용자의 키로 호출 불가.
- MINIHUB 상위 Pages 프로젝트는 별도로 구성하고 기존 Minially Pages 이름/URL은 새 배포 검증 전까지 유지한다. 개별 앱 배포 단위 유지.
- Supabase 사용하지 않음. Cloudflare Workers/Pages Functions, D1, R2(사진), Gemini API를 사용. 동일 Cloudflare 계정의 무료 사용량 공유.

## 실제 확인된 Minially 현황 (2026-11-23)
- 저장소: https://github.com/minho-nim/minially
- 운영 사이트: https://minially.pages.dev
- Cloudflare Pages는 release 브랜치로 운영 배포.
- 기존 로그인은 사용자별 **로그인 코드**; 코드 원문 대신 SHA-256 해시를 서버가 보관하고, D1 데이터 공간을 구분.
- 일정·메모 등은 브라우저 IndexedDB와 서버 D1 동기화.
- 테스트 배포 상태, 실제 사용 전. 그렇더라도 기존 D1 및 IndexedDB 테스트 데이터 백업 후 인증 구조 변경.
- 기존 Minially 코드와 배포를 유지하며 공통 인증 모듈을 단계적으로 연결.

## 구성
- MINIHUB UI: 2인 인증, 자신의 Gemini 키 연결/교체/삭제, Minially/MINILOG 링크, 개인 기본 사용량.
- MINIHUB 인증 Worker: 세션 발급/갱신/해제, 본인 ID, 권한 검사, 로그인 시도 횟수 제한. Minially 코드 로그인에서 이전할 수 있는 안전한 경로 제공.
- 개인 키 보관: D1에 사용자별 암호문(AES-GCM), nonce 및 키 버전. 서버 Secret에 마스터 키. 키 원문 브라우저/로그/공개 저장소에 저장·재노출 금지.
- 앱별 API: Minially와 MINILOG는 별도 Worker/Pages Functions 및 독립 스토리지 바인딩. MINIHUB 인증 검증 후 권한 확인. Gemini 호출은 개인별 키로 수행.
- 사용량 기록: app_id, user_id, provider_project_label, model, task, input/output tokens, status, latency, estimated_cost, created_at.
- MINILOG 대시보드: 로그인한 사람 자신의 MINILOG/합산 AI 사용량, 원고/협찬 실적, 사진 저장·삭제 현황.
- Minoffia 통합 운영 대시보드: 프로젝트 전체 및 사용자별 상세 **운영 집계**. 키·사진·본문·협찬 원문은 전달하지 않음.
- 보안: 서로 다른 pages.dev 서브도메인 간 쿠키 공유 가정 금지. 각 앱에서 공통 인증 서버를 사용하는 인증 교환/리다이렉트 설계, CSRF/CORS 보호, 짧은 세션, 역할 기반 접근.

## 개발 순서
1. Minially 로그인/동기화 코드와 D1 스키마 백업·검토; 테스트 로그인 코드/데이터 보존.
2. 기존 `minially` 저장소의 백업 태그/브랜치를 만든 후 `minihub`로 이름 변경하고, 기존 앱을 `apps/minially`로 이동. MINILOG 소스/명세를 `apps/minilog`로 이관. 이후 MINIHUB 공통 로그인과 Cloudflare Pages 프로젝트 준비.
3. 사용자 C/D 별도 키를 안전하게 등록하는 공통 Gemini 키 보관 및 호출 계층 구현.
4. Minially를 MINIHUB 계정으로 로그인할 수 있게 전환. 기존 동기화 기능 회귀 테스트.
5. MINILOG를 MINIHUB 인증 기반 신규 앱으로 구축 (MinLab/apps/minilog 소스, 별도 Cloudflare API/DB/R2).
6. 개인별 AI 사용량 수집 및 MINILOG 개인 대시보드.
7. Minoffia 통합/개별 운영 모니터링 연동 (서버 간 인증·읽기 전용 집계 API).

## 초기 완료 기준
- 사용자 C/D 모두 MINIHUB 로그인 성공.
- 동일 개인 계정으로 Minially/MINILOG 접근 가능; 각자의 Gemini API 키로만 AI 요청.
- 상대방의 일정/원고/사진/키 접근 불가.
- 기존 Minially 일정·메모 동기화가 기존 테스트 시나리오에서 정상 동작.
- 무료 리소스 사용량 계측 및 실패 시 안내.
