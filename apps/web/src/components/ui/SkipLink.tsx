// 본문으로 건너뛰기 (#201). 키보드 사용자가 Tab을 처음 누르면 보이고, 헤더·메뉴를 건너뛰어 본문(#main-content)으로 간다.
// 각 레이아웃의 <main>에 id="main-content"와 tabIndex={-1}을 둔다.
export const MAIN_CONTENT_ID = 'main-content';

export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-toast focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:text-body focus:font-semibold focus:text-text-primary focus:shadow-md focus:outline-3 focus:outline-offset-2 focus:outline-focus-ring"
    >
      본문으로 건너뛰기
    </a>
  );
}
