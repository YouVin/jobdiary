// 날짜 고르기 달력 (#293)의 순수 계산. 날짜는 모두 YYYY-MM-DD(UTC 자정 기준 계산, 시간대 영향 없음).
// 홈 지원 달력과 같이 월요일에 시작한다.

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

export interface PickerDay {
  date: string; // YYYY-MM-DD
  day: number;
  inMonth: boolean; // 보고 있는 달의 날짜인지 (앞뒤 달은 옅게)
}

function toTime(date: string): number {
  return Date.parse(`${date}T00:00:00.000Z`);
}

function fromTime(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

export function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromTime(toTime(value)) === value;
}

export function addDays(date: string, days: number): string {
  return fromTime(toTime(date) + days * DAY_MS);
}

// 달을 옮기되 날은 그 달의 마지막 날을 넘지 않게 (1월 31일 + 1달 = 2월 28일)
export function addMonths(date: string, months: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  return fromTime(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)));
}

// 그 주의 월요일 / 일요일
export function startOfWeek(date: string): string {
  return addDays(date, -((new Date(toTime(date)).getUTCDay() + 6) % 7));
}

export function endOfWeek(date: string): string {
  return addDays(startOfWeek(date), 6);
}

// 보고 있는 달(YYYY-MM)을 월요일 시작 주로 나눈다. 앞뒤 빈 칸은 이웃 달 날짜로 채운다.
export function getPickerWeeks(month: string): PickerDay[][] {
  const first = `${month}-01`;
  const last = addDays(addMonths(first, 1), -1);
  const weeks: PickerDay[][] = [];
  for (let start = startOfWeek(first); start <= last; start = addDays(start, 7)) {
    const week: PickerDay[] = [];
    for (let index = 0; index < 7; index += 1) {
      const date = addDays(start, index);
      week.push({ date, day: Number(date.slice(8, 10)), inMonth: date.startsWith(month) });
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatPickerMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${year}년 ${monthNumber}월`;
}

// 화면 읽기용 날짜 이름: "2026년 11월 27일 금요일"
export function formatPickerDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일 ${WEEKDAY_NAMES[new Date(toTime(date)).getUTCDay()]}`;
}
