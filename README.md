# 취준일기 (JobDiary)

> 사람인 · 원티드 · 잡코리아 지원 내역을 자동으로 모아 관리하고, 취업 여정을 일기로 기록하는 웹앱

---

## 소개

여러 채용 사이트에 흩어진 지원 내역을 크롬 익스텐션으로 자동 수집해서, 한 곳에서 칸반 보드로 관리한다. 각 지원 건마다 일기를 남겨 취업 여정을 기록할 수 있다.

## 핵심 기능

- 크롬 익스텐션으로 지원 내역 자동 수집
- 칸반 보드로 지원 현황 단계별 관리
- 지원 건마다 일기 기록
- 지원 통계 (합격률, 플랫폼별 분포)
- 텍스트 복사 + 이미지 카드 공유

## 기술 스택

Next.js 14 · TypeScript · Tailwind CSS · Zustand · dnd-kit · Vercel

## 시작하기

```bash
npm install
npm run dev   # http://localhost:3000
```

## 문서

- [기획서](./docs/PLANNING.md)
- [기술 설계](./docs/TECH_DESIGN.md)
- [익스텐션 설계](./docs/EXTENSION.md)
- [컨벤션](./docs/CONVENTION.md)
- [로드맵](./docs/ROADMAP.md)

## 브랜치

`main` (배포) ← `dev` (개발)