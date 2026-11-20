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
        // 홈 일기장(#158, #161): 날짜 크기 토큰. 글꼴은 본문과 같은 Pretendard다.
        "diary-day": ["56px", { lineHeight: "56px", fontWeight: "700" }], // 오늘 날짜 숫자
        "diary-month": ["14px", { lineHeight: "20px", fontWeight: "600" }], // 월 약어 (NOV.)
        "diary-date": ["20px", { lineHeight: "24px", fontWeight: "700" }], // 일정 타임라인의 날짜
        lead: ["20px", { lineHeight: "32px", fontWeight: "500" }], // 일기장 요약 문장
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
      // 모서리 — 입력은 rounded-xl, 버튼·메뉴·알약은 rounded-full(Tailwind 기본값).
      // 카드·모달은 rounded-card, 칸·묶음처럼 카드보다 한 단계 낮은 면은 rounded-section (#193에서 키움).
      borderRadius: {
        card: "20px", // 카드, 모달, 패널
        section: "14px", // 칸·묶음·카드 안의 면
      },
      // 그림자 — 그레이지 바탕에 맞춘 무채색 그림자 2단계. 카드 경계는 주로 card-border 테두리로 그린다.
      // 기존 shadow-sm/md/lg/xl(Tailwind 기본값)은 그대로 둔다 — 이름이 겹치지 않는 새 키만 추가.
      boxShadow: {
        card: "0 1px 2px 0 rgba(24, 24, 27, 0.04), 0 1px 3px 0 rgba(24, 24, 27, 0.05)", // 카드 기본 상태
        float: "0 12px 28px -12px rgba(24, 24, 27, 0.28), 0 4px 10px -4px rgba(24, 24, 27, 0.10)", // 모달, 드래그 중 카드, 마우스를 올린 카드
      },
      // 움직임 (#193) — 나타날 때 살짝 올라오는 rise와 부드러운 감속 곡선. 화면에서는 motion-safe:animate-rise처럼
      // motion-safe 변형으로만 써서, 모션 줄이기 설정에서는 움직이지 않게 한다.
      keyframes: {
        "jd-rise": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "none" },
        },
      },
      animation: {
        rise: "jd-rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      colors: {
        // 강조색 (#193): 인디고 대신 검정 하나로 강조한다. 이름은 그대로 두어 화면 코드를 바꾸지 않는다.
        brand: {
          DEFAULT: "#18181B", // 주 버튼, 선택된 메뉴·탭, 포커스 외곽선
          hover: "#3F3F3C",
          tint: "#E6E6E0", // 밝은 면 위의 선택·강조 배경
          text: "#18181B",
          // 로그인 화면 비주얼 패널(AuthVisualPanel) 전용 장식 3단계 (그레이지 명도 단계).
          "tint-100": "#F1F1EC",
          "tint-200": "#E2E2DC",
          "tint-300": "#D3D3CC",
        },
        status: {
          applied: "#A1A1AA",
          screening: "#378ADD",
          interview: "#7F77DD",
          offer: "#639922",
          rejected: "#E24B4A",
          canceled: "#D4D4D8",
          // 밝은 상태색은 점·막대에 쓰고, 작은 안내 글자는 대비가 높은 전용 토큰을 쓴다.
          "rejected-text": "#B91C1C",
          "offer-text": "#3F6212",
          "screening-text": "#1D4ED8",
        },
        // 데이터 색 (#193): 조작 부분(버튼·메뉴·포커스)은 검정으로 강조하고, 사이트·달력 같은 데이터는 색으로 구분한다.
        // 사이트 배지는 연한 배경 + 진한 글자(5.6:1 이상), chart는 도넛·사이트 점·글자 아이콘 배경이다.
        // 익스텐션(apps/extension/tailwind.config.ts)은 이번에 바꾸지 않아 배지 값이 다르다.
        platform: {
          saramin: { bg: "#E5ECFD", text: "#1E4FC2", chart: "#3B6FE8" },
          wanted: { bg: "#EDE8FE", text: "#5536C9", chart: "#7A5CF0" },
          jobkorea: { bg: "#FCE7E3", text: "#A8321F", chart: "#DD4B35" },
          manual: { bg: "#EFEFEA", text: "#5E5E59", chart: "#8E8C84" },
        },
        text: {
          primary: "#18181B",
          secondary: "#52524E",
          muted: "#66655F", // page·column·card·brand-tint 위 작은 글자 대비 4.5:1 이상
        },
        page: "#F1F1ED", // 그레이지 바탕 (#193에서 처음 값 #E8E8E3이 무거워 밝힘)
        column: "#F4F4F0", // 카드 안의 낮은 면, 칸, 마우스를 올린 행
        card: "#FCFCFA", // 카드·패널·입력 표면
        raised: "#FFFFFF", // 카드 위에 한 단계 떠 있는 행·알약
        // 지원 달력 칸의 지원 건수 단계 (1건 → 4건 이상). 연한 파랑에서 진한 남색으로 가는 단계다(#193).
        heat: {
          1: "#E3E8FC",
          2: "#BCC8F6",
          3: "#4F63D6",
          4: "#3243B5",
        },
        "on-brand": "#FFFFFF",
        overlay: "#000000",
        "card-border": "#E4E4DF",
        "border-strong": "#8E8D87", // 입력 테두리 (card 위 3:1 이상)
      },
      fontFamily: {
        sans: ["var(--font-pretendard)"],

      },
    },
  },
};

export default config;
