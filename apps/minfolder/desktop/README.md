# MinFolder Windows

MinFolder를 Windows 설치형 앱으로 실행하는 별도 진입점입니다. 기존 GitHub Pages 버전은 유지하며 작업 일정 앱은 변경하지 않습니다.

## 사용 흐름

1. 기준 폴더를 선택합니다. 다음 실행에서는 마지막 경로를 다시 연결합니다.
2. 폴더 지도에서 `+`로 하위 폴더를 펼치고, 폴더 이름을 눌러 파일을 확인합니다.
3. 파일명을 클릭하면 Windows 기본 프로그램으로 엽니다. `폴더 열기`는 탐색기로 해당 위치를 엽니다. Office, 한글, PDF, 텍스트, 이미지와 일부 미디어·ZIP을 지원하며 실행 파일·스크립트·바로가기는 앱에서 실행하지 않습니다.
4. 파일 옆 `분류` 또는 선택 후 `선택 파일 추천`으로 파일명에 맞는 목적지를 추천받습니다. 파일을 폴더 상자로 끌어도 목적지를 지정할 수 있습니다.
5. 탐색기에서 파일을 폴더 상자나 파일 분류 영역으로 놓으면 **복사 대신 실제 이동**할 항목으로 추가됩니다. 파일 선택 버튼으로 추가할 수도 있습니다.
6. 추천·지정 경로를 확인하고 `선택 파일 이동 승인`을 누릅니다. 최종 확인에서 취소하면 이동하지 않습니다.

같은 이름의 파일·폴더는 덮어쓰지 않습니다. 실패한 항목은 대기 목록에 남습니다. 원본이 바뀌면 새로고침 후 다시 추가하고, 목적지가 바뀌면 다시 선택하세요. 이동 기록은 로컬에 최근 100건 저장하며 화면에는 최근 30건을 표시합니다. 자동 되돌리기는 이 버전에 포함하지 않습니다.

## 탐색과 추천

- 시작 시 기준 폴더 한 페이지와 처음 16개 상위 폴더의 한 페이지만 읽습니다. 모든 하위 폴더를 재귀적으로 읽지 않습니다.
- 폴더는 요청당 최대 100개 항목을 읽습니다. `다음 항목 보기`로 이어서 읽습니다. 화면의 트리 표시는 최대 450개 노드로 제한합니다.
- 읽은 폴더는 실행 중 메모리에서 재사용합니다. 디스크에 전체 폴더 지도를 저장하거나 실시간 파일 시스템 감시를 수행하지 않습니다. 외부 변경은 `선택 폴더 새로고침`으로 반영합니다.
- 검색은 이미 불러온 폴더 이름만 대상으로 합니다. Everything처럼 드라이브 전체 인덱스를 만들지 않습니다.
- `../core.js`의 기존 파일명 규칙을 재사용합니다. `계약별공사자료 → 계약·팀 → 문서 종류`와 공통 회계·총괄장 폴더를 매칭합니다. 관련 가지를 추가로 읽되 한 가지당 최대 5페이지로 제한하고, 모호하거나 범위가 불완전하면 직접 선택하도록 합니다.
- 파일 내용은 추천에 사용하지 않습니다. 내용을 읽는 경우는 다른 드라이브로 실제 이동하며 복사 내용을 확인할 때입니다.

## 파일 처리와 공유폴더

폴더 경로·파일명·이동 기록을 외부 서버로 전송하지 않습니다. Windows에 로그인한 계정의 권한을 사용하며 SMB 암호나 별도 회사 계정을 저장하지 않습니다. 네트워크 공유는 Windows에서 접근 가능한 경로를 폴더 선택기로 지정합니다. 회사의 프로그램 실행·DLP·공유폴더 정책을 우회하지 않습니다.

같은 볼륨에서는 Windows의 덮어쓰기 없는 이동을 사용합니다. 다른 볼륨에서는 새 파일을 생성하고 내용을 복사·동기화·검증한 뒤 원본을 삭제합니다. Windows에서는 복사 중 원본·복사본의 동시 쓰기와 삭제를 제한하고 검증한 원본 핸들로 삭제를 요청합니다. 사용 중인 파일이나 SMB 서버가 해당 동작을 지원하지 않으면 원본을 유지하고 오류를 표시합니다. 중단 시 목적지에 복사본이 남을 수 있으며 메시지에서 확인을 안내합니다. 이동 전 원본·목적지의 파일 ID를 다시 확인하고 연결 폴더·재분석 지점은 제외합니다.

공유폴더의 이동은 다른 사용자에게도 영향을 줍니다. 실제 회사 환경의 권한, 파일 잠금, 서버 성능 및 복구 정책은 별도의 테스트 폴더에서 검증해야 합니다. 현재 Windows 실기기·회사 SMB 서버에서의 수동 검증은 완료하지 않았습니다. 이동 기록에는 경로가 남으며 `기록 지우기`로 현재 기준 폴더의 기록을 삭제할 수 있습니다.

## Windows 개발 및 설치 파일 생성

필요 환경: Node.js 22 이상, Rust stable, Visual Studio Build Tools의 C++ 데스크톱 개발 도구와 Windows SDK, Microsoft Edge WebView2. 자세한 준비는 [Tauri Windows prerequisites](https://v2.tauri.app/start/prerequisites/#windows)를 참고하세요.

저장소 루트에서:

```powershell
npm ci --prefix apps/minfolder/desktop
npm --prefix apps/minfolder/desktop run desktop:dev
npm --prefix apps/minfolder/desktop run desktop:build
```

설치 파일은 `apps/minfolder/src-tauri/target/release/bundle/nsis/`에 생성됩니다. 코드 서명은 설정하지 않았습니다. 회사 정책상 서명된 앱만 허용한다면 배포 전에 조직의 서명·승인 절차가 필요합니다.

`.github/workflows/minfolder-desktop.yml`은 PR 또는 수동 실행에서 화면 검사, Windows 파일 처리 테스트와 NSIS 빌드를 실행하고 설치 파일을 Actions 아티팩트로 남깁니다. 공개 사이트를 배포하거나 GitHub Release를 게시하지 않습니다.

## 검증

```powershell
npm --prefix apps/minfolder/desktop test
npm --prefix apps/minfolder/desktop run build
npx --prefix apps/minfolder/desktop playwright install chromium
npm --prefix apps/minfolder/desktop run test:browser
cargo test --manifest-path apps/minfolder/src-tauri/Cargo.toml --lib
```

GUI 라이브러리가 없는 환경에서는 `cargo test --manifest-path apps/minfolder/src-tauri/Cargo.toml --no-default-features --lib`로 파일 처리만 검사할 수 있습니다. 브라우저 검사는 Tauri 호출을 대체한 화면 통합 검사이며, Windows 기본 프로그램 실행·탐색기의 실제 OS 드롭·SMB 성능 검증을 대신하지 않습니다. 시스템 Chromium을 쓰려면 `CHROMIUM_PATH`를 지정합니다.
