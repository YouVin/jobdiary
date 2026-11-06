// ISO 날짜 문자열을 'MM.DD' 형식으로 변환 (타임존에 따라 날짜가 밀리지 않도록 UTC 기준)
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}.${day}`;
}

// ISO 날짜 문자열을 date input 값 형식('YYYY-MM-DD')으로 변환 (UTC 기준, formatDate와 동일 기준 유지)
export function toDateInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
