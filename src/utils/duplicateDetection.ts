import { Application } from '@/types/application';
import { toDateInputValue } from '@/utils/format';

// 새 지원건을 저장소에 어떻게 반영할지에 대한 판정 (docs/INTEGRATION.md §5)
// add: 일반 추가 / add-duplicate: 추가하되 진짜 재지원(다른 공고)으로 감지
// update: 같은 공고(externalId, 원티드는 company+position)의 상태 변화 → 기존 건 대체
// skip: 같은 공고의 완전히 동일한 내용 재수집
export type ImportDecision =
  | { type: 'add' }
  | { type: 'add-duplicate' }
  | { type: 'skip' }
  | { type: 'update'; target: Application };

type IncomingApplication = Omit<Application, 'id' | 'updatedAt'>;

// "같은 공고"로 볼 기존 건을 찾는다.
// externalId가 있으면(사람인/잡코리아) platform+externalId로 판정 — externalId는 사이트별로 독립
// 발급되므로 platform이 다르면 값이 우연히 같아도 서로 다른 공고다.
// externalId가 없으면(원티드) platform+company+position을 대체 기준으로 쓴다 — 이 경우 같은
// 회사+포지션으로의 진짜 재지원과 재수집을 구분할 방법이 없다는 한계가 있다 (§5 "원티드 예외").
function findSameListing(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): Application | undefined {
  if (newApplication.externalId) {
    return existingApplications.find(
      (existing) => existing.platform === newApplication.platform && existing.externalId === newApplication.externalId,
    );
  }

  return existingApplications.find(
    (existing) =>
      existing.platform === newApplication.platform &&
      existing.company === newApplication.company &&
      existing.position === newApplication.position,
  );
}

// 같은 공고로 판정된 기존 건과 새로 들어온 내용이 실질적으로 동일한지 비교 (status, appliedAt 날짜)
function isSameContent(existing: Application, incoming: IncomingApplication): boolean {
  return (
    existing.status === incoming.status && toDateInputValue(existing.appliedAt) === toDateInputValue(incoming.appliedAt)
  );
}

// 새로 수집된 지원건 하나를 기존 목록과 비교해 저장 여부를 판별한다 (docs/INTEGRATION.md §5)
export function getImportDecision(
  existingApplications: Application[],
  newApplication: IncomingApplication,
): ImportDecision {
  // 1) 같은 공고(같은 platform+externalId, 원티드는 platform+company+position)인 기존 건이 있는지 확인
  const sameListing = findSameListing(existingApplications, newApplication);

  if (sameListing) {
    return isSameContent(sameListing, newApplication)
      ? { type: 'skip' } // 완전히 동일한 내용의 기술적 재수집
      : { type: 'update', target: sameListing }; // 같은 공고의 상태 변화
  }

  // 2) 같은 공고로 판정되지 않았다면(externalId가 다르거나 없음), company+position이 같은 기존 건이
  //    있는지로 진짜 재지원(중복 지원) 여부를 판별한다.
  const hasSameCompanyPosition = existingApplications.some(
    (existing) => existing.company === newApplication.company && existing.position === newApplication.position,
  );

  return hasSameCompanyPosition ? { type: 'add-duplicate' } : { type: 'add' };
}
