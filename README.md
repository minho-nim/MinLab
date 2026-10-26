# MinLab

AI 활용 프로젝트를 소개하고 개발일지·프롬프트를 보관하는 개인 아카이브입니다.

- 메인: 프로젝트별 카드, 짧은 설명, 미리보기, 개별 GitHub 저장소
- 프로젝트 페이지: 독립 앱 실행, 아카이브 복귀, 해당 프로젝트 개발일지 링크
- 기록 화면: 개발일지·실제 사용한 프롬프트
- 기록 반영: 사용자 업데이트 요청 → Codex 기록 작성 → GitHub 배포 → 목록에 직접 표시
- JSON 백업·복원과 기존 변경 내역의 프롬프트 기록 변환

## 저장소 구조

MinLab은 아카이브와 기록만 맡습니다. ChoicePilot·NutriFit 등 앱의 소스와 배포는 각 저장소에서 관리합니다. 프로젝트 목록·앱 주소는 [archive.config.json](./archive.config.json)에 등록합니다.

[전체 설정 안내](./docs/archive-setup.md) · [Codex 기록 형식](./docs/codex-records.md)

## 실행

```sh
npm install
npm run dev
```

```sh
npm run typecheck
npm run test:links
node --import tsx --test src/utils/archive.test.ts
npm run build
```

## Codex 기록 반영

사용자가 개발일지 업데이트를 별도로 요청할 때만 Codex가 [`.minlab/records.json`](./.minlab/records.json)에 지정한 범위의 작업과 요청 원문을 기록합니다. `AGENTS.md`가 이 규칙을 안내합니다. `npm run records:sync`는 작성된 기록을 게시 데이터로 변환하며 개발 서버·빌드에서도 실행됩니다. GitHub `main`에 업로드하면 기존 Pages 배포에서 개발일지·프롬프트 목록에 바로 반영됩니다. 검토·저장 조작은 필요하지 않습니다.

별도 AI API 키나 AI 서버는 필요 없습니다. 주기적 커밋 수집은 제거했으며 기존 작성분은 소급 생성하지 않습니다. 다른 채팅·커밋에서 프롬프트를 추측하지 않습니다. 확인되지 않은 테스트 결과도 작성하지 않습니다.

## 데이터 보관

2026-10-22에 제공한 JSON 백업을 사이트 기본 아카이브로 포함합니다. 프로젝트 5개, 개발 기록 10건, 프롬프트 7건을 새 브라우저에서도 볼 수 있습니다. 기존 브라우저에는 기본 백업을 한 번 병합하며 이후 작성한 기록과 수정 내용을 보존합니다.

게시 기록은 목록에서 바로 볼 수 있으며 브라우저에 중복 없이 연결됩니다. 브라우저에서 직접 추가·수정한 내용과 삭제는 보존하며 GitHub로 자동 업로드되지는 않습니다. PC나 브라우저를 바꿀 때는 JSON 백업·복원을 사용하세요.

GitHub에는 소스, 명시적으로 선택한 기본 백업, 공개용 Codex 원본과 게시 데이터를 보관합니다. 화면에는 원본·배포 링크를 표시하지 않으며, 파일 위치는 [운영 메모](./docs/record-maintenance.md)에 따로 정리합니다. 요청 원문에 비밀키·민감정보를 포함하지 마세요.

## 사이트

- 저장소: https://github.com/minho-nim/MinLab
- 아카이브: https://minho-nim.github.io/MinLab/
- 개발일지: https://minho-nim.github.io/MinLab/#/development-log
