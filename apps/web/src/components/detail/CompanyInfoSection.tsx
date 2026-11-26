'use client';

import { useEffect, useState } from 'react';
import { getPostingReference } from '@jobdiary/shared';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { COMPANY_INFO_DAILY_LIMIT, fetchCompanyInfo, naverMapHref, requestCompanyInfo, websiteHref } from '@/lib/companyInfoApi';
import { PostingPageError, preparePostingPage, readPostingFromExtension } from '@/lib/postingPage';
import type { CompanyInfo } from '@/types/companyInfo';
import { formatKoreanDateTime } from '@/utils/format';
import { IMAGE_SLICE } from '@/utils/postingImageSlices';

interface CompanyInfoSectionProps {
  applicationId: string;
  postingUrl?: string; // 지원에 저장된 공고 주소. 잡코리아·사람인·원티드 공고여야 회사 정보를 만들 수 있다(#238, #242)
  // 만들 수 있는 단계인지(#242): ready 서류 통과 이후 · early 지원 완료(서류 통과하면 만들 수 있다고 안내) · closed 탈락·취소
  // 만들 수 없는 단계여도 이미 만든 결과는 보여 준다(다시 만들기만 숨김).
  stage: 'ready' | 'early' | 'closed';
}

const PLATFORM_NAME = { jobkorea: '잡코리아', saramin: '사람인', wanted: '원티드' } as const;

type Phase = 'idle' | 'reading' | 'preparing' | 'creating';

const PROGRESS_TEXT: Record<Exclude<Phase, 'idle'>, string> = {
  reading: '익스텐션이 공고 페이지를 읽고 있어요.',
  preparing: '공고 이미지를 받고 있어요.',
  creating: '공고를 읽고 정리하고 있어요. 20초쯤 걸려요.',
};

// 지원 상세의 "회사 정보" (#229, 결정 기록 002·003). 익스텐션이 저장된 공고 페이지를 읽어 오면 서버(Edge Function)가
// Claude로 회사 소개·이 공고가 원하는 강점(공고 원문 근거)·근무 조건을 정리한다. 결과는 본인 것만 저장·조회된다.
// #242: 캡처·글 붙여넣기는 없앴다. 공고 페이지에서 가져오기가 근무지까지 정확하고 손이 덜 가서(사용자 결정) 입력을 하나로 줄였다.
// 부모가 지원마다 key를 바꿔 다시 그리므로 처음 상태는 항상 "불러오는 중"이다.
export function CompanyInfoSection({ applicationId, postingUrl, stage }: CompanyInfoSectionProps) {
  // ── 상태 ──
  const pageReference = getPostingReference(postingUrl);
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [isEditing, setIsEditing] = useState(false); // 결과가 있는데 다시 만들기를 누른 상태
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const isBusy = phase !== 'idle';

  // ── 저장된 회사 정보 불러오기(패널을 열 때 한 번) ──
  useEffect(() => {
    let isCurrent = true;
    void fetchCompanyInfo(applicationId).then((loaded) => {
      if (!isCurrent) return;
      setInfo(loaded.data);
      setLoadState(loaded.error ? 'failed' : 'ready');
    });
    return () => {
      isCurrent = false;
    };
  }, [applicationId]);

  // ── 처리 함수 ──
  // 공고 페이지에서 가져오기(#238): 익스텐션이 공고 페이지를 읽고 → 본문 이미지를 받아 나누고 → 회사 정보를 만든다.
  const handleFromPage = async () => {
    if (isBusy || !pageReference) return;
    setError(null);
    setNotice(null);
    try {
      setPhase('reading');
      const posting = await readPostingFromExtension(pageReference.url);
      setPhase('preparing');
      const page = await preparePostingPage(posting, IMAGE_SLICE.maxSlices);
      setPhase('creating');
      const result = await requestCompanyInfo(applicationId, { postingPage: page }, info !== null);
      if (result.error || !result.data) {
        setError(result.error);
        return;
      }
      setInfo(result.data);
      setIsEditing(false);
      setNotice(result.cached ? '같은 공고로 만든 회사 정보를 불러왔어요. 오늘 횟수는 쓰지 않았어요.' : '회사 정보를 만들었어요.');
    } catch (caught) {
      setError(caught instanceof PostingPageError ? caught.message : '공고 페이지에서 가져오지 못했어요. 잠시 후 다시 해 주세요.');
    } finally {
      setPhase('idle');
    }
  };

  // ── 보여 줄 것 정하기 ──
  const canCreate = stage === 'ready';
  const showForm = canCreate && loadState === 'ready' && (info === null || isEditing);
  // 탈락·취소한 지원에 결과가 없으면 구역 자체를 숨긴다
  if (stage === 'closed' && loadState === 'ready' && !info) return null;

  return (
    <section aria-labelledby="panel-company-title" aria-busy={loadState === 'loading' || isBusy} className="flex flex-col gap-3">
      <h3 id="panel-company-title" className="text-label font-semibold text-text-secondary">
        회사 정보
      </h3>

      {/* ── 불러오는 중·실패 ── */}
      {loadState === 'loading' && <p className="text-label text-text-secondary">회사 정보를 불러오는 중이에요.</p>}
      {loadState === 'failed' && <p className="text-label text-text-secondary">회사 정보를 불러오지 못했어요. 패널을 닫았다가 다시 열어 주세요.</p>}

      {/* ── 결과 카드 ── */}
      {loadState === 'ready' && info && !isEditing && (
        <CompanyInfoResult
          info={info}
          canRegenerate={canCreate}
          onRegenerate={() => {
            setIsEditing(true);
            setNotice(null);
            setError(null);
          }}
        />
      )}

      {/* ── 서류 통과 전 안내 ── */}
      {stage === 'early' && loadState === 'ready' && !info && (
        <p className="break-keep text-label text-text-secondary">서류 통과로 바꾸면 이 회사가 하는 일과 공고가 원하는 강점을 정리해 드려요.</p>
      )}

      {/* ── 만들기: 안내 문구 → 버튼 → 진행·오류 ── */}
      {showForm && (
        <div role="group" aria-label={info ? '회사 정보 다시 만들기' : '회사 정보 만들기'} className="flex flex-col gap-3 rounded-lg bg-subtle p-4">
          {pageReference ? (
            <>
              {/* 한글은 단어 중간에서 줄이 끊기지 않게 break-keep (#242 피드백) */}
              <p className="break-keep text-label text-text-primary">
                {PLATFORM_NAME[pageReference.platform]} 공고를 읽고 회사 소개, 원하는 강점, 근무 조건을 정리해 드려요.
              </p>
              <p className="break-keep text-caption font-normal text-text-secondary">
                공고 내용만 AI(Anthropic)에 보내요 · 하루 {COMPANY_INFO_DAILY_LIMIT}번까지
              </p>
            </>
          ) : (
            <p className="break-keep text-label text-text-secondary">
              잡코리아·사람인·원티드 공고 주소가 있어야 정리할 수 있어요. &ldquo;정보 수정&rdquo;에서 공고 주소를 넣어 주세요.
            </p>
          )}
          {(pageReference || info) && (
            <div className="flex flex-wrap justify-end gap-2">
              {info && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                >
                  취소
                </Button>
              )}
              {pageReference && (
                <Button size="sm" isLoading={isBusy} loadingLabel={phase === 'reading' ? '공고 페이지 읽는 중' : '만드는 중'} onClick={() => void handleFromPage()}>
                  공고 페이지에서 가져오기
                </Button>
              )}
            </div>
          )}
          {isBusy && <p className="text-label text-text-secondary">{PROGRESS_TEXT[phase as Exclude<Phase, 'idle'>]}</p>}
          <p role="alert" className={error ? 'text-label text-danger-text' : 'sr-only'}>
            {error}
          </p>
        </div>
      )}

      {/* ── 완료 알림 ── */}
      <p role="status" className={notice ? 'text-label font-semibold text-success-text' : 'sr-only'}>
        {notice}
      </p>
    </section>
  );
}

const SUMMARY_CLASS =
  'flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden';
const LINK_CLASS = 'text-text-brand underline underline-offset-2';

// 결과 (#235): 이 회사는 → 원하는 강점(넣으면 좋은 경험) → 근무 조건. 정보는 꼭 필요한 것만 둔다(사용자 피드백).
// 판은 흰 바탕 + 얇은 테두리, 강점 줄은 회색으로 구분한다(#229: 회색 판 위 회색 부품은 경계가 사라졌다).
function CompanyInfoResult({ info, canRegenerate, onRegenerate }: { info: CompanyInfo; canRegenerate: boolean; onRegenerate: () => void }) {
  const website = websiteHref(info.website);
  const mapHref = naverMapHref(info.location);
  const hasWorkplace = Boolean(info.location || info.workDays || info.workHours);

  return (
    <div className="flex flex-col gap-5 rounded-lg p-4 ring-1 ring-inset ring-line-divider">
      {/* ── 1. 이 회사는: 소개·대표 서비스·대표 사이트 ── */}
      <div className="flex flex-col gap-2">
        <h4 className="text-label font-semibold text-text-primary">이 회사는</h4>
        {info.about ? <p className="text-body text-text-primary">{info.about}</p> : <p className="text-label text-text-secondary">공고에서 회사 소개를 찾지 못했어요.</p>}
        {(info.products.length > 0 || website) && (
          <div className="flex flex-wrap items-center gap-2">
            {info.products.map((product) => (
              <Badge key={product}>{product}</Badge>
            ))}
            {website && (
              <a href={website} target="_blank" rel="noopener noreferrer" className={`text-label ${LINK_CLASS}`}>
                대표 사이트
                <span className="sr-only"> (새 탭에서 열림)</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* ── 2. 원하는 강점: 강점 → 원하는 모습 → 넣으면 좋은 경험 → 공고 근거(접힘) ── */}
      <div className="flex flex-col gap-2">
        <h4 className="text-label font-semibold text-text-primary">이 공고가 원하는 강점</h4>
        {info.strengths.length === 0 ? (
          <p className="text-label text-text-secondary">공고에서 인재상 근거를 찾지 못했어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {info.strengths.map((item, index) => (
              <li key={`${item.strength}-${index}`} className="flex flex-col gap-2 rounded-md bg-subtle p-3">
                <p className="text-body font-semibold text-text-primary">{item.strength}</p>
                {item.wants && <p className="text-label text-text-primary">{item.wants}</p>}
                {item.experiences.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <p className="text-label font-semibold text-text-brand">이런 경험을 넣으면 좋아요</p>
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-label text-text-secondary">
                      {item.experiences.map((experience) => (
                        <li key={experience}>{experience}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* 근거(공고 원문)는 접어 둔다. 기본 details/summary라 키보드·펼침 상태 읽기를 브라우저가 맡는다 */}
                <details className="group">
                  <summary className={`${SUMMARY_CLASS} -mx-3 -mb-1 text-caption font-normal text-text-secondary`}>
                    <span>
                      <span className="group-open:hidden">공고 근거 보기</span>
                      <span className="hidden group-open:inline">공고 근거 접기</span>
                    </span>
                  </summary>
                  <blockquote className="mt-2 border-l-2 border-line-divider pl-3 text-label text-text-secondary">
                    <span className="sr-only">공고 원문: </span>
                    {item.quote}
                  </blockquote>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── 3. 근무 조건: 근무지(지도 링크)·근무일·근무 시간 ── */}
      {hasWorkplace && (
        <div className="flex flex-col gap-2">
          <h4 className="text-label font-semibold text-text-primary">근무 조건</h4>
          <dl className="grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-label">
            {info.location && (
              <>
                <dt className="text-text-secondary">근무지</dt>
                <dd className="text-text-primary">
                  {mapHref ? (
                    <a href={mapHref} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                      {info.location}
                      <span className="sr-only"> (네이버 지도에서 보기, 새 탭에서 열림)</span>
                    </a>
                  ) : (
                    info.location
                  )}
                </dd>
              </>
            )}
            {info.workDays && (
              <>
                <dt className="text-text-secondary">근무일</dt>
                <dd className="text-text-primary">{info.workDays}</dd>
              </>
            )}
            {info.workHours && (
              <>
                <dt className="text-text-secondary">근무 시간</dt>
                <dd className="text-text-primary">{info.workHours}</dd>
              </>
            )}
          </dl>
        </div>
      )}

      {/* ── 아래: 기준 시각·AI 안내·다시 만들기 ── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-normal text-text-secondary">
          {formatKoreanDateTime(info.createdAt)} 기준{info.fromImage ? ' · 이미지에서 읽은 내용' : ''} · AI가 정리한 내용이라 틀릴 수 있어요.
        </p>
        {canRegenerate && (
          <Button variant="secondary" size="sm" onClick={onRegenerate}>
            다시 만들기
          </Button>
        )}
      </div>
    </div>
  );
}
