import type { Config } from "tailwindcss";

// 디자인 규칙: docs/DESIGN_SYSTEM.md. 간격·크기는 정수 Tailwind 단위(1 = 4px)를 사용한다.
// 카드 p-3, 폼 gap-3, 버튼 아이콘 gap-2, 보조문구 mt-1, 섹션 p-5 ~ p-6.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 타이포 스케일 — docs/WORKING_AGREEMENT.md §2에 문서화된 크기·굵기 위계를 실제 Tailwind
      // 토큰으로 정리한 것. text-heading-xl처럼 쓰면 font-size/line-height/font-weight가 함께 적용된다.
      // line-height는 한글 가독성을 고려해 정함(작은 글자일수록 상대적으로 더 넉넉하게).
      fontSize: {
        "heading-xl": ["28px", { lineHeight: "40px", fontWeight: "600" }], // 페이지 제목
        "heading-lg": ["22px", { lineHeight: "32px", fontWeight: "500" }], // 섹션 제목
        "heading-md": ["18px", { lineHeight: "28px", fontWeight: "500" }], // 카드/모달 제목
        body: ["14px", { lineHeight: "20px", fontWeight: "400" }], // 기본 본문
        small: ["13px", { lineHeight: "20px", fontWeight: "400" }], // 보조 본문
        "card-company": ["13px", { lineHeight: "20px", fontWeight: "500" }], // 지원 카드의 회사명
        label: ["12px", { lineHeight: "16px", fontWeight: "500" }], // 폼 라벨, 보조 문구
        caption: ["11px", { lineHeight: "16px", fontWeight: "400" }], // 카드 내 캡션(날짜 등)
        badge: ["10px", { lineHeight: "12px", fontWeight: "500" }], // 플랫폼/상태 뱃지
        "illustration-xs": ["6px", { lineHeight: "8px" }], // aria-hidden 목업 전용
        "illustration-sm": ["8px", { lineHeight: "12px" }], // aria-hidden 목업 전용
      },
      // 모서리 — 기존 rounded-lg(8px, 버튼·입력)/rounded-md(6px)는 Tailwind 기본값 그대로 쓰고,
      // 카드·모달은 rounded-card, 칸반 컬럼은 rounded-section으로 통일한다.
      borderRadius: {
        card: "14px", // 카드, 모달
        section: "10px", // 칸반 컬럼 등 카드보다 한 단계 낮은 큰 반경
      },
      // 그림자 — 은은하고 따뜻한 톤(순검정 대신 살짝 브라운 계열 rgba)으로 2단계만.
      // 기존 shadow-sm/md/lg/xl(Tailwind 기본값)은 그대로 둔다 — 이름이 겹치지 않는 새 키만 추가.
      boxShadow: {
        card: "0 1px 2px 0 rgba(41, 37, 34, 0.06), 0 1px 3px 0 rgba(41, 37, 34, 0.08)", // 카드 기본 상태
        float: "0 8px 24px -4px rgba(41, 37, 34, 0.16), 0 4px 8px -2px rgba(41, 37, 34, 0.08)", // 모달, 드래그 중 카드 등 떠 있는 요소
      },
      colors: {
        brand: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          tint: "#EEF2FF",
          text: "#3730A3",
          // 로그인 화면 비주얼 패널(AuthVisualPanel) 전용 — 연보라 배경 그라데이션/글로우/구 장식에만
          // 쓰는, 기존 tint보다 옅거나 톤이 다른 라벤더 3단계. 다른 화면에서 새로 쓸 필요가 생기면
          // 그때 이름을 일반화한다(지금은 이 패널 용도로 한정).
          "tint-100": "#F1F0FF",
          "tint-200": "#DCD9FF",
          "tint-300": "#D8D5FF",
        },
        status: {
          applied: "#A1A1AA",
          screening: "#378ADD",
          interview: "#7F77DD",
          offer: "#639922",
          rejected: "#E24B4A",
          canceled: "#D4D4D8",
        },
        platform: {
          saramin: { bg: "#F4F4F5", text: "#3F3F46" },
          wanted: { bg: "#EEF2FF", text: "#3730A3" },
          jobkorea: { bg: "#FEF2F2", text: "#991B1B" },
        },
        text: {
          primary: "#18181B",
          secondary: "#52525B",
          muted: "#A1A1AA",
        },
        page: "#FAFAFA",
        column: "#F2F2F4",
        card: "#FFFFFF",
        "on-brand": "#FFFFFF",
        overlay: "#000000",
        "card-border": "#DEDEE2",
        "border-strong": "#A1A1AA",
      },
      fontFamily: {
        sans: ["var(--font-pretendard)"],
      },
    },
  },
};

export default config;
