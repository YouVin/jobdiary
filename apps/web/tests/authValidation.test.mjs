import assert from 'node:assert/strict';
import test from 'node:test';
import { createSourceLoader } from './loadSource.mjs';

const { getEmailError } = createSourceLoader()('@/utils/authValidation');

test('이메일 입력 오류를 수정할 부분에 따라 구분한다', () => {
  const examples = [
    ['', '이메일을 입력해주세요.'],
    ['name example.com', '이메일에는 공백을 넣을 수 없습니다.'],
    ['name', '이메일에 @를 포함해주세요. 예: name@example.com'],
    ['name@@example.com', '@는 한 번만 입력해주세요.'],
    ['@example.com', '@ 앞에 이메일 아이디를 입력해주세요.'],
    ['name@', '@ 뒤에 도메인을 입력해주세요. 예: gmail.com'],
    ['name@example', '올바른 이메일 형식을 입력해주세요.'],
    ['name+jobs@example.co.kr', null],
  ];
  for (const [value, expected] of examples) assert.equal(getEmailError(value), expected, value);
});
