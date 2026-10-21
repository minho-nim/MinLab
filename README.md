MinLab

프로젝트별 주요 기능, 개발 이력 및 변경 사항을 관리하는 웹 애플리케이션입니다.

주요 기능

프로젝트 및 주요 기능 관리

개발 기록과 버전 이력 관리

JSON 데이터 백업 및 복원

브라우저 LocalStorage 기반 데이터 보존

GitHub 연동 및 GitHub Pages 배포

개발 환경

Node.js

React

Vite

TypeScript

로컬 실행

프로젝트 의존성 설치

npm install

개발 서버 실행

npm run dev

터미널에 표시되는 로컬 주소로 접속

데이터 관리

프로젝트 데이터는 브라우저 LocalStorage에 저장됩니다. 다른 브라우저나 PC에서 데이터를 이전할 때는 JSON 백업 파일을 생성한 뒤 복원 기능을 사용합니다.

GitHub 저장소에는 소스 코드가 저장되며, 브라우저에 저장된 프로젝트 데이터가 자동으로 업로드되지는 않습니다.

배포

GitHub 저장소: https://github.com/minho-nim/MinLab

배포 사이트: https://minho-nim.github.io/MinLab/