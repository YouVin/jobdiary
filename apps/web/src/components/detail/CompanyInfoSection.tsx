'use client';

import { useEffect, useId, useRef, useState, type ClipboardEvent, type DragEvent } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { TextAreaField } from '@/components/ui/TextField';
import {
  COMPANY_INFO_DAILY_LIMIT,
  COMPANY_INFO_MAX_LENGTH,
  COMPANY_INFO_MIN_LENGTH,
  fetchCompanyInfo,
  naverMapHref,
  requestCompanyInfo,
  websiteHref,
  type CompanyInfoPosting,
} from '@/lib/companyInfoApi';
import { MAX_POSTING_IMAGE_BYTES, MAX_POSTING_IMAGE_FILES, POSTING_IMAGE_TYPES, slicePostingImage } from '@/lib/postingImage';
import type { CompanyInfo } from '@/types/companyInfo';
import { formatKoreanDateTime } from '@/utils/format';
import { IMAGE_SLICE } from '@/utils/postingImageSlices';

interface CompanyInfoSectionProps {
  applicationId: string;
}

interface PickedImage {
  id: number;
  file: File;
  previewUrl: string; // 미리보기용 blob 주소. 빼거나 구역이 사라질 때 해제한다
}

type Phase = 'idle' | 'preparing' | 'creating';

// 지원 상세의 "회사 정보" (#229, #232, 결정 기록 002). 공고를 넣으면 서버(Edge Function)가 Claude로
// 회사 한 줄 소개·이 공고가 원하는 강점(공고 원문 근거)·기술을 정리한다. 결과는 본인 것만 저장·조회된다.
// 채용 공고 본문은 이미지인 경우가 많아 이미지(캡처 붙여넣기·파일·끌어 놓기)가 기본이고, 글 붙여넣기는 보조다.
// 부모가 지원마다 key를 바꿔 다시 그리므로 처음 상태는 항상 "불러오는 중"이다.
export function CompanyInfoSection({ applicationId }: CompanyInfoSectionProps) {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [isEditing, setIsEditing] = useState(false); // 결과가 있는데 다시 만들기를 누른 상태
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [posting, setPosting] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextImageId = useRef(1);
  const previewUrls = useRef(new Set<string>());
  const imageHintId = useId();
  const imageErrorId = useId();
  const isBusy = phase !== 'idle';

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

  // 구역이 사라지면 남은 미리보기 주소를 해제한다.
  useEffect(() => {
    const urls = previewUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    const accepted: PickedImage[] = [];
    let rejected = false;
    for (const file of files) {
      if (!POSTING_IMAGE_TYPES.includes(file.type) || file.size > MAX_POSTING_IMAGE_BYTES || images.length + accepted.length >= MAX_POSTING_IMAGE_FILES) {
        rejected = true;
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.add(previewUrl);
      accepted.push({ id: nextImageId.current, file, previewUrl });
      nextImageId.current += 1;
    }
    setImages((current) => [...current, ...accepted]);
    setError(rejected ? `이미지는 PNG·JPG·WebP·GIF만, 파일당 20MB까지, 최대 ${MAX_POSTING_IMAGE_FILES}장까지 넣을 수 있어요.` : null);
  };

  const removeImage = (target: PickedImage) => {
    URL.revokeObjectURL(target.previewUrl);
    previewUrls.current.delete(target.previewUrl);
    setImages((current) => current.filter((image) => image.id !== target.id));
  };

  // 캡처를 Ctrl+V로 붙여 넣으면 이미지로 받는다. 이미지 칸에 글을 붙여 넣으면 글 붙여넣기로 바꿔 준다.
  const handlePaste = (event: ClipboardEvent<HTMLFormElement>) => {
    if (isBusy) return;
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
    if (files.length > 0) {
      event.preventDefault();
      setInputMode('image');
      addFiles(files);
      return;
    }
    const text = event.clipboardData.getData('text/plain');
    if (inputMode === 'image' && text.trim()) {
      event.preventDefault();
      setInputMode('text');
      setPosting(text.slice(0, COMPANY_INFO_MAX_LENGTH));
      setError(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!isBusy) addFiles(Array.from(event.dataTransfer.files));
  };

  const preparePosting = async (): Promise<CompanyInfoPosting | null> => {
    if (inputMode === 'text') {
      const text = posting.trim();
      if (text.length < COMPANY_INFO_MIN_LENGTH) {
        setError(`공고 내용이 너무 짧아요. 주요 업무와 자격 요건이 들어가게 붙여 넣어 주세요. (지금 ${text.length}자 · ${COMPANY_INFO_MIN_LENGTH}자 이상)`);
        return null;
      }
      return { postingText: text };
    }
    if (images.length === 0) {
      setError('공고 이미지를 넣어 주세요. 공고 화면을 캡처해 Ctrl+V로 붙여 넣을 수 있어요.');
      return null;
    }
    setPhase('preparing');
    try {
      const pieces = [];
      for (const image of images) pieces.push(...(await slicePostingImage(image.file)));
      if (pieces.length > IMAGE_SLICE.maxSlices) {
        setError(`이미지가 너무 길어요(조각 ${pieces.length}개, 최대 ${IMAGE_SLICE.maxSlices}개). 공고 본문 부분만 캡처해 주세요.`);
        return null;
      }
      return { postingImages: pieces };
    } catch {
      setError('이미지를 읽지 못했어요. 다른 형식으로 저장하거나 다시 캡처해 주세요.');
      return null;
    }
  };

  const handleCreate = async () => {
    if (isBusy) return;
    setError(null);
    setNotice(null);
    const prepared = await preparePosting();
    if (!prepared) {
      setPhase('idle');
      return;
    }
    setPhase('creating');
    const result = await requestCompanyInfo(applicationId, prepared, info !== null);
    setPhase('idle');
    if (result.error || !result.data) {
      setError(result.error);
      return;
    }
    for (const image of images) URL.revokeObjectURL(image.previewUrl);
    previewUrls.current.clear();
    setImages([]);
    setPosting('');
    setInfo(result.data);
    setIsEditing(false);
    setNotice(result.cached ? '같은 공고로 만든 회사 정보를 불러왔어요. 오늘 횟수는 쓰지 않았어요.' : '회사 정보를 만들었어요.');
  };

  const showForm = loadState === 'ready' && (info === null || isEditing);
  const progressText = phase === 'preparing'
    ? '이미지를 나누고 있어요.'
    : inputMode === 'image'
      ? '이미지에서 공고를 읽고 정리하고 있어요. 20초쯤 걸려요.'
      : '공고를 읽고 정리하고 있어요. 10초쯤 걸려요.';

  return (
    <section aria-labelledby="panel-company-title" aria-busy={loadState === 'loading' || isBusy} className="flex flex-col gap-3">
      <h3 id="panel-company-title" className="text-label font-semibold text-text-secondary">
        회사 정보
      </h3>

      {loadState === 'loading' && <p className="text-label text-text-secondary">회사 정보를 불러오는 중이에요.</p>}
      {loadState === 'failed' && <p className="text-label text-text-secondary">회사 정보를 불러오지 못했어요. 패널을 닫았다가 다시 열어 주세요.</p>}

      {loadState === 'ready' && info && !isEditing && (
        <CompanyInfoResult
          info={info}
          onRegenerate={() => {
            setIsEditing(true);
            setNotice(null);
            setError(null);
          }}
        />
      )}

      {showForm && (
        <form
          aria-label={info ? '회사 정보 다시 만들기' : '회사 정보 만들기'}
          className="flex flex-col gap-3 rounded-lg bg-subtle p-4"
          onPaste={handlePaste}
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          {!info && <p className="text-label text-text-secondary">공고 화면을 캡처해 넣으면 이 공고가 원하는 강점과 기술을 정리해 드려요.</p>}

          {inputMode === 'image' ? (
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={POSTING_IMAGE_TYPES.join(',')}
                multiple
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only"
                onChange={(event) => {
                  addFiles(Array.from(event.target.files ?? []));
                  event.target.value = ''; // 같은 파일을 다시 고를 수 있게
                }}
              />
              <button
                type="button"
                disabled={isBusy}
                aria-describedby={error ? `${imageHintId} ${imageErrorId}` : imageHintId}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed border-line-input bg-surface px-4 py-6 text-center transition-colors duration-fast ease-soft hover:bg-page focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed"
              >
                <span className="text-body font-semibold text-text-primary">공고 이미지 넣기</span>
                <span className="text-label text-text-secondary">눌러서 고르거나, 캡처한 뒤 Ctrl+V로 붙여 넣으세요</span>
              </button>
              {images.length > 0 && (
                <ul aria-label="넣은 공고 이미지" className="flex flex-wrap gap-3 pt-2">
                  {images.map((image, index) => (
                    <li key={image.id} className="relative">
                      {/* 붙여 넣은 파일의 blob 미리보기라 next/image(원격 이미지 최적화)를 쓸 수 없다 */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.previewUrl} alt={`공고 이미지 ${index + 1}`} className="h-20 w-16 rounded-sm object-cover object-top ring-1 ring-line-divider" />
                      <IconButton
                        size="sm"
                        icon="close"
                        label={`공고 이미지 ${index + 1} 빼기`}
                        disabled={isBusy}
                        onClick={() => removeImage(image)}
                        className="absolute -top-2 -right-2 bg-surface shadow-sm"
                      />
                    </li>
                  ))}
                </ul>
              )}
              <p id={imageHintId} className="text-label text-text-secondary">
                공고 이미지만 AI(Anthropic)로 보내 정리해요 · 이미지는 저장하지 않아요 · 새로 만들기는 하루 {COMPANY_INFO_DAILY_LIMIT}번
              </p>
              <p id={imageErrorId} role="alert" className={error ? 'text-label text-danger-text' : 'sr-only'}>
                {error}
              </p>
            </div>
          ) : (
            <TextAreaField
              label="공고 내용"
              value={posting}
              maxLength={COMPANY_INFO_MAX_LENGTH}
              rows={4}
              placeholder="공고의 주요 업무, 자격 요건, 우대 사항을 복사해 붙여 넣어 주세요."
              hint={`공고 내용만 AI(Anthropic)로 보내 정리해요 · 새로 만들기는 하루 ${COMPANY_INFO_DAILY_LIMIT}번`}
              error={error}
              readOnly={isBusy}
              onChange={(event) => {
                setPosting(event.target.value);
                if (error) setError(null);
              }}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="text"
              size="sm"
              disabled={isBusy}
              onClick={() => {
                setInputMode(inputMode === 'image' ? 'text' : 'image');
                setError(null);
              }}
            >
              {inputMode === 'image' ? '글로 붙여넣기' : '이미지로 넣기'}
            </Button>
            <div className="flex gap-2">
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
              <Button type="submit" size="sm" isLoading={isBusy} loadingLabel={phase === 'preparing' ? '이미지 준비 중' : '만드는 중'}>
                {info ? '다시 만들기' : '회사 정보 만들기'}
              </Button>
            </div>
          </div>
          {isBusy && <p className="text-label text-text-secondary">{progressText}</p>}
        </form>
      )}

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
function CompanyInfoResult({ info, onRegenerate }: { info: CompanyInfo; onRegenerate: () => void }) {
  const website = websiteHref(info.website);
  const mapHref = naverMapHref(info.location);
  const hasWorkplace = Boolean(info.location || info.workDays || info.workHours);

  return (
    <div className="flex flex-col gap-5 rounded-lg p-4 ring-1 ring-inset ring-line-divider">
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-normal text-text-secondary">
          {formatKoreanDateTime(info.createdAt)} 기준{info.fromImage ? ' · 이미지에서 읽은 내용' : ''} · AI가 정리한 내용이라 틀릴 수 있어요.
        </p>
        <Button variant="secondary" size="sm" onClick={onRegenerate}>
          다시 만들기
        </Button>
      </div>
    </div>
  );
}
