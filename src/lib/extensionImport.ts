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

// 익스텐션이 실제로 보내는 응답 형태 (docs/INTEGRATION.md §6.4)
interface ExternalCollectResponse {
  ok: boolean;
  applications?: unknown;
  error?: string;
}

function isExternalCollectResponse(response: unknown): response is ExternalCollectResponse {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const candidate = response as { ok?: unknown; error?: unknown };

  return typeof candidate.ok === 'boolean' && (candidate.error === undefined || typeof candidate.error === 'string');
}

export type CollectResponseResult = { ok: true; applications: CollectItem[] } | { ok: false; error: string };

// 익스텐션 응답 { ok, applications?, error? }을 검증한다.
// - 봉투 형식(ok 필드) 자체가 어긋나면 null (형식 오류)
// - ok:false면 익스텐션이 보낸 에러 메시지를 그대로 반환
// - ok:true면 applications가 배열인지, 각 항목이 유효한지 확인 후 허용된 필드만 남겨 반환
//   (applications가 없거나 배열이 아니거나, 항목 하나라도 형식이 어긋나면 null)
export function sanitizeCollectResponse(response: unknown): CollectResponseResult | null {
  if (!isExternalCollectResponse(response)) {
    return null;
  }

  if (!response.ok) {
    return { ok: false, error: response.error || '익스텐션에서 오류가 발생했습니다.' };
  }

  if (!Array.isArray(response.applications)) {
    return null;
  }

  const sanitized: CollectItem[] = [];

  for (const item of response.applications) {
    if (!isValidCollectItem(item)) {
      return null;
    }
    sanitized.push(toApplicationInput(item));
  }

  return { ok: true, applications: sanitized };
}
