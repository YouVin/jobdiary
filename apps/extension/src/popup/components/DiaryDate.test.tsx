import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { DiaryDate } from './DiaryDate'

it('오늘을 하나만 표시하고 새로 연 팝업은 바뀐 월과 날짜를 표시한다', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.useFakeTimers()
  const container = document.createElement('div')
  document.body.append(container)
  let root = createRoot(container)
  try {
    vi.setSystemTime(new Date(2026, 10, 30, 23, 59))
    await act(async () => root.render(<DiaryDate />))
    expect(container.querySelector('caption')?.textContent).toBe('2026년 11월 달력')
    expect(container.querySelectorAll('[aria-current="date"]')).toHaveLength(1)
    expect(container.querySelector('[aria-current="date"]')?.textContent).toBe('30')
    expect(container.querySelector('time')?.dateTime).toBe('2026-11-30')
    expect(container.querySelector('button')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
    await act(async () => root.unmount())
    root = createRoot(container)
    vi.setSystemTime(new Date(2026, 11, 1, 0, 1))
    await act(async () => root.render(<DiaryDate />))
    expect(container.querySelector('caption')?.textContent).toBe('2026년 12월 달력')
    expect(container.querySelector('[aria-current="date"]')?.textContent).toBe('1')
    expect(container.querySelector('time')?.dateTime).toBe('2026-12-01')
  } finally {
    await act(async () => root.unmount())
    container.remove()
    vi.useRealTimers()
  }
})
