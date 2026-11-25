import { useState } from 'react'
import { createDiaryCalendar } from '../diaryCalendar'

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

export function DiaryDate() {
  // 팝업을 열 때 한 번 계산한다. 날짜 표시만을 위한 타이머·요청·저장은 하지 않는다.
  const [calendar] = useState(() => createDiaryCalendar(new Date()))
  return (
    <section className="diary-date" aria-label="오늘 날짜">
      <div>
        {/* #239: 영문 월 이름(Nov.) 대신 웹앱처럼 숫자 월로 보여 준다 */}
        <h2 className="diary-month">{calendar.month}월 {calendar.day}일</h2>
        {/* 월·일은 제목에 있으므로 아래 줄은 연도와 요일만 보인다. 화면 읽기에는 전체 날짜를 읽힌다 */}
        <time dateTime={calendar.isoDate} className="diary-today" aria-label={calendar.year + '년 ' + calendar.dateLabel}>
          {calendar.year}년 {calendar.dateLabel.split(' ').pop()}
        </time>
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
