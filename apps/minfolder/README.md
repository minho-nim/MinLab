# MinFolder | MinLab 내장 앱

이 디렉터리의 소스는 MinLab의 apps/minfolder에 둡니다.

1. ZIP의 apps와 scripts 폴더를 MinLab 저장소 최상위에 병합합니다.
2. 루트 package.json의 build 한 줄만 아래처럼 변경합니다.

```json
"build": "vite build && vite build --config vite.schedule.config.ts && node scripts/copy-minfolder.mjs"
```

3. main에 커밋한 후 기존 GitHub Actions Pages 배포가 성공하면
   https://minho-nim.github.io/MinLab/apps/minfolder/ 에서 열 수 있습니다.

새 저장소와 Pages 설정 변경은 필요 없습니다. 기존 공사 일정 앱과 포트폴리오 배포는 유지합니다.
MinFolder는 정적 HTML, CSS, JS이므로 의존성 없이 기존 빌드의 마지막에 복사됩니다.
MinLab 홈에 바로가기 또는 카드를 추가하는 작업은 포함하지 않습니다.

Chrome 또는 Edge에서 원본과 저장 폴더를 각각 연결합니다.
연결된 원본 폴더에서 가져온 항목은 승인 후 이동, 탐색기에서 직접 놓은 항목은 승인 후 복사합니다.
회사 파일과 계약 목록은 저장소에 올리지 않습니다.

분류 테스트는 루트에서 node --test apps/minfolder/tests/core.test.js 로 실행합니다.
