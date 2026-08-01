import { JOBDIARY_COLLECT_MESSAGE_TYPE } from '@/constants/extension';
import { PLATFORM_INFO } from '@/constants/platform';
import { STATUS_INFO } from '@/constants/status';
import { Application } from '@/types/application';

// 익스텐션이 보내는 수집 메시지. payload는 내용을 신뢰하지 않고 런타임에 검증한다 (docs/INTEGRATION.md §6.2).
export interface JobdiaryCollectMessage {
  type: typeof JOBDIARY_COLLECT_MESSAGE_TYPE;
  payload: unknown;
}

// 웹앱 → 익스텐션 응답 (sendResponse로 반환)
export interface JobdiaryCollectResponse {
  ok: boolean;
  summary?: {
    addedCount: number;
    duplicateCount: number;
    skippedCount: number;
  };
  error?: string;
}

const VALID_PLATFORMS = Object.keys(PLATFORM_INFO);
const VALID_STATUSES = Object.keys(STATUS_INFO);

// message가 익스텐션의 수집 메시지 형식(type)인지 확인
export function isJobdiaryCollectMessage(message: unknown): message is JobdiaryCollectMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }
  return (message as { type?: unknown }).type === JOBDIARY_COLLECT_MESSAGE_TYPE;
}

// payload가 Omit<Application, 'id' | 'updatedAt'>[] 형태인지 필수 필드 기준으로 검증
export function isValidCollectPayload(
  payload: unknown,
): payload is Array<Omit<Application, 'id' | 'updatedAt'>> {
  if (!Array.isArray(payload)) {
    return false;
  }
  return payload.every(isValidCollectItem);
}

function isValidCollectItem(item: unknown): item is Omit<Application, 'id' | 'updatedAt'> {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const candidate = item as Record<string, unknown>;

  return (
    typeof candidate.company === 'string' &&
    candidate.company.trim() !== '' &&
    typeof candidate.position === 'string' &&
    typeof candidate.platform === 'string' &&
    VALID_PLATFORMS.includes(candidate.platform) &&
    typeof candidate.status === 'string' &&
    VALID_STATUSES.includes(candidate.status) &&
    typeof candidate.appliedAt === 'string' &&
    candidate.appliedAt.trim() !== ''
  );
}
