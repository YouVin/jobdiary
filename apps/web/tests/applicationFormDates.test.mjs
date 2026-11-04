import assert from 'node:assert/strict';
import test from 'node:test';
import { createFormHarness } from './formHarness.mjs';

function setup(componentName) {
  const calls = [];
  let closes = 0;
  const props = {
    isOpen: true, isSubmitting: false, onClose: () => { closes++; }, onSubmittingChange() {},
    application: {
      id: 'row-1', company: 'synthetic', position: 'test', platform: 'manual', status: 'applied',
      statusSource: 'manual', appliedAt: '2026-10-01', updatedAt: '2026-10-01T00:00:00Z',
    },
  };
  const state = {
    error: null,
    clearError() {},
    async addApplication(app) { calls.push(app); return true; },
    async updateApplication(_id, updates) { calls.push(updates); return true; },
  };
  const form = createFormHarness(componentName, props, state);
  form.fields().onCompanyChange('synthetic');
  form.fields().onAppliedAtChange('2026-10-01');
  form.render();
  return { form, calls, getCloses: () => closes };
}

for (const componentName of ['AddApplicationModal', 'EditApplicationForm']) {
  for (const appliedAt of ['', '2026-02-30', 'not-a-date']) {
    test(`${componentName}: 잘못된 지원일 '${appliedAt}'은 저장하지 않고 안내한다`, async () => {
      const { form, calls, getCloses } = setup(componentName);
      form.fields().onAppliedAtChange(appliedAt);
      form.render();
      await form.save();
      form.render();
      assert.equal(calls.length, 0);
      assert.equal(getCloses(), 0);
      assert.match(form.alerts()[0], /지원일/);
    });
  }

  test(`${componentName}: 잘못된 마감일도 저장 전에 안내한다`, async () => {
    const { form, calls } = setup(componentName);
    form.fields().onDeadlineAtChange('2026-02-30');
    form.render();
    await form.save();
    form.render();
    assert.equal(calls.length, 0);
    assert.match(form.alerts()[0], /마감일/);
  });

  test(`${componentName}: 지원일을 바로잡고 선택 날짜를 비우면 정상 저장한다`, async () => {
    const { form, calls, getCloses } = setup(componentName);
    form.fields().onAppliedAtChange('');
    form.render();
    await form.save();
    form.fields().onAppliedAtChange('2026-10-01');
    form.fields().onDeadlineAtChange('');
    form.fields().onInterviewDateChange?.('');
    form.render();
    await form.save();
    form.render();
    assert.equal(calls.length, 1);
    assert.equal(getCloses(), 1);
    assert.equal(calls[0].appliedAt, '2026-10-01T00:00:00.000Z');
    assert.equal(calls[0].deadlineAt, componentName === 'EditApplicationForm' ? null : undefined);
    if (componentName === 'EditApplicationForm') assert.equal(calls[0].interviewDate, null);
    assert.deepEqual(form.alerts(), []);
  });
}

test('수정 폼의 잘못된 면접일은 저장 전에 안내한다', async () => {
  const { form, calls } = setup('EditApplicationForm');
  form.fields().onInterviewDateChange('2026-02-30');
  form.render();
  await form.save();
  form.render();
  assert.equal(calls.length, 0);
  assert.match(form.alerts()[0], /면접일/);
});

test('수정 폼의 유효한 선택 날짜는 그대로 저장한다', async () => {
  const { form, calls } = setup('EditApplicationForm');
  form.fields().onDeadlineAtChange('2026-12-31');
  form.fields().onInterviewDateChange('2026-11-01');
  form.render();
  await form.save();
  assert.equal(calls[0].deadlineAt, '2026-12-31');
  assert.equal(calls[0].interviewDate, '2026-11-01T00:00:00.000Z');
});
