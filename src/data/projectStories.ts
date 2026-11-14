/** Public case-study copy; dated metrics and development logs stay at the source. */
export const projectStories: Record<
  string,
  {
    url: string;
    problem: string;
    changes: { before: string; after: string }[];
  }
> = {
  "proj-minlab-ai-office": {
    url: "https://minlab-ai-office.pages.dev/portfolio",
    problem:
      "여러 AI 사이를 오가며 글을 옮기고, 같은 설명을 반복하고, 결과도 혼자 확인해야 했습니다. 요청과 승인은 사람이 맡고 나머지는 역할을 나눈 AI에게 맡기고 싶었습니다.",
    changes: [
      {
        before: "AI마다 같은 내용을 다시 설명하고 결과를 옮겼습니다.",
        after: "한곳에서 요청을 접수하고 기획·개발·검토를 나눠 맡깁니다.",
      },
      {
        before: "배정한 일과 실제로 실행된 일을 구분하기 어려웠습니다.",
        after: "업무 상태와 승인 기록을 따로 남기고 확인한 상태를 보여 줍니다.",
      },
    ],
  },
  "proj-minially": {
    url: "https://minially.pages.dev/portfolio",
    problem:
      "달력 앱, 할 일 앱, 자주 쓰는 메모가 따로 있었습니다. PC에서는 바로 열어 쓰고, 휴대폰과는 기록을 따로 옮기지 않아도 맞춰지길 바랐습니다.",
    changes: [
      {
        before: "일정과 할 일을 다른 앱에서 확인했습니다.",
        after: "날짜를 누르면 그날 일정과 할 일을 함께 봅니다.",
      },
      {
        before: "자주 쓰는 일정 이름을 매번 다시 적었습니다.",
        after: "자주 쓰는 문구를 프리셋으로 저장해 눌러서 넣습니다.",
      },
      {
        before: "PC와 휴대폰 기록이 따로 있었습니다.",
        after: "같은 코드로 로그인하면 두 기기의 기록을 자동으로 맞춥니다.",
      },
    ],
  },
};
