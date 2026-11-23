'use client';

import { useState } from 'react';
import { BarChart } from '@/components/charts/BarChart';
import { RatioBar } from '@/components/charts/RatioBar';
import { Badge, StageDot } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CalendarCell } from '@/components/ui/CalendarCell';
import { Card, CardHeader, CardSummary } from '@/components/ui/Card';
import { CompanyRow, RowList } from '@/components/ui/CompanyRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChipGroup, FilterChip } from '@/components/ui/FilterChip';
import { IconButton } from '@/components/ui/IconButton';
import { Dialog, SidePanel } from '@/components/ui/Overlay';
import { StageTrack } from '@/components/ui/StageTrack';
import { StatCell, StatGroup } from '@/components/ui/StatCell';
import { Tabs } from '@/components/ui/Tabs';
import { PasswordField, SearchInput, TextField } from '@/components/ui/TextField';
import { MAIN_CONTENT_ID } from '@/components/ui/SkipLink';
import { ToastProvider, useToast } from '@/components/ui/Toast';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

// 견본용 예시 값이다. 실제 사용자 데이터가 아니다.
const SITES = [
  { value: 'all', label: '전체', count: 50 },
  { value: 'jobkorea', label: '잡코리아', count: 27 },
  { value: 'saramin', label: '사람인', count: 21 },
  { value: 'wanted', label: '원티드', count: 2 },
];
const WEEKS = [
  { key: 'w1', label: '10.26', value: 8 },
  { key: 'w2', label: '11.2', value: 2 },
  { key: 'w3', label: '11.9', value: 1 },
  { key: 'w4', label: '11.16', value: 10, isHighlighted: true },
  { key: 'w5', label: '이번 주', value: 0 },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      {children}
    </Card>
  );
}

function ShowcaseBody() {
  const showToast = useToast();
  const [view, setView] = useState('week');
  const [site, setSite] = useState('all');
  const [stageIndex, setStageIndex] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-300 flex-col gap-4 px-5 py-8 sm:px-10">
      <div className="flex flex-col gap-1 px-1 pb-4">
        <p className="text-label font-semibold text-text-brand">개발 전용 · #201</p>
        <h1 className="text-title-1-sm text-text-primary sm:text-title-1">공통 부품 견본</h1>
        <p className="text-body text-text-secondary">디자인 시스템과 같은 이름의 부품이에요. 키보드(Tab·Enter·Esc)로도 모두 써 볼 수 있어요.</p>
      </div>

      <Section title="버튼">
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg">로그인</Button>
          <Button icon="plus">지원 추가</Button>
          <Button size="sm">저장</Button>
          <Button disabled>지원 추가</Button>
          <Button isLoading loadingLabel="저장하는 중">저장</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" icon="download">익스텐션에서 가져오기</Button>
          <Button variant="outline">Google로 계속하기</Button>
          <Button variant="text">지원 보드에서 보기</Button>
          <Button variant="danger">삭제</Button>
          <IconButton label="수정" icon="pencil" />
          <IconButton label="공고 열기" icon="external" />
        </div>
      </Section>

      <Section title="입력칸">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="이메일" type="email" placeholder="you@example.com" autoComplete="email" />
          <PasswordField label="비밀번호" placeholder="6자 이상" hint="영문·숫자를 섞어 6자 이상" autoComplete="new-password" />
          <TextField label="이메일" type="email" defaultValue="jobdiary" error="이메일 형식을 확인해 주세요" />
          <TextField label="회사" defaultValue="수정할 수 없어요" disabled />
        </div>
        <SearchInput label="회사나 직무 검색" placeholder="회사나 직무 검색" />
      </Section>

      <Section title="탭 · 필터 칩">
        <Tabs
          label="보기 선택"
          value={view}
          onChange={setView}
          items={[
            { value: 'week', label: '주간' },
            { value: 'kanban', label: '보드' },
            { value: 'dup', label: '중복', count: 2, countTone: 'danger' },
          ]}
        />
        <ChipGroup label="지원 경로">
          {SITES.map((item) => (
            <FilterChip key={item.value} isSelected={site === item.value} count={item.count} onClick={() => setSite(item.value)}>
              {item.label}
            </FilterChip>
          ))}
        </ChipGroup>
      </Section>

      <Section title="뱃지 · 단계">
        <div className="flex flex-wrap gap-3">
          <Badge>D-5</Badge>
          <Badge tone="today">오늘</Badge>
          <Badge tone="info">서류 통과</Badge>
          <Badge tone="success">합격</Badge>
          <Badge tone="danger">중복 지원</Badge>
        </div>
        <div className="flex flex-wrap gap-4">
          {(['applied', 'screening', 'interview', 'offer', 'rejected', 'canceled'] as const).map((status) => (
            <StageDot key={status} status={status} />
          ))}
        </div>
        <div className="max-w-80">
          <StageTrack company="A사" stageIndex={stageIndex} onMove={(status) => setStageIndex(ACTIVE_STATUSES.indexOf(status))} labelsClassName="" />
        </div>
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="journey-title">
          <CardHeader title="전형 여정" titleId="journey-title" meta="진행 중 9건" />
          <CardSummary>9건 모두 서류 결과를 기다리고 있어요</CardSummary>
          <RatioBar
            label="진행 중 9건: 지원 완료 9, 서류 통과 0, 면접 0"
            segments={[{ key: 'applied', value: 9, colorClass: 'bg-chart-1' }]}
            total={9}
          />
          <StatGroup label="단계별 숫자">
            <StatCell label="지원한 기업" value={46} unit="곳" />
            <StatCell label="서류 통과율" value={0} unit="%" />
            <StatCell label="마감 자동 탈락" value={5} unit="건" />
          </StatGroup>
        </Card>

        <Card aria-labelledby="week-title">
          <CardHeader title="주간 지원" titleId="week-title" meta="예시 수치" />
          <CardSummary>
            지난주 <span className="text-text-brand">10곳</span> 지원했어요
          </CardSummary>
          <BarChart label="최근 5주 주간 지원 수: 10.26 8곳, 11.2 2곳, 11.9 1곳, 11.16 10곳, 이번 주 0곳" bars={WEEKS} heightClass="h-32" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card aria-labelledby="upcoming-title">
          <CardHeader title="다가오는 일정" titleId="upcoming-title" meta="3건" />
          <RowList label="다가오는 일정">
            <CompanyRow company="A사" platform="saramin" description="1차 면접 · 프론트엔드 개발" trailing={<Badge tone="today">오늘</Badge>} onOpen={() => setIsPanelOpen(true)} openLabel="A사 상세 보기" />
            <CompanyRow company="(주)B사" platform="jobkorea" description="공고 마감 · 백엔드 개발" trailing={<Badge>D-5</Badge>} onOpen={() => setIsPanelOpen(true)} openLabel="(주)B사 상세 보기" />
            <CompanyRow company="C사" platform="manual" description="서류 결과 대기 · 웹 개발" trailing={<span className="text-label text-text-secondary tabular-nums">4일째</span>} />
          </RowList>
        </Card>

        <Card aria-labelledby="cal-title">
          <CardHeader title="달력 칸" titleId="cal-title" />
          <div className="grid grid-cols-6 gap-1">
            <CalendarCell day={15} fullLabel="11월 15일 일요일" />
            <CalendarCell day={16} fullLabel="11월 16일 월요일" count={2} onSelect={() => showToast({ message: '11월 16일 지원 2곳' })} />
            <CalendarCell day={18} fullLabel="11월 18일 수요일" count={4} isTop onSelect={() => showToast({ message: '11월 18일 지원 4곳' })} />
            <CalendarCell day={23} fullLabel="11월 23일 월요일" isToday />
            <CalendarCell day={25} fullLabel="11월 25일 수요일" events={['interview']} />
            <CalendarCell day={28} fullLabel="11월 28일 토요일" events={['deadline']} />
          </div>
        </Card>
      </div>

      <Section title="빈 상태 · 알림 · 창">
        <EmptyState
          title="이번 주에는 일정이 없어요"
          description="면접이나 공고 마감을 기록하면 여기에 보여드려요"
          action={<Button variant="secondary" size="sm">일정 추가</Button>}
        />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => showToast({ message: '지원 3건을 가져왔어요' })}>알림 보기</Button>
          <Button variant="secondary" onClick={() => showToast({ message: '지원을 삭제했어요', actionLabel: '되돌리기' })}>되돌리기 알림</Button>
          <Button variant="secondary" onClick={() => setIsDialogOpen(true)}>가운데 창 열기</Button>
          <Button variant="secondary" onClick={() => setIsPanelOpen(true)}>오른쪽 패널 열기</Button>
        </div>
      </Section>

      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title="지원 추가"
        description="회사와 직무를 적어 주세요"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsDialogOpen(false)}>취소</Button>
            <Button onClick={() => setIsDialogOpen(false)}>추가</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <TextField label="회사" placeholder="예: A사" />
          <TextField label="직무" placeholder="예: 프론트엔드 개발" />
        </div>
      </Dialog>

      <SidePanel isOpen={isPanelOpen} onClose={() => setIsPanelOpen(false)} title="A사" description="프론트엔드 개발 · 사람인">
        <div className="flex flex-col gap-4">
          <StageTrack company="A사" stageIndex={stageIndex} onMove={(status) => setStageIndex(ACTIVE_STATUSES.indexOf(status))} labelsClassName="" />
          <p className="text-body text-text-secondary">상세 패널 견본이에요.</p>
        </div>
      </SidePanel>
    </div>
  );
}

export function UiShowcase() {
  return (
    <ToastProvider>
      <div className="min-h-full flex-1 bg-page">
        <main id={MAIN_CONTENT_ID} tabIndex={-1} className="focus:outline-none">
          <ShowcaseBody />
        </main>
      </div>
    </ToastProvider>
  );
}
