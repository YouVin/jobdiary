import type { Config } from 'tailwindcss'
import webConfig from '../web/tailwind.config'

// 팝업은 웹앱과 같은 디자인 시스템(#199~#206, docs/DESIGN_SYSTEM.md)을 쓴다(#239).
// 값을 베끼지 않고 웹앱 설정을 그대로 가져와, 웹앱 토큰이 바뀌면 팝업도 함께 바뀐다.
// 스캔 대상 파일 범위는 v4 방식대로 src/popup/index.css의 @source 지시자가 담당한다.
// 글꼴은 웹앱의 font-sans(next/font 변수)가 익스텐션에 없어 index.css에서 직접 지정한다.
export default {
  theme: {
    extend: {
      ...webConfig.theme?.extend,
    },
  },
} satisfies Config
