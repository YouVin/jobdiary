# 보안 점검과 릴리즈

## 의존성 점검 (#89)

2026-10-17 기준 Next.js와 eslint-config-next를 `16.4.2`로 맞추고 lockfile의 수정 가능한 하위 의존성을 갱신했다. 버전과 설치 결과의 기준은 `package.json`과 `package-lock.json`이다.

- `npm audit --omit=dev`: 운영 의존성 취약 패키지 0개.
- `npm audit`: 개발 도구에서 High 5개가 남는다. `braces@3.0.3`의 중첩 패턴 처리 DoS와 이를 사용하는 `micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next` 경로다. 사용자 입력이 이 경로로 전달되는 앱 기능은 없다. 신뢰할 수 있는 저장소에서 린트를 실행하고 상위 패키지의 수정을 추적한다.
- `npm audit fix --force`는 Next.js ESLint 설정을 `14.2.35`로 내리는 제안을 하므로 사용하지 않는다. 경고를 숨기기 위한 임의 override도 추가하지 않는다.
- CI는 `npm ci` 뒤 운영 의존성 audit을 실행하고, 실패하면 릴리즈 검증을 통과시키지 않는다. audit 통과가 다른 보안 검증을 대체하지는 않는다.

근거: [Next.js 릴리즈](https://github.com/vercel/next.js/releases/tag/v16.4.2), [braces 보안 공지](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## 배포 보류

릴리즈 PR #87은 Draft다. 의존성 수정만으로 배포하지 않고 계정 전환 데이터 격리(#90), 오래된 편집창의 수동 상태 덮어쓰기, 빈 지원일 검증, 약관·개인정보 안내, 운영 DB와 저장소의 마이그레이션 이력 차이를 함께 확인한다. 각 수정은 dev 대상 PR로 검토하고, main 병합은 별도로 진행한다.
