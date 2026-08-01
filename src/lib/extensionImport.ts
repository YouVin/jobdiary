import { JOBDIARY_COLLECT_MESSAGE_TYPE } from '@/constants/extension';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_INFO } from '@/constants/status';
import { Application } from '@/types/application';

// 웹앱 → 익스텐션 요청 메시지 (docs/INTEGRATION.md §6.4, pull 방식)
export interface JobdiaryCollectRequest {
  type: typeof JOBDIARY_COLLECT_MESSAGE_TYPE;
}

export const JOBDIARY_COLLECT_REQUEST: JobdiaryCollectRequest = { type: JOBDIARY_COLLECT_MESSAGE_TYPE };

const VALID_PLATFORMS = Object.keys(PLATFORM_INFO);
const VALID_STATUSES = Object.keys(STATUS_INFO);

type CollectItem = Omit<Application, 'id' | 'updatedAt'>;

// 익스텐션 응답 항목이 필수 필드(company/position/platform/status/appliedAt)를 갖췄는지 검증
function isValidCollectItem(item: unknown): item is CollectItem {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const candidate = item as Record<string, unknown>;

  return (
    typeof candidate.company === 'string' &&
    candidate.company.trim() !== '' &&
    typeof candidate.position === 'string' &&
    candidate.position.trim() !== '' &&
    typeof candidate.platform === 'string' &&
    VALID_PLATFORMS.includes(candidate.platform) &&
    typeof candidate.status === 'string' &&
    VALID_STATUSES.includes(candidate.status) &&
    typeof candidate.appliedAt === 'string' &&
    candidate.appliedAt.trim() !== '' &&
    (candidate.externalId === undefined || typeof candidate.externalId === 'string')
  );
}

// 검증을 통과한 항목에서 docs/INTEGRATION.md §2가 허용하는 필드만 화이트리스트로 추출한다.
// id/updatedAt 같은 웹앱 전용 필드나 스키마 밖 필드가 응답에 섞여 와도 여기서 걸러진다.
function toApplicationInput(item: CollectItem): CollectItem {
  const input: CollectItem = {
    company: item.company,
    position: item.position,
    platform: item.platform,
    status: item.status,
    appliedAt: item.appliedAt,
  };

  if (item.externalId !== undefined) {
    input.externalId = item.externalId;
  }

  return input;
}

// 익스텐션 응답이 기대하는 배열 형태인지 검증하고, 통과하면 허용된 필드만 남긴 배열을 반환한다.
// 항목 하나라도 형식이 어긋나면 전체 응답을 신뢰하지 않고 null을 반환한다.
export function sanitizeCollectResponse(response: unknown): CollectItem[] | null {
  if (!Array.isArray(response)) {
    return null;
  }

  const sanitized: CollectItem[] = [];

  for (const item of response) {
    if (!isValidCollectItem(item)) {
      return null;
    }
    sanitized.push(toApplicationInput(item));
  }

  return sanitized;
}
