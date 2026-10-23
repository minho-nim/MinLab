# MinLab

AI 활용 프로젝트를 소개하고 개발일지·프롬프트를 보관하는 개인 아카이브입니다.

- 메인: 프로젝트별 카드, 짧은 설명, 미리보기, 개별 GitHub 저장소
- 프로젝트 페이지: 독립 앱 실행, 아카이브 복귀, 해당 프로젝트 개발일지 링크
- 기록 화면: 개발일지·실제 사용한 프롬프트·GitHub 기록 초안
- 자동 수집: 공개 저장소 커밋·병합 PR → GitHub Actions → Gemini 초안 → 검토 후 저장
- JSON 백업·복원과 기존 변경 내역의 프롬프트 기록 변환

## 저장소 구조

MinLab은 아카이브와 기록만 맡습니다. ChoicePilot·NutriFit 등 앱의 소스와 배포는 각 저장소에서 관리합니다. 프로젝트 목록·앱 주소·수집 대상은 [archive.config.json](./archive.config.json)에 등록합니다.

[전체 설정 안내](./docs/archive-setup.md) · [프롬프트 기록 형식](./docs/prompt-log.example.json)

## 실행

```sh
npm install
npm run dev
```

```sh
npm run typecheck
npm run test:links
node --test scripts/sync-records.test.mjs
node --import tsx --test src/utils/archive.test.ts
npm run build
```

## 자동 입력 설정

MinLab 저장소의 Actions Secret에 `GEMINI_API_KEY`를 등록하고 **Collect GitHub record drafts** 워크플로를 실행합니다. 이후 6시간마다 `archive.config.json`의 `recordsSince` 이후이면서 최근 30일 내인 변경만 수집합니다. 기존 작성분은 제외하며, 새 초안은 요약·주요 변경·수정 이유·확인 결과·다음 작업으로 정리합니다. 키가 없으면 연결 안내만 표시하고 커밋 제목 나열은 생성하지 않습니다.

실제로 사용한 프롬프트는 각 공개 프로젝트의 `.minlab/prompts.json` 파일에서 원문을 가져옵니다. 커밋 내용으로 프롬프트를 추측하지 않습니다. 비공개 저장소의 기록은 공개 초안으로 수집하지 않습니다.

## 데이터 보관

2026-10-22에 제공한 JSON 백업을 사이트 기본 아카이브로 포함합니다. 프로젝트 5개, 개발 기록 10건, 프롬프트 7건을 새 브라우저에서도 볼 수 있습니다. 기존 브라우저에는 기본 백업을 한 번 병합하며 이후 작성한 기록과 수정 내용을 보존합니다.

이후 작성하는 개인 기록은 현재 브라우저의 LocalStorage에 저장됩니다. 공개 GitHub 초안을 확인·수정해 저장할 수 있으며, 이렇게 저장한 개인 데이터가 GitHub로 자동 업로드되지는 않습니다. PC나 브라우저를 바꿀 때는 JSON 백업·복원을 사용하세요.

GitHub에는 소스, 명시적으로 선택한 기본 백업, 공개용 초안 파일을 배포합니다. API 키는 Secret에 보관하며 프런트엔드에 포함하지 않습니다.

## 사이트

- 저장소: https://github.com/minho-nim/MinLab
- 아카이브: https://minho-nim.github.io/MinLab/
- 개발일지: https://minho-nim.github.io/MinLab/#/development-log
