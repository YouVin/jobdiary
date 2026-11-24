// 공고 인재상 → 강점 연결에 쓰는 고정 목록 (#226, 결정 기록 001). Edge Function과 측정 스크립트가 같이 쓴다.
// AI가 강점 이름을 마음대로 지으면 회사끼리 비교할 수 없어 목록을 정해 둔다.
// 초안이다. 이름·개수는 평가 결과를 보고 결정 기록에서 확정한다.
export const STRENGTHS = [
  { label: '협업', hint: '여러 사람·직군과 함께 일하며 의견을 맞춘다' },
  { label: '소통', hint: '생각을 분명히 전하고 잘 듣는다' },
  { label: '주도성', hint: '시키지 않아도 일을 찾아 끝까지 이끈다' },
  { label: '문제 해결', hint: '원인을 찾아 해결책을 만든다' },
  { label: '학습·성장', hint: '새 기술과 지식을 빠르게 익히고 성장하려 한다' },
  { label: '책임감', hint: '맡은 일을 약속대로 해낸다' },
  { label: '꼼꼼함', hint: '작은 실수까지 챙기고 품질을 지킨다' },
  { label: '사용자 중심', hint: '사용자·고객 입장에서 생각한다' },
  { label: '데이터 기반 판단', hint: '숫자와 근거로 판단한다' },
  { label: '실행력', hint: '빠르게 만들어 보고 고친다' },
  { label: '유연성', hint: '변화와 새 상황에 잘 적응한다' },
  { label: '도전 정신', hint: '어려운 목표에 도전한다' },
] as const;

export type StrengthLabel = (typeof STRENGTHS)[number]['label'];

export const STRENGTH_LABELS: StrengthLabel[] = STRENGTHS.map((strength) => strength.label);
