import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

function setup(signInWithGoogle) {
  const values = [];
  let cursor = 0;
  const listeners = new Map();
  const messages = [];
  const pending = [];
  const previous = globalThis.window;
  globalThis.window = {
    location: { href: 'https://app.example/login?import=1&error=old#access_token=old' },
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: name => listeners.delete(name),
  };
  const load = createSourceLoader({
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in values)) values[index] = initial;
        return [values[index], next => { values[index] = next; }];
      },
      useRef(initial) {
        const index = cursor++;
        if (!(index in values)) values[index] = { current: initial };
        return values[index];
      },
      useEffect(callback) {
        const index = cursor++;
        if (!(index in values)) values[index] = callback();
      },
    },
    'next/image': { default: () => null },
    '@/lib/auth': { signInWithGoogle },
  });
  const { GoogleSignInButton } = load('@/components/auth/GoogleSignInButton');
  const props = { onStart: () => true, onError: text => messages.push(text), onPendingChange: value => pending.push(value) };
  const render = () => { cursor = 0; return GoogleSignInButton(props); };
  return {
    render, props, messages, pending,
    pageshow: persisted => listeners.get('pageshow')({ persisted }),
    cleanup() { globalThis.window = previous; },
  };
}

test('OAuth SDK가 예외를 던져도 오류를 안내하고 다시 시도할 수 있다', async () => {
  let count = 0;
  const h = setup(async () => { count++; throw new Error('network'); });
  try {
    await h.render().props.onClick();
    assert.equal(h.render().props.disabled, false);
    assert.deepEqual(h.pending, [true, false]);
    assert.equal(h.messages.length, 1);
    await h.render().props.onClick();
    assert.equal(count, 2);
  } finally { h.cleanup(); }
});

test('SDK 반환 오류도 동일하게 잠금을 해제한다', async () => {
  const h = setup(async () => ({ error: new Error('provider disabled') }));
  try {
    await h.render().props.onClick();
    assert.equal(h.render().props.disabled, false);
    assert.equal(h.messages.length, 1);
  } finally { h.cleanup(); }
});

test('SDK 성공 반환 뒤 실제 이동 전까지 연타를 막고 BFCache 복원 후 재시도한다', async () => {
  const urls = [];
  const h = setup(async url => { urls.push(url); return { error: null }; });
  try {
    const button = h.render();
    await Promise.all([button.props.onClick(), button.props.onClick()]);
    assert.deepEqual(urls, ['https://app.example/login?import=1']);
    assert.equal(h.render().props.disabled, true);
    h.pageshow(true);
    assert.equal(h.render().props.disabled, false);
    await h.render().props.onClick();
    assert.equal(urls.length, 2);
  } finally { h.cleanup(); }
});

test('복원 전 요청의 늦은 오류는 새 요청 잠금과 안내를 덮어쓰지 않는다', async () => {
  let rejectOld;
  let count = 0;
  const h = setup(() => ++count === 1 ? new Promise((resolve, reject) => { rejectOld = reject; }) : Promise.resolve({ error: null }));
  try {
    const old = h.render().props.onClick();
    h.pageshow(true);
    await h.render().props.onClick();
    rejectOld(new Error('late failure'));
    await old;
    assert.equal(h.render().props.disabled, true);
    assert.deepEqual(h.messages, []);
  } finally { h.cleanup(); }
});

test('이메일 요청 중 disabled면 OAuth를 시작하지 않는다', async () => {
  let count = 0;
  const h = setup(async () => { count++; return { error: null }; });
  try {
    h.props.disabled = true;
    await h.render().props.onClick();
    assert.equal(count, 0);
    h.pageshow(true);
    assert.deepEqual(h.pending, []);
  } finally { h.cleanup(); }
});

test('인증 복귀 URL은 import 신호만 보존하고 민감한 값·오류를 제외한다', () => {
  const load = createSourceLoader();
  const { getGoogleRedirectUrl, getBoardRedirectPath } = load('@/utils/authRedirect');
  assert.equal(getGoogleRedirectUrl('https://app.example/login?import=1&error_code=old&email=a%40b.com#access_token=secret'), 'https://app.example/login?import=1');
  assert.equal(getBoardRedirectPath('https://app.example/login?passwordUpdated=1&access_token=secret'), '/');
  assert.equal(getBoardRedirectPath('https://app.example/login?import=1&error=old'), '/?import=1');
  assert.equal(getGoogleRedirectUrl('https://app.example/login?import=2'), 'https://app.example/login');
});
