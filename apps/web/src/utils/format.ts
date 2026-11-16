// ISO 날짜 문자열을 'MM.DD' 형식으로 변환 (타임존에 따라 날짜가 밀리지 않도록 UTC 기준)
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}.${day}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜만 있는 값(YYYY-MM-DD)을 'MM.DD (요일)' 또는 'YYYY.MM.DD (요일)'로 표시
export function formatDateWithWeekday(dateOnly: string, withYear = false): string {
  const [year, month, day] = dateOnly.split('-');
  const weekday = WEEKDAYS[new Date(`${dateOnly}T00:00:00.000Z`).getUTCDay()];
  const date = withYear ? `${year}.${month}.${day}` : `${month}.${day}`;
  return `${date} (${weekday})`;
}

// ISO 날짜 문자열을 date input 값 형식('YYYY-MM-DD')으로 변환 (UTC 기준, formatDate와 동일 기준 유지)
export function toDateInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
