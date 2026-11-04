import test from 'node:test';
import assert from 'node:assert/strict';
import { createSourceLoader } from './loadSource.mjs';

function setup(resendSignUpEmail) {
  const values = [];
  let cursor = 0;
  const load = createSourceLoader({
    react: {
      useId: () => 'resend-result',
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
    },
    '@/lib/auth': { resendSignUpEmail },
  });
  const { ResendConfirmationButton } = load('@/components/auth/ResendConfirmationButton');
  return () => {
    cursor = 0;
    const tree = ResendConfirmationButton({ email: 'test@example.test' });
    return { button: tree.props.children[0], status: tree.props.children[1] };
  };
}

test('재전송 SDK 예외 후 오류를 알리고 재시도 성공을 표시한다', async () => {
  let calls = 0;
  const render = setup(async () => {
    if (++calls === 1) throw new Error('network');
    return { error: null };
  });
  await render().button.props.onClick();
  assert.equal(render().button.props.disabled, false);
  assert.match(render().status.props.children, /실패/);
  assert.match(render().status.props.className, /rejected-text/);
  assert.equal(render().status.props.role, 'status');
  await render().button.props.onClick();
  assert.match(render().status.props.children, /다시 보냈습니다/);
});

test('재전송 연타는 한 요청만 보내고 완료 시 busy를 해제한다', async () => {
  let finish;
  let calls = 0;
  const render = setup(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const button = render().button;
  const pending = button.props.onClick();
  await button.props.onClick();
  assert.equal(calls, 1);
  assert.equal(render().button.props['aria-busy'], true);
  finish({ error: null });
  await pending;
  assert.equal(render().button.props['aria-busy'], false);
});
