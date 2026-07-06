// ISO 날짜 문자열을 'MM.DD' 형식으로 변환 (타임존에 따라 날짜가 밀리지 않도록 UTC 기준)
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${month}.${day}`;
}
