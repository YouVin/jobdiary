import type { Config } from "tailwindcss";

// 디자인 시스템 토큰 (#199~#206). 원본: https://claude.ai/artifact/RR4qTSJVUe774joAoq3mrf · 규칙: docs/DESIGN_SYSTEM.md
// 화면은 여기 있는 이름만 쓴다. 값을 바꿀 때는 디자인 시스템 원본·캔버스 parts.css와 함께 바꾼다.
// 간격·크기는 정수 Tailwind 단위(1 = 4px). 같은 속성의 클래스를 겹쳐 쓰지 않는다(Card padding·gap 속성 참고).
// #206에서 예전 이름(brand·status·heading-*·legacy-* 등)을 모두 걷어냈고, `npm run check:ui`가 다시 쓰지 못하게 막는다.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 글자 7단계. 굵기는 400·600·700만 쓰고, body·label을 굵게 쓸 때는 font-semibold를 붙인다.
      // 모바일(640 미만)에서는 display-sm·title-1-sm으로 한 단계 줄인다. 숫자는 tabular-nums.
      fontSize: {
        display: ["30px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }], // 로그인 소개 문구
        "display-sm": ["26px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }],
        "title-1": ["24px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }], // 페이지 제목, 통계 칸 숫자
        "title-1-sm": ["22px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }],
        "title-2": ["20px", { lineHeight: "1.35", fontWeight: "700", letterSpacing: "-0.02em" }], // 카드 맨 위 한 줄 요약
        "title-3": ["17px", { lineHeight: "1.35", fontWeight: "700" }], // 카드 제목
        body: ["15px", { lineHeight: "1.5", fontWeight: "400" }], // 본문, 회사 이름(semibold), 버튼(semibold)
        label: ["13px", { lineHeight: "1.5", fontWeight: "400" }], // 직무, 날짜, 보조 설명, 입력칸 이름표(semibold)
        caption: ["12px", { lineHeight: "1.5", fontWeight: "600" }], // 뱃지, 그래프 축, 달력 숫자
      },
      // 모서리 단계. Tailwind 기본 이름(xs~xl)을 디자인 시스템 값으로 덮어쓴다.
      // 겹친 모서리는 안쪽 = 바깥 − 안쪽 여백 (예: 탭 판 md 12, 안쪽 4 → 선택 판 sm 8).
      borderRadius: {
        xs: "4px", // 막대그래프 윗부분, 범례 네모
        sm: "8px", // 뱃지, 달력 칸, 회사 아이콘, 탭 안의 선택 판
        md: "12px", // 버튼, 입력칸, 카드 안 작은 칸, 칸반 카드, 토스트
        lg: "16px", // 칸반 열, 기록 남기기 판
        xl: "20px", // 카드, 모달
        // 로그인 소개의 기기 목업 전용 (#202). 겹친 모서리는 바깥 − 안쪽 여백으로 맞춘다.
        "device-phone": "46px", // 아이폰 바깥 금속 테두리
        "device-phone-bezel": "45px", // 테두리 1px 안쪽 검은 베젤
        "device-phone-screen": "41px", // 베젤 4px 안쪽 화면
        "device-lid": "24px", // 맥북 화면 덮개 위쪽
        "device-lid-inner": "23px",
      },
      // 그림자 3단계. 카드에는 그림자를 쓰지 않고(회색 바탕 위 흰 카드로 구분), 떠 있는 것에만 쓴다.
      boxShadow: {
        sm: "0 1px 2px rgba(27, 34, 48, 0.04)", // 칸반 카드에 마우스를 올렸을 때
        md: "0 8px 24px rgba(27, 34, 48, 0.08)", // 드롭다운 메뉴, 토스트
        lg: "0 16px 40px rgba(27, 34, 48, 0.14)", // 모달, 상세 패널, 끌고 있는 칸반 카드
      },
      // 층 순서: 숫자가 클수록 위
      zIndex: {
        header: "10",
        dropdown: "20",
        panel: "30",
        modal: "40",
        toast: "50",
      },
      // 움직임 길이. 곡선은 ease-soft. 움직임은 항상 motion-safe: 로만 켠다.
      transitionDuration: {
        fast: "150ms", // 마우스 올림 색 변화, 버튼 누름
        base: "250ms", // 드롭다운·탭 전환, 패널 열고 닫기
        slow: "400ms", // 모달 등장, 카드가 올라오며 나타남
      },
      keyframes: {
        // 나타날 때 살짝 올라온다 (카드·토스트·메뉴)
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
        // ── 역할 색 ── 다크 모드는 아직 정하지 않았고, 정할 때 역할마다 값만 붙인다.
        page: "#F5F7FA", // 페이지 바탕
        surface: "#FFFFFF", // 카드, 흰 판, 입력칸 바탕
        subtle: "#F5F7FA", // 카드 안의 옅은 칸, 칩, 보조 버튼, 아이콘 버튼 마우스 올림
        muted: "#E6E9EF", // 탭 바탕(회색 판), 칸반 열
        selected: "#EAF0FB", // 선택된 항목, 지원한 날 달력 칸
        inverse: "#1B2230", // 선택된 필터 칩, 툴팁, 토스트
        scrim: "rgba(27, 34, 48, 0.4)", // 패널·모달 뒤를 덮는 막
        line: {
          divider: "#E6E9EF", // 목록 구분선, 카드 안 나눔선
          input: "#848DA4", // 입력칸·테두리 버튼 테두리 (흰 바탕 3.32:1, 조작 경계 기준 3:1 — #201에서 #C9CFDA 1.56:1에서 올림)
          focus: "#3461D1", // 입력칸을 눌렀을 때 테두리
        },
        // 키보드 포커스 바깥 테두리. 디자인 시스템 처음 값 #7898E2는 흰 바탕 2.84:1이라 포커스 기준(3:1)에 못 미쳐
        // 버튼 파랑(5.56:1)으로 올렸다(#200).
        "focus-ring": "#3461D1",
        action: {
          primary: "#3461D1", // 주요 버튼 (흰 글자 5.56:1)
          hover: "#2F55B8", // 6.75:1
          pressed: "#27489B", // 8.45:1
          disabled: "#C7D5F5",
        },
        text: {
          primary: "#1B2230", // 제목, 본문, 숫자 (16.6:1)
          secondary: "#5A6478", // 설명, 이름표, 날짜, 입력칸 안내 글자 (5.95:1)
          disabled: "#8F98AD", // 비활성 글자에만 (2.89:1, 비활성은 대비 기준 예외)
          brand: "#3461D1", // 링크, 강조 숫자 (5.56:1)
          "brand-strong": "#2F55B8", // selected 바탕 위 파란 글자 (5.9:1)
          logo: "#253A63",
          "on-color": "#FFFFFF",
        },
        logo: {
          navy: "#253A63", // 로고와 아주 드문 브랜드 제목에만
          marigold: "#F2A33A", // 화면에서는 오늘·D-day에만
          grey: "#8F98AD",
        },
        // ── 상태 색 ── 연한 바탕(tint) + 진한 글자(text) 짝으로 쓴다.
        today: { DEFAULT: "#F2A33A", tint: "#FDF1DF", text: "#9A5A0B" }, // 오늘·D-day에만 (글자 4.9:1)
        success: { DEFAULT: "#14A38B", tint: "#E7F8F5", text: "#0D7766" }, // 합격 (글자 5.06:1)
        danger: { DEFAULT: "#B93A26", tint: "#FDECE8", text: "#B93A26" }, // 중복·오래 소식 없음·오류 (글자 4.96:1)
        info: { tint: "#EAF0FB", text: "#2F55B8" }, // 서류 통과 같은 진행 소식 (글자 5.9:1)
        // ── 데이터 색 ── 그래프는 강조 하나만 chart-1, 나머지는 2 → 3 → rest로 옅게. 색만으로 구분하지 않고 항상 글자를 함께 둔다.
        chart: { 1: "#3461D1", 2: "#7898E2", 3: "#C7D5F5", rest: "#C9CFDA", empty: "#E6E9EF" },
        stage: {
          applied: "#3461D1",
          screening: "#7898E2",
          interview: "#C7D5F5", // 면접 예정·면접 완료 같은 색
          offer: "#14A38B",
          rejected: "#8F98AD",
          canceled: "#C9CFDA",
        },
        // 일정 종류 점: 면접 파랑, 공고 마감 회색
        event: {
          interview: "#3461D1",
          deadline: "#8F98AD",
        },
        // 로그인 소개의 기기 목업 전용 (#202). 기기 고유의 금속·유리 색이라 화면 역할 색과 따로 둔다.
        device: {
          edge: "#E6E9EF", // 금속 테두리 밝은 쪽
          steel: "#8F98AD", // 금속 테두리 어두운 쪽, 옆 버튼
          shade: "#C9CFDA", // 맥북 바닥판 그늘
          glass: "#1B2230", // 화면 베젤, 노치
          hinge: "#2A3242", // 맥북 경첩, 카메라 점
          "hinge-light": "#5A6478",
          base: "#F5F7FA", // 맥북 바닥판 윗면
        },
      },
      fontFamily: {
        sans: ["var(--font-pretendard)"],
      },
    },
  },
};

export default config;
