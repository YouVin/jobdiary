'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TextAreaField } from '@/components/ui/TextField';
import {
  COMPANY_INFO_DAILY_LIMIT,
  COMPANY_INFO_MAX_LENGTH,
  COMPANY_INFO_MIN_LENGTH,
  fetchCompanyInfo,
  requestCompanyInfo,
} from '@/lib/companyInfoApi';
import type { CompanyInfo } from '@/types/companyInfo';
import { formatKoreanDateTime } from '@/utils/format';

interface CompanyInfoSectionProps {
  applicationId: string;
}

// 지원 상세의 "회사 정보" (#229, 결정 기록 002). 공고를 붙여 넣으면 서버(Edge Function)가 Claude로
// 회사 한 줄 소개·이 공고가 원하는 강점(공고 원문 근거)·기술을 정리한다. 결과는 본인 것만 저장·조회된다.
// 부모가 지원마다 key를 바꿔 다시 그리므로 처음 상태는 항상 "불러오는 중"이다.
export function CompanyInfoSection({ applicationId }: CompanyInfoSectionProps) {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [isEditing, setIsEditing] = useState(false); // 결과가 있는데 다시 만들기를 누른 상태
  const [posting, setPosting] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  const handleCreate = async () => {
    if (isCreating) return;
    const text = posting.trim();
    if (text.length < COMPANY_INFO_MIN_LENGTH) {
      setError(`공고 내용이 너무 짧아요. 주요 업무와 자격 요건이 들어가게 붙여 넣어 주세요. (지금 ${text.length}자 · ${COMPANY_INFO_MIN_LENGTH}자 이상)`);
      return;
    }
    setIsCreating(true);
    setError(null);
    setNotice(null);
    const result = await requestCompanyInfo(applicationId, text, info !== null);
    setIsCreating(false);
    if (result.error || !result.data) {
      setError(result.error);
      return;
    }
    setInfo(result.data);
    setIsEditing(false);
    setPosting('');
    setNotice(result.cached ? '같은 공고로 만든 회사 정보를 불러왔어요. 오늘 횟수는 쓰지 않았어요.' : '회사 정보를 만들었어요.');
  };

  const showForm = loadState === 'ready' && (info === null || isEditing);

  return (
    <section aria-labelledby="panel-company-title" aria-busy={loadState === 'loading' || isCreating} className="flex flex-col gap-3">
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
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate();
          }}
        >
          {!info && <p className="text-label text-text-secondary">공고 내용을 붙여 넣으면 이 공고가 원하는 강점과 기술을 정리해 드려요.</p>}
          <TextAreaField
            label="공고 내용"
            value={posting}
            maxLength={COMPANY_INFO_MAX_LENGTH}
            rows={4}
            placeholder="공고의 주요 업무, 자격 요건, 우대 사항을 복사해 붙여 넣어 주세요."
            hint={`공고 내용만 AI(Anthropic)로 보내 정리해요 · 새로 만들기는 하루 ${COMPANY_INFO_DAILY_LIMIT}번`}
            error={error}
            readOnly={isCreating}
            onChange={(event) => {
              setPosting(event.target.value);
              if (error) setError(null);
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span aria-hidden="true" className="text-caption font-normal text-text-secondary tabular-nums">
              {posting.length.toLocaleString('ko-KR')} / {COMPANY_INFO_MAX_LENGTH.toLocaleString('ko-KR')}
            </span>
            <div className="flex gap-2">
              {info && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isCreating}
                  onClick={() => {
                    setIsEditing(false);
                    setError(null);
                  }}
                >
                  취소
                </Button>
              )}
              <Button type="submit" size="sm" isLoading={isCreating} loadingLabel="만드는 중">
                {info ? '다시 만들기' : '회사 정보 만들기'}
              </Button>
            </div>
          </div>
          {isCreating && <p className="text-label text-text-secondary">공고를 읽고 정리하고 있어요. 10초쯤 걸려요.</p>}
        </form>
      )}

      <p role="status" className={notice ? 'text-label font-semibold text-success-text' : 'sr-only'}>
        {notice}
      </p>
    </section>
  );
}

function SkillList({ label, skills }: { label: string; skills: string[] }) {
  return (
    <>
      <dt className="text-label text-text-secondary">{label}</dt>
      <dd className="flex flex-wrap gap-1">
        {skills.length === 0 ? (
          <span className="text-label text-text-secondary">없음</span>
        ) : (
          skills.map((skill) => <Badge key={skill}>{skill}</Badge>)
        )}
      </dd>
    </>
  );
}

// 결과 판은 흰 바탕 + 얇은 테두리다. 회색 판(bg-subtle) 위에 기본 뱃지·보조 버튼(둘 다 bg-subtle)을 올리면
// 경계가 사라져 글자만 떠 보였다(#229 스크린샷). 강점 줄은 회색으로 두어 판과 구분한다.
function CompanyInfoResult({ info, onRegenerate }: { info: CompanyInfo; onRegenerate: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg p-4 ring-1 ring-inset ring-line-divider">
      {info.summary && <p className="text-body text-text-primary">{info.summary}</p>}

      <div className="flex flex-col gap-2">
        <h4 className="text-label font-semibold text-text-primary">이 공고가 원하는 강점</h4>
        {info.strengths.length === 0 ? (
          <p className="text-label text-text-secondary">공고에서 인재상 근거를 찾지 못했어요. 기술 요구를 참고해 주세요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {info.strengths.map((item, index) => (
              <li key={`${item.strength}-${index}`}>
                {/* 기본 details/summary: 키보드(Enter·Space)와 펼침 상태 읽기를 브라우저가 맡는다 */}
                <details className="group rounded-md bg-subtle">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-md px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring [&::-webkit-details-marker]:hidden">
                    <span className="text-body font-semibold text-text-primary">{item.strength}</span>
                    <span aria-hidden="true" className="text-caption font-normal text-text-secondary group-open:hidden">
                      근거 보기
                    </span>
                    <span aria-hidden="true" className="hidden text-caption font-normal text-text-secondary group-open:inline">
                      접기
                    </span>
                  </summary>
                  {/* 위 여백: 요약 줄의 포커스 테두리(바깥 2px + 3px)가 인용 첫 줄을 가리지 않게 */}
                  <div className="flex flex-col gap-2 px-3 pt-2 pb-3">
                    <blockquote className="border-l-2 border-line-divider pl-3 text-label text-text-secondary">
                      <span className="sr-only">공고 원문: </span>
                      {item.quote}
                    </blockquote>
                    {item.reason && <p className="text-label text-text-primary">{item.reason}</p>}
                    {item.prepQuestion && (
                      <p className="text-label text-text-secondary">
                        <span className="font-semibold text-text-primary">준비할 질문 </span>
                        {item.prepQuestion}
                      </p>
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-label font-semibold text-text-primary">기술</h4>
        <dl className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2">
          <SkillList label="필수" skills={info.requiredSkills} />
          <SkillList label="우대" skills={info.preferredSkills} />
        </dl>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-caption font-normal text-text-secondary">
          {formatKoreanDateTime(info.createdAt)} 기준 · AI가 공고를 정리한 내용이라 틀릴 수 있어요.
        </p>
        <Button variant="secondary" size="sm" onClick={onRegenerate}>
          다시 만들기
        </Button>
      </div>
    </div>
  );
}
