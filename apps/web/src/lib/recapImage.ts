import type { MonthlyRecap } from '@/utils/monthlyRecap';

// 이번 달 돌아보기 카드를 PNG로 그린다 (#275). 1080×1350(4:5)은 쓰레드·인스타 피드에 잘리지 않는 비율이다.
// 색은 화면이 디자인 토큰에서 읽어 넘긴다(값을 여기 적지 않는다). 글꼴도 화면의 Pretendard를 그대로 쓴다.

export interface RecapColors {
  page: string;
  surface: string;
  subtle: string;
  primary: string;
  secondary: string;
  brand: string;
}

const WIDTH = 1080;
const HEIGHT = 1350;

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, color: string) {
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

export async function drawRecapImage(recap: MonthlyRecap, colors: RecapColors, fontFamily: string): Promise<Blob> {
  // 글꼴이 다 받아진 뒤 그려야 기본 글꼴로 찍히지 않는다
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('canvas를 쓸 수 없어요');
  const text = (value: string, x: number, y: number, size: number, weight: number, color: string) => {
    context.font = `${weight} ${size}px ${fontFamily}`;
    context.fillStyle = color;
    context.fillText(value, x, y);
  };

  // ── 바탕: 회색 페이지 위 흰 카드 ──
  roundRect(context, 0, 0, WIDTH, HEIGHT, 0, colors.page);
  roundRect(context, 64, 64, WIDTH - 128, HEIGHT - 128, 48, colors.surface);
  const left = 144;

  // ── 머리: 서비스 이름 → 몇 월 돌아보기 ──
  text('취준일기', left, 196, 36, 700, colors.brand);
  text(`${recap.monthNumber}월 돌아보기`, left, 296, 72, 700, colors.primary);

  // ── 큰 숫자: 이번 달 지원 ──
  text('이번 달 지원', left, 404, 36, 500, colors.secondary);
  text(`${recap.appliedCount}곳`, left, 560, 160, 800, colors.primary);

  // ── 숫자 4칸 ──
  const tiles: Array<[string, string]> = [
    ['서류 통과', `${recap.passedCount}곳`],
    ['면접', `${recap.interviewCount}번`],
    ['합격', `${recap.offerCount}곳`],
    ['남긴 기록', `${recap.diaryCount}개`],
  ];
  const tileWidth = (WIDTH - 2 * left - 32) / 2;
  tiles.forEach(([label, value], index) => {
    const x = left + (index % 2) * (tileWidth + 32);
    const y = 620 + Math.floor(index / 2) * 208;
    roundRect(context, x, y, tileWidth, 184, 32, colors.subtle);
    text(label, x + 40, y + 66, 32, 500, colors.secondary);
    text(value, x + 40, y + 148, 72, 700, colors.primary);
  });

  // ── 한 줄씩: 가장 많이 지원한 곳·가장 바빴던 날 ──
  const lines: string[] = [];
  if (recap.topPlatform) lines.push(`가장 많이 지원한 곳은 ${recap.topPlatform}`);
  if (recap.busiestDay) lines.push(`가장 바빴던 날은 ${recap.monthNumber}월 ${recap.busiestDay.day}일, ${recap.busiestDay.count}곳`);
  lines.forEach((line, index) => text(line, left, 1096 + index * 50, 32, 500, colors.secondary));

  // ── 아래: 주소 ──
  text('jobdiary.vercel.app', left, 1230, 28, 600, colors.brand);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요'))), 'image/png');
  });
}
