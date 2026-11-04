const MONTH_LABELS = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May.', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.']

// 기기의 현지 날짜를 표시한다. UTC 변환으로 오늘 날짜가 바뀌지 않게 한다.
export function createDiaryCalendar(date: Date) {
  const year = date.getFullYear()
  const monthIndex = date.getMonth()
  const day = date.getDate()
  const firstWeekday = (new Date(year, monthIndex, 1).getDay() + 6) % 7
  const lastDay = new Date(year, monthIndex + 1, 0).getDate()
  const cellCount = Math.ceil((firstWeekday + lastDay) / 7) * 7
  const weeks: Array<Array<number | null>> = []
  for (let index = 0; index < cellCount; index++) {
    if (index % 7 === 0) weeks.push([])
    const cellDay = index - firstWeekday + 1
    weeks[weeks.length - 1].push(cellDay > 0 && cellDay <= lastDay ? cellDay : null)
  }
  const dateLabel = new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(date)
  return {
    year, month: monthIndex + 1, day, monthLabel: MONTH_LABELS[monthIndex], dateLabel, weeks,
    isoDate: [year, String(monthIndex + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-'),
  }
}
