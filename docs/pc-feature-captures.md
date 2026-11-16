# 대표 프로젝트 PC 화면 촬영

2026-11-16, Minoffia와 Minially의 기본 기능 미리보기를 PC 화면 5장씩으로 교체했습니다. 기존 미디어 ID와 첫 대표 화면 선택을 유지하며 과거 WebP 파일도 삭제하지 않았습니다. 사용자 이미지·프로젝트 원본·개발일지·JSON 형식은 변경하지 않았습니다.

## 실행한 원본

- Minoffia: `minho-nim/minoffia`의 `c2a7452c8301afa30115adbdf44feee4bcfc661a`, v0.7.20
- Minially: `minho-nim/minially`의 `bf9b6ffd25d70c98ab361fec3799f0d9f4d20455`, package.json 0.0.0
- 별도 임시 체크아웃에서 원본을 수정하지 않고 production build 후 Vite preview로 실행했습니다. 설치된 의존성은 각각 lockfile의 176개·660개 패키지 항목(version/resolved/integrity)이 일치함을 대조했습니다. 두 앱의 빌드는 성공했습니다. 다른 저장소에 변경·배포하지 않았습니다.

## 촬영 방법과 실제 확인 범위

Chromium, 1440×1000, 한국어·Asia/Seoul, reduced motion 환경입니다. 앱의 `/demo`를 새 브라우저에서 열어 실제 버튼과 입력창으로만 조작했습니다. 로컬 이외 요청은 차단했습니다. 관찰된 외부 요청은 Google Fonts이며 기본 글꼴로 표시됩니다. 계정 로그인·실제 사용자 데이터·유료 AI·클라우드 API는 사용하지 않았습니다.

- Minially: 월간 달력 → 16일 선택 → 일정 등록 → 공부 분류 → ‘예시 일정’ 입력 → 프리셋 ‘영어’, ‘학원’ 선택 → 등록. ‘예시 일정 영어 학원’이 날짜 목록에 저장되고 주간 달력에도 표시되는 것을 확인했습니다. 할 일 목록의 기본 완료·미완료 표시를 촬영했습니다. 날짜 이동·완료 상태 변경·동기화·알림·설치 시험은 수행하지 않았습니다.
- Minoffia: 사무실 → MuscleMap 로그인 버튼 수정이라는 예시 요청 입력 → 대상 확인·접수 → 제안된 4개 스킬 선택. 별도의 ‘체험 업무 시작’에서 `[체험] 로그인 버튼 색 바꾸기` 기획서를 열고 기획 승인 → 로컬 데모 결과 검토 → 결과 승인 → 데모 PR·CI 확인 단계 진입을 확인했습니다. 배포 승인은 누르지 않았습니다. 결과·평가 점수·PR·CI는 데모가 미리 정한 예시이며 실제 AI 성능·시험 결과·GitHub 작업으로 해석할 수 없습니다. 담당 AI 화면도 같은 데모 세션에서 촬영했습니다.

전체 화면은 viewport screenshot, 입력창·기획서·접수 메시지는 실제 DOM element screenshot, 결과 검토는 업무 제목부터 승인 영역까지 native screenshot clip으로 촬영했습니다. 이미지를 합성하거나 글자를 덮지 않았습니다. JPEG 저장 외 후처리는 없습니다.

## 파일

| 파일                       | 픽셀      | SHA-256                                                            |
| -------------------------- | --------- | ------------------------------------------------------------------ |
| `minially-pc-calendar.jpg` | 1440×1000 | `59fb2ea00d0c7c2de9f53bfc186ddf1f807bfe83c9f258f552506c6a3599442c` |
| `minially-pc-presets.jpg`  | 576×429   | `f81b3f3db575c2bf3ff9b88934fe61ab418a4ae47959bf5ab32bcc01e2c3af3e` |
| `minially-pc-register.jpg` | 576×138   | `e7987565be2414fb1a7fac774c5afe10562e1a09d323ace5c046d55dfd0cb5cc` |
| `minially-pc-tasks.jpg`    | 1440×1000 | `74bf1d79fdd504e7d5521db50fa34856f51d8a4e73f12617cfbcc0ff9c54fcc4` |
| `minially-pc-week.jpg`     | 1440×1000 | `9c2ddcf42aa8a249f7da6ed5c88be702c690407d54da674bacf2c44d61197897` |
| `minoffia-pc-intake.jpg`   | 486×367   | `f015bc3c5e93aacd77fee70235cc6a09d39abdc1ff9af5bfda5a1869ce7a8b6a` |
| `minoffia-pc-office.jpg`   | 1440×1000 | `ed3174350d288eb682fdec693afc8ee5d9ed5ba2158746cb01f1bd3e34073f69` |
| `minoffia-pc-plan.jpg`     | 457×220   | `06796e5c48df7d86374f884c910c6ef0ff76556b83e770cdb5a5c6481e78d8bc` |
| `minoffia-pc-result.jpg`   | 515×310   | `cb94228d68a3e50c7210e6f5c9dd278e02cb3a8cd3a780a50208dd63e8bae790` |
| `minoffia-pc-team.jpg`     | 1440×1000 | `154d7cfd40381a59d14eb82ace4f7c9b6f2a0e13f9f0165417af937ebbf2cc32` |

## MinLab 반영 검증

- 프런트엔드 production build와 src 범위 TypeScript 검사 성공. 전체 빌드의 업무 일정 앱 검사는 원격 CI에서 확인합니다.
- 기존 단위 검사 11개 통과.
- case-studies 브라우저 검사: 320/390/768/1024/1440px에서 기존 진입·대표작·MINOVA 기능/스크롤 선택·확대 Esc/초점·About 연결·데이터 보존 통과.
- media 브라우저 검사: 반응형 이미지 우선순위, 지연 로딩, 고정된 로딩/오류 공간, 확대 키보드·스와이프·줌과 경로/스크롤/데이터 보존 통과. 기존 네트워크 지연 가로채기가 WebP만 대상으로 하여 새 JPEG가 즉시 로드되던 검사 실패를 확인했고, 이미지 형식을 JPEG/PNG까지 포함해 다시 통과했습니다.
- 대표작 두 개의 기능 5개씩을 1024/1440/1920px에서 직접 선택해 파일·설명·선택 강조가 함께 바뀌는지, 연결된 기존 기록과 브라우저 뒤로 가기, 제작 과정 2개씩, 가로 넘침과 사용자 데이터 불변을 확인했습니다. 1440px 실화면도 육안 검토했습니다.
- 로컬 Chromium은 샌드박스 socket 제한으로 일반 실행이 실패해 허용된 브라우저 실행 권한으로 검사를 수행했습니다.
