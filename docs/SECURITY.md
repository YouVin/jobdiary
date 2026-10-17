# 보안 점검과 릴리즈

## 의존성 점검 (#89)

2026-10-17 기준 Next.js와 eslint-config-next를 `16.4.2`로 맞추고 lockfile의 수정 가능한 하위 의존성을 갱신했다. 버전과 설치 결과의 기준은 `package.json`과 `package-lock.json`이다.

- `npm audit --omit=dev`: 운영 의존성 취약 패키지 0개.
- `npm audit`: 개발 도구에서 High 5개가 남는다. `braces@3.0.3`의 중첩 패턴 처리 DoS와 이를 사용하는 `micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next` 경로다. 사용자 입력이 이 경로로 전달되는 앱 기능은 없다. 신뢰할 수 있는 저장소에서 린트를 실행하고 상위 패키지의 수정을 추적한다.
- `npm audit fix --force`는 Next.js ESLint 설정을 `14.2.35`로 내리는 제안을 하므로 사용하지 않는다. 경고를 숨기기 위한 임의 override도 추가하지 않는다.
- CI는 `npm ci` 뒤 운영 의존성 audit을 실행하고, 실패하면 릴리즈 검증을 통과시키지 않는다. audit 통과가 다른 보안 검증을 대체하지는 않는다.

근거: [Next.js 릴리즈](https://github.com/vercel/next.js/releases/tag/v16.4.2), [braces 보안 공지](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

## 릴리즈 판단 (#96·#97)

계정 격리(#90), 편집 충돌(#93), 날짜 검증(#94)을 dev에 병합했다. #96·#97에서 정책 페이지·동의 확인을 추가하고 마이그레이션 이력 3건을 원격과 맞췄다. 브라우저 검증과 제한은 [RELEASE_CHECK](RELEASE_CHECK.md)에 기록한다. 사용자가 후속 검증과 main 병합까지 승인했으며, CI 통과를 확인한 커밋만 병합한다.

2026-10-17 Supabase 조직 `jobdiary`는 Free 플랜이다. [유출 비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)는 Pro 이상에서만 제공되어 활성화하지 못한다. RLS·역할 권한 점검은 통과했고 Advisor에는 이 경고 1건만 남는다. 무료 운영의 잔여 위험으로 공개 추적하며 유료 전환 시 활성화한다. 비밀번호 유출 검사가 적용된 것으로 주장하지 않는다. 유료 플랜 자동 전환이나 기존 비밀번호 일괄 변경은 하지 않았다.
