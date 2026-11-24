// 공고 이미지 자르기 계획 (#232). 채용 공고 이미지는 보통 가로 800~1,000px에 세로 수천 px이다.
// Claude는 긴 변이 약 1,568px를 넘으면 이미지를 줄여 글자가 뭉개지므로(공식 Vision 문서), 가로를 maxWidth 이하로 맞춘 뒤
// 세로 sliceHeight씩 자른다. 조각끼리 overlap만큼 겹쳐 줄이 잘린 채로만 보이는 일을 막는다(지시문이 겹친 줄은 한 번만 적게 한다).
// 비용: 28×28 픽셀 조각마다 1토큰 → 1,000×1,400 조각 하나는 36×50 = 1,800토큰.
export const IMAGE_SLICE = {
  maxWidth: 1000,
  sliceHeight: 1400,
  overlap: 60,
  maxSlices: 12, // 서버 상한(MAX_POSTING_IMAGES)과 같다
} as const;

export interface ImageSlice {
  sourceY: number; // 원본 기준 시작 y
  sourceHeight: number; // 원본 기준 높이
  width: number; // 보낼 조각 가로
  height: number; // 보낼 조각 세로
}

export function planImageSlices(width: number, height: number, options = IMAGE_SLICE): ImageSlice[] {
  if (width <= 0 || height <= 0) return [];
  const scale = Math.min(1, options.maxWidth / width);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const slices: ImageSlice[] = [];
  let top = 0;
  for (;;) {
    const sliceHeight = Math.min(options.sliceHeight, targetHeight - top);
    slices.push({
      sourceY: Math.round(top / scale),
      sourceHeight: Math.min(height - Math.round(top / scale), Math.round(sliceHeight / scale)),
      width: targetWidth,
      height: sliceHeight,
    });
    if (top + sliceHeight >= targetHeight) break;
    top += options.sliceHeight - options.overlap;
  }
  return slices;
}

// 조각 하나의 예상 토큰 (28×28 픽셀마다 1토큰)
export function estimateImageTokens(slices: ImageSlice[]): number {
  let total = 0;
  for (const slice of slices) total += Math.ceil(slice.width / 28) * Math.ceil(slice.height / 28);
  return total;
}
