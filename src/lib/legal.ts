export const POLICY_VERSION = '2026-10-17';

// 동의 화면 재표시를 위한 사용자 메타데이터다. 권한 판단이나 변경 불가능한 감사 기록으로 쓰지 않는다.
export function hasCurrentConsent(metadata: Record<string, unknown> | undefined): boolean {
  return metadata?.terms_version === POLICY_VERSION && metadata?.privacy_version === POLICY_VERSION;
}

export function consentMetadata() {
  return { terms_version: POLICY_VERSION, privacy_version: POLICY_VERSION, consented_at: new Date().toISOString() };
}
