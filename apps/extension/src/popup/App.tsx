import type { Platform } from '@/types/application'
import { useEffect, useRef, useState } from 'react'
import { isConnectionError, waitForTabComplete } from '@/lib/collectRecovery'
import { copyRichText } from '@/lib/clipboard'
import { COLLECT_MESSAGE_TYPE, type CollectMessage, type CollectResponse, type DeadlineSummary } from '@/lib/messages'
import { detectPlatform } from '@/lib/platformDetect'
import { clearAll, getAllApplications } from '@/lib/storage'
import { applicationsToHtml, applicationsToTsv } from '@/lib/tsv'
import { Button } from './components/Button'
import { DiaryDate } from './components/DiaryDate'
import { PLATFORM_LABEL, PlatformBadge } from './components/PlatformBadge'
import { useSiteCounts } from './useSiteCounts'
import { useHistoryDisplay } from './useHistoryDisplay'
import { HistoryDisplayPanel } from './components/HistoryDisplayPanel'

const UNSUPPORTED_MESSAGE = '지원현황 페이지에서 눌러주세요'
const COLLECT_FAILED_MESSAGE = '수집에 실패했어요. 새로고침 후 다시 시도해 주세요'
const EMPTY_RESULT_MESSAGE = '이 페이지에서 지원내역을 찾지 못했어요. 목록을 불러온 뒤 다시 시도해 주세요'
const BUSY_MESSAGE = '이미 수집이 진행 중이에요. 잠시 후 다시 시도해 주세요'
const TRUNCATED_MESSAGE = '일부 페이지를 불러오지 못했을 수 있어요. 다시 시도해 주세요'

// (a) 미지원 페이지 안내에 쓰는 바로가기. jobkorea는 "입사지원현황" 딱 그 페이지의 확정된
// URL이 없어(SELECTORS.md 참고) 마이페이지까지만 안내한다. saramin/wanted는 SELECTORS.md에
// 문서화된 지원현황 페이지 URL 그대로.
const SITE_APPLY_STATUS_LINKS: Array<{ platform: Platform, label: string, url: string }> = [
  { platform: 'saramin', label: `${PLATFORM_LABEL.saramin} 지원현황`, url: 'https://www.saramin.co.kr/zf_user/persons/apply-status-list' },
  { platform: 'jobkorea', label: `${PLATFORM_LABEL.jobkorea} 마이페이지`, url: 'https://www.jobkorea.co.kr' },
  { platform: 'wanted', label: `${PLATFORM_LABEL.wanted} 지원현황`, url: 'https://www.wanted.co.kr/status/applications/applied' },
]

const PLATFORM_ORDER: Platform[] = ['saramin', 'jobkorea', 'wanted']
const RECOVERY_TIMEOUT_MS = 5000
const RECOVERY_RETRY_ATTEMPTS = 3
const RECOVERY_RETRY_INTERVAL_MS = 300
// manifest.config.ts의 externally_connectable / src/background/index.ts의 ALLOWED_ORIGINS와
// 반드시 같은 웹앱 주소를 유지한다. 프로덕션 빌드에선 localhost 대신 배포 주소로 연다.
// import.meta.env.PROD가 아니라 MODE를 봐야 한다 — PROD는 `vite build`면 --mode와 무관하게
// 항상 true라, manifest.config.ts의 env.mode 기준 분기와 어긋난다(dev 빌드도 vercel로 열림).
const WEBAPP_URL = import.meta.env.MODE === 'production' ? 'https://jobdiary.vercel.app' : 'http://localhost:3000'

function sendCollectMessage(tabId: number): Promise<CollectResponse | undefined> {
  const request: CollectMessage = { type: COLLECT_MESSAGE_TYPE }
  return chrome.tabs.sendMessage<CollectMessage, CollectResponse>(tabId, request)
}

// 새로고침 직후엔 content script가 아직 리스너를 등록 못 했을 수 있어 몇 번 짧게 재시도한다.
// "리시버 없음" 에러가 아닌 다른 에러거나 마지막 시도까지 실패하면 undefined를 반환한다(throw 안 함).
async function sendCollectMessageWithRetries(tabId: number): Promise<CollectResponse | undefined> {
  for (let attempt = 1; attempt <= RECOVERY_RETRY_ATTEMPTS; attempt++) {
    try {
      return await sendCollectMessage(tabId)
    }
    catch (error) {
      const isLastAttempt = attempt === RECOVERY_RETRY_ATTEMPTS
      if (!isConnectionError(error) || isLastAttempt) return undefined
      await new Promise(resolve => window.setTimeout(resolve, RECOVERY_RETRY_INTERVAL_MS))
    }
  }
  return undefined
}

type CollectState =
  | { status: 'idle' }
  | { status: 'loading' }
  // truncated: 페이지네이션이 정상 종료가 아니라 fetch 실패/렌더 타임아웃/상한 도달로
  // 중간에 멈췄을 때 true. count는 그때까지 모은 값이지만 실제로는 더 있을 수 있다는 뜻.
  | { status: 'success', count: number, truncated: boolean, deadlines?: DeadlineSummary }
  // (c) 0건 수집: 응답은 왔지만 count === 0. 에러가 아니라 "찾지 못함" — 파서 미스인지
  // 진짜 0건인지 유저가 구분할 수 있게 별도 상태로 둔다.
  | { status: 'empty', truncated: boolean }
  // (a) 미지원 페이지: platform이 애초에 감지되지 않음.
  | { status: 'unsupported' }
  // (b) 수집 실패: platform은 감지됐지만 tab.id 없음 / 복구 후에도 응답 없음 / 예외.
  | { status: 'error' }
  // (d) 같은 탭에서 이미 수집이 진행 중일 때 (재클릭 등). 실패가 아니라 "잠시 후 다시" 안내.
  | { status: 'busy' }

type CopyState = 'idle' | 'copied' | 'error'

const COPY_BUTTON_LABEL: Record<CopyState, string> = {
  idle: '전체 복사',
  copied: '복사됐어요',
  error: '복사 실패, 다시 시도해 주세요',
}

export function App() {
  const [platform, setPlatform] = useState<Platform | undefined>(undefined)
  const [collectState, setCollectState] = useState<CollectState>({ status: 'idle' })
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const { state: countsState, refresh: refreshSiteCounts } = useSiteCounts()
  const historyDisplay = useHistoryDisplay()
  const [resetConfirming, setResetConfirming] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [platformLoading, setPlatformLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [resetError, setResetError] = useState(false)
  const copyTimer = useRef<number | undefined>(undefined)
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    window.clearTimeout(copyTimer.current)
    window.clearTimeout(resetTimer.current)
  }, [])

  useEffect(() => {
    let cancelled = false

    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (cancelled) return
      setPlatform(detectPlatform(tab?.url))
    }).catch(() => {
      if (!cancelled) setPlatform(undefined)
    }).finally(() => {
      if (!cancelled) setPlatformLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const totalCount = countsState.status === 'ready'
    ? PLATFORM_ORDER.reduce((sum, p) => sum + countsState.counts[p], 0)
    : 0
  const hasAnyData = totalCount > 0

  async function handleCollect() {
    setCopyState('idle')
    setResetConfirming(false)
    setRecovering(false)

    if (!platform) {
      setCollectState({ status: 'unsupported' })
      return
    }

    setCollectState({ status: 'loading' })

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        setCollectState({ status: 'error' })
        return
      }

      let response: CollectResponse | undefined
      try {
        response = await sendCollectMessage(tab.id)
      }
      catch (error) {
        // 진짜 미지원 페이지가 아니라(platform은 감지됨) content script가 그 탭에
        // 없는 경우(SPA 내부 라우팅으로 진입했거나 익스텐션이 리로드된 뒤 새로고침 안 한 탭).
        // 새로고침 후 재시도한다. 이 에러가 아니면 복구를 시도하지 않고 바깥 catch로 넘긴다.
        if (!isConnectionError(error)) throw error

        setRecovering(true)
        // reload보다 먼저 호출해 리스너를 미리 붙인다 — reload 직후 곧바로 'complete'가
        // 나버리는 race를 피하기 위함(waitForTabComplete 주석 참고).
        const tabComplete = waitForTabComplete(tab.id, RECOVERY_TIMEOUT_MS)
        await chrome.tabs.reload(tab.id)
        await tabComplete
        response = await sendCollectMessageWithRetries(tab.id)
      }

      if (!response) {
        setCollectState({ status: 'error' })
        return
      }

      if (response.busy) {
        setCollectState({ status: 'busy' })
        return
      }

      if (response.error) {
        setCollectState({ status: 'error' })
        return
      }

      // 저장은 content script가 이미 끝냈다(팝업이 응답을 못 받아도 데이터가 남도록) —
      // 여기서는 최신 건수만 다시 읽어온다. 0건이어도 다른 사이트들과 동일하게 현황을 갱신하되,
      // 상태 표시만 'empty'로 분기해 "파서 미스 가능성"을 알린다.
      await refreshSiteCounts()

      const truncated = response.truncated ?? false
      if (response.count === 0) {
        setCollectState({ status: 'empty', truncated })
      }
      else {
        setCollectState({ status: 'success', count: response.count, truncated, deadlines: response.deadlines })
      }
    }
    catch {
      setCollectState({ status: 'error' })
    }
    finally {
      setRecovering(false)
    }
  }

  async function handleCopyAll() {
    window.clearTimeout(copyTimer.current)
    try {
      const applications = await getAllApplications()
      await copyRichText(applicationsToTsv(applications), applicationsToHtml(applications))
      setCopyState('copied')
    }
    catch {
      setCopyState('error')
    }

    copyTimer.current = window.setTimeout(() => setCopyState('idle'), 2000)
  }

  function handleOpenJobdiary() {
    // ?import=1: 웹앱이 이 신호로 자동 가져오기(pull)를 트리거한다 (웹앱 쪽 감지는 범위 밖).
    chrome.tabs.create({ url: `${WEBAPP_URL}/?import=1` })
  }

  async function handleReset() {
    setResetError(false)
    if (!resetConfirming) {
      setResetConfirming(true)
      window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setResetConfirming(false), 3000)
      return
    }

    window.clearTimeout(resetTimer.current)
    setResetting(true)
    try {
      await clearAll()
      await refreshSiteCounts()
      setCopyState('idle')
      setCollectState({ status: 'idle' })
    }
    catch {
      setResetError(true)
    }
    finally {
      setResetConfirming(false)
      setResetting(false)
    }
  }

  return (
    <div className="diary-popup">
      <header className="diary-brand">
        <img src="/logo-128.png" alt="취준일기 로고" className="h-6 w-6 grayscale" />
        <h1 className="text-sm font-semibold">취준일기</h1>
      </header>

      <div className="diary-content">
        <DiaryDate />
        <section className="diary-collect">
          <div className="diary-current-page">
            <span>현재 페이지</span>
            {platformLoading ? <span>확인 중…</span> : <PlatformBadge platform={platform} />}
          </div>
          <Button
            variant="primary"
            onClick={handleCollect}
            disabled={platformLoading || resetting || collectState.status === 'loading'}
          >
            {collectState.status === 'loading' ? '수집 중...' : '지원내역 수집하기'}
            <img className="diary-action-icon invert" src="/icons/arrow-down.svg" alt="" aria-hidden="true" />
          </Button>
          <div className="diary-collect-status" role="status" aria-atomic="true">
            {collectState.status === 'success' && (
              <>
                <p className="text-xs text-diary-secondary">
                  {collectState.count}
                  건 수집됨
                </p>
                {collectState.truncated && (
                  <p className="text-xs font-medium text-diary-ink">{TRUNCATED_MESSAGE}</p>
                )}
                {collectState.deadlines && (
                  <p className="text-xs text-diary-secondary">
                    {collectState.deadlines.lookupFailed
                      ? collectState.deadlines.matchedCount > 0
                        ? `마감일 ${collectState.deadlines.matchedCount}건 확인 · 일부 조회는 실패했어요. 지원내역은 저장됐어요.`
                        : '마감일을 확인하지 못했어요. 지원내역은 저장됐어요.'
                      : `마감일 ${collectState.deadlines.matchedCount}건 확인 · 나머지는 미확인이거나 날짜가 없어요.`}
                  </p>
                )}
              </>
            )}
            {collectState.status === 'empty' && (
              <>
                <p className="text-xs text-diary-secondary">{EMPTY_RESULT_MESSAGE}</p>
                {collectState.truncated && (
                  <p className="text-xs font-medium text-diary-ink">{TRUNCATED_MESSAGE}</p>
                )}
              </>
            )}
            {collectState.status === 'unsupported' && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-diary-secondary">{UNSUPPORTED_MESSAGE}</p>
                <div className="flex flex-col gap-1">
                  {SITE_APPLY_STATUS_LINKS.map(link => (
                    <button
                      key={link.platform}
                      type="button"
                      onClick={() => chrome.tabs.create({ url: link.url })}
                      className="text-left text-xs text-diary-ink underline underline-offset-2"
                    >
                      {link.label}
                      {' '}
                      바로가기
                    </button>
                  ))}
                </div>
              </div>
            )}
            {collectState.status === 'error' && (
              <p className="text-xs font-medium text-diary-ink">{COLLECT_FAILED_MESSAGE}</p>
            )}
            {collectState.status === 'busy' && (
              <p className="text-xs text-diary-secondary">{BUSY_MESSAGE}</p>
            )}
            {collectState.status === 'loading' && (
              <p className="text-xs text-diary-secondary">
                {recovering ? '페이지를 준비하는 중...' : '수집하는 중이에요…'}
              </p>
            )}
          </div>
        </section>

        <section className="diary-records" aria-label="저장된 지원내역" aria-busy={countsState.status === 'loading'}>
          <div role="status" aria-atomic="true">
            {countsState.status === 'loading' && <p className="text-xs text-diary-secondary">저장 내역 불러오는 중…</p>}
            {countsState.status === 'error' && <p className="text-xs font-medium text-diary-ink">저장 내역을 불러오지 못했어요.</p>}
          </div>
          {countsState.status === 'error' && <Button variant="secondary" onClick={() => void refreshSiteCounts()}>다시 불러오기</Button>}
          {countsState.status === 'ready' && <>
            <div className="diary-records-heading">
              <h2>수집한 지원 내역</h2>
              <p className="diary-total"><span className="sr-only">전체 </span><strong>{totalCount}</strong>건</p>
            </div>
            <ul className="diary-site-counts">
              {PLATFORM_ORDER.map(p => (
                <li key={p}>
                  <span>{PLATFORM_LABEL[p]}</span>
                  <span className="diary-count">{countsState.counts[p]}<small>건</small></span>
                </li>
              ))}
            </ul>
          </>}
          <div className="diary-tools">
            <Button variant="compact" onClick={handleCopyAll} disabled={!hasAnyData || resetting}>
              {COPY_BUTTON_LABEL[copyState]}
            </Button>
            {hasAnyData && (
              <Button variant="compact" onClick={handleReset} disabled={resetting || collectState.status === 'loading'}>
                {resetting ? '초기화 중…' : resetConfirming ? '다시 누르면 수집 내역 삭제' : '수집 내역 초기화'}
              </Button>
            )}
          </div>
          <p role="status" aria-atomic="true" className="sr-only">{copyState === 'idle' ? '' : COPY_BUTTON_LABEL[copyState]}</p>
          {resetError && <p role="alert" className="text-xs font-medium text-diary-ink">초기화하지 못했어요. 다시 시도해 주세요.</p>}
        </section>

        <HistoryDisplayPanel state={historyDisplay.state} saving={historyDisplay.saving} error={historyDisplay.error}
          onToggle={enabled => void historyDisplay.setEnabled(enabled)} onRefresh={() => void historyDisplay.refresh()}
          onOpenHistory={() => void chrome.tabs.create({ url: WEBAPP_URL })} />

        <Button variant="secondary" onClick={handleOpenJobdiary}>
          취준일기로 가져오기
          <img className="diary-action-icon" src="/icons/arrow-right.svg" alt="" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
