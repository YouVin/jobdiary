import { describe, expect, it } from 'vitest'
import { createDiaryCalendar } from './diaryCalendar'

describe('기기의 오늘 날짜와 월요일 시작 달력', () => {
  it('11월의 일요일 시작과 월말을 정확한 칸에 배치한다', () => {
    const calendar = createDiaryCalendar(new Date(2026, 10, 5, 0, 5))
    expect(calendar).toMatchObject({ year: 2026, month: 11, day: 5, monthLabel: 'Nov.', isoDate: '2026-11-05' })
    expect(calendar.dateLabel).toBe('11월 5일 목요일')
    expect(calendar.weeks[0]).toEqual([null, null, null, null, null, null, 1])
    expect(calendar.weeks[1]).toEqual([2, 3, 4, 5, 6, 7, 8])
    expect(calendar.weeks[5]).toEqual([30, null, null, null, null, null, null])
  })
  it('윤년 2월 29일을 포함하고 평년에는 만들지 않는다', () => {
    const leap = createDiaryCalendar(new Date(2028, 1, 29))
    expect(leap.weeks[leap.weeks.length - 1]).toEqual([28, 29, null, null, null, null, null])
    const ordinary = createDiaryCalendar(new Date(2027, 1, 28))
    expect(ordinary.weeks).toHaveLength(4)
    expect(ordinary.weeks[ordinary.weeks.length - 1]).toEqual([22, 23, 24, 25, 26, 27, 28])
  })
  it('연말과 새해 날짜를 UTC 변환 없이 구분한다', () => {
    const last = createDiaryCalendar(new Date(2026, 11, 31, 23, 59))
    const next = createDiaryCalendar(new Date(2027, 0, 1, 0, 1))
    expect(last).toMatchObject({ year: 2026, monthLabel: 'Dec.', isoDate: '2026-12-31' })
    expect(next).toMatchObject({ year: 2027, monthLabel: 'Jan.', isoDate: '2027-01-01' })
  })
})
