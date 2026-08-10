import type { Config } from "tailwindcss";

// 간격(spacing) 가이드 — Tailwind v4 기본 spacing 스케일(어떤 숫자든 0.25rem 단위로 동작)로 충분해
// 별도 토큰을 추가하지 않는다. 대신 이 프로젝트에서 실제로 자주 쓰는 값을 용도별로 정리해둔다
// ("여백이 주인공" 원칙 — 장식보다 넉넉한 여백으로 위계를 만든다. 아래보다 촘촘하게 쓰지 않는다):
//   - 카드/섹션 내부 패딩: p-5(20px) ~ p-6(24px) — 모달·카드·계정 섹션에서 이미 표준으로 쓰임
//   - 폼 필드 사이 간격: gap-3(12px)
//   - 버튼 안 아이콘-텍스트 간격: gap-1.5(6px)
//   - 카드 사이/섹션 사이 간격: gap-2(8px) ~ gap-4(16px)
//   - 인라인 에러/보조문구와 필드 사이: mt-1(4px) ~ mt-1.5(6px)
//   - 큰 블록(헤더 로고, 페이지 상단) 사이: mt-5(20px) ~ mt-6(24px), py-8(32px) ~ py-10(40px)
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 타이포 스케일 — docs/WORKING_AGREEMENT.md §2에 문서화된 크기·굵기 위계를 실제 Tailwind
      // 토큰으로 정리한 것. text-heading-xl처럼 쓰면 font-size/line-height/font-weight가 함께 적용된다.
      // line-height는 한글 가독성을 고려해 정함(작은 글자일수록 상대적으로 더 넉넉하게).
      fontSize: {
        "heading-xl": ["28px", { lineHeight: "1.4", fontWeight: "600" }], // 페이지 제목
        "heading-lg": ["22px", { lineHeight: "1.4", fontWeight: "500" }], // 섹션 제목
        "heading-md": ["18px", { lineHeight: "1.5", fontWeight: "500" }], // 카드/모달 제목
        body: ["14px", { lineHeight: "1.6", fontWeight: "400" }], // 기본 본문
        "card-company": ["13px", { lineHeight: "1.5", fontWeight: "500" }], // 지원 카드의 회사명
        label: ["12px", { lineHeight: "1.5", fontWeight: "500" }], // 폼 라벨, 보조 문구
        caption: ["11px", { lineHeight: "1.5", fontWeight: "400" }], // 카드 내 캡션(날짜 등)
        badge: ["10px", { lineHeight: "1.4", fontWeight: "500" }], // 플랫폼/상태 뱃지
      },
      // 모서리 — 기존 rounded-lg(8px, 버튼·입력)/rounded-md(6px)는 Tailwind 기본값 그대로 쓰고,
      // 카드·모달처럼 더 큰 반경이 필요한 곳에 이름 있는 토큰을 추가한다(기존 코드의
      // rounded-[14px]/rounded-[10px] 관례를 정리한 것 — 기존 사용처를 바꾸진 않았다).
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
          google: { blue: "#4285F4", green: "#34A853", yellow: "#FBBC05", red: "#EA4335" },
        },
        text: {
          primary: "#18181B",
          secondary: "#52525B",
          muted: "#A1A1AA",
        },
        page: "#FAFAFA",
        column: "#F2F2F4",
        card: "#FFFFFF",
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
