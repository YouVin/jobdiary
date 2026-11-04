import { useState } from 'react'
import { createDiaryCalendar } from '../diaryCalendar'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

export function DiaryDate() {
  // 팝업을 열 때 한 번 계산한다. 날짜 표시만을 위한 타이머·요청·저장은 하지 않는다.
  const [calendar] = useState(() => createDiaryCalendar(new Date()))
  return (
    <section className="diary-date" aria-label="오늘 날짜">
      <div>
        <p className="diary-year">{calendar.year}</p>
        <h2 className="diary-month" aria-label={calendar.month + '월'}>{calendar.monthLabel}</h2>
        <time dateTime={calendar.isoDate} className="diary-today" aria-label={calendar.year + '년 ' + calendar.dateLabel}>{calendar.dateLabel}</time>
      </div>
      <table className="diary-calendar">
        <caption className="sr-only">{calendar.year}년 {calendar.month}월 달력</caption>
        <thead><tr>{WEEKDAYS.map(day => <th key={day} scope="col" aria-label={day + '요일'}>{day}</th>)}</tr></thead>
        <tbody>{calendar.weeks.map((week, index) => (
          <tr key={index}>{week.map((day, weekday) => <td key={weekday}><span aria-current={day === calendar.day ? 'date' : undefined}>{day}</span></td>)}</tr>
        ))}</tbody>
      </table>
    </section>
  )
}
