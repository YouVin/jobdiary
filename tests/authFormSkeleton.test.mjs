import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSourceLoader } from './loadSource.mjs';

const { AuthFormSkeleton } = createSourceLoader()('@/components/auth/AuthFormSkeleton');

for (const isSignUp of [false, true]) {
  test(`${isSignUp ? '가입' : '로그인'} 스켈레톤은 상태를 알리고 조작 가능한 가짜 컨트롤을 만들지 않는다`, () => {
    const html = renderToStaticMarkup(createElement(AuthFormSkeleton, { isSignUp }));
    assert.match(html, /role="status"/);
    assert.match(html, /aria-busy="true"/);
    assert(html.includes(`${isSignUp ? '회원가입' : '로그인'} 화면을 준비하고 있습니다.`));
    assert.match(html, /aria-hidden="true"/);
    assert.match(html, /motion-reduce:animate-none/);
    assert.doesNotMatch(html, /<(?:button|input|a|select|textarea)(?:\s|>)/);
  });
}
