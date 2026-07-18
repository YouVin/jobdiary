import { Application } from '@/types/application';
import { toDateInputValue } from '@/utils/format';

// 새 지원건을 저장소에 어떻게 반영할지에 대한 판정
// add: 일반 추가 / add-duplicate: 추가하되 같은 회사+포지션 재지원으로 감지 / skip: 같은 건 재수집이라 스킵
export type ImportDecision = 'add' | 'add-duplicate' | 'skip';

type IncomingApplication = Omit<Application, 'id' | 'updatedAt'>;

// 새로 수집된 지원건 하나를 기존 목록과 비교해 저장 여부를 판별한다 (docs/INTEGRATION.md 5번 규칙)
export function getImportDecision(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): ImportDecision {
  // 1) externalId가 있으면(사람인/잡코리아) 같은 platform + 같은 externalId의 기존 건이 있는지 확인 → 있으면 기술적 중복(재수집)이라 스킵
  //    externalId는 사이트별로 독립 발급되므로 platform이 다르면 값이 우연히 같아도 별개 지원건이다.
  if (newApplication.externalId) {
    const hasSameExternalId = existingApplications.some(
      (existing) => existing.platform === newApplication.platform && existing.externalId === newApplication.externalId,
    );

    if (hasSameExternalId) {
      return 'skip';
    }
  } else {
    // 2) externalId가 없으면(원티드) platform + company + position + appliedAt(날짜)까지 전부 같은 기존 건을
    //    같은 건 재수집으로 간주해 스킵. externalId가 없는 사이트의 "기술적 중복" 대체 기준.
    //    (원티드는 platform이 항상 'wanted'라 실질적 영향은 없지만, 위 externalId 분기와 같은 기준을 일관되게 적용)
    const hasSameDateEntry = existingApplications.some(
      (existing) =>
        existing.platform === newApplication.platform &&
        existing.company === newApplication.company &&
        existing.position === newApplication.position &&
        toDateInputValue(existing.appliedAt) === toDateInputValue(newApplication.appliedAt),
    );

    if (hasSameDateEntry) {
      return 'skip';
    }
  }

  // 3) 기술적 중복이 아니면 company + position이 같은 기존 건이 있는지 확인 → 있으면 실제 중복 지원으로 감지
  const hasSameCompanyPosition = existingApplications.some(
    (existing) => existing.company === newApplication.company && existing.position === newApplication.position,
  );

  if (hasSameCompanyPosition) {
    return 'add-duplicate';
  }

  return 'add';
}
