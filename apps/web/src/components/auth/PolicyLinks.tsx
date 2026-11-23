import Link from 'next/link';
import { textLinkClassName } from '@/components/ui/TextLink';

interface PolicyLinksProps {
  // 두 링크 사이 글자. 문장 안에서는 " 및 ", 문장 끝에 따로 붙일 때는 " · ".
  joiner?: string;
}

// 이용약관·개인정보처리방침 링크. 새 탭에서 열리는 것을 스크린리더에도 알린다.
export function PolicyLinks({ joiner = ' 및 ' }: PolicyLinksProps) {
  return (
    <>
      <Link href="/terms" target="_blank" rel="noopener noreferrer" className={textLinkClassName('quiet')}>
        이용약관<span className="sr-only"> (새 탭에서 열림)</span>
      </Link>
      {joiner}
      <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={textLinkClassName('quiet')}>
        개인정보처리방침<span className="sr-only"> (새 탭에서 열림)</span>
      </Link>
    </>
  );
}
