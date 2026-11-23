import { createSourceLoader } from './loadSource.mjs';

// React 상태를 유지하며 실제 폼의 이벤트 핸들러를 실행한다. 브라우저 렌더링 검증은 별도다.
// #205: 저장은 form onSubmit, 칸 오류는 ApplicationFormFields의 errors로 받는다. 첫 오류 칸 포커스(requestAnimationFrame)는 여기서 하지 않는다.
export function createFormHarness(componentName, initialProps, state) {
  globalThis.requestAnimationFrame ??= () => 0;
  const values = [];
  let cursor = 0;
  let props = initialProps;
  let tree;
  const load = createSourceLoader({
    react: {
      useState(initial) {
        const index = cursor++;
        if (!(index in values)) values[index] = typeof initial === 'function' ? initial() : initial;
        return [values[index], (next) => { values[index] = typeof next === 'function' ? next(values[index]) : next; }];
      },
      useId: () => 'form-test',
    },
    '@/store/applicationStore': { useApplicationStore: (selector) => selector(state) },
    '@/components/modal/ApplicationFormFields': { ApplicationFormFields: () => null },
    '@/components/ui/Overlay': { Dialog: () => null },
    '@/components/ui/Toast': { useToast: () => () => {} },
  });
  const Component = load(`@/components/modal/${componentName}`)[componentName];
  function elements(node) {
    if (Array.isArray(node)) return node.flatMap(elements);
    if (!node || typeof node !== 'object') return [];
    return [node, ...elements(node.props?.children)];
  }
  const render = (nextProps = props) => {
    props = nextProps;
    cursor = 0;
    tree = Component(props);
    return tree;
  };
  render();
  return {
    render,
    fields: () => elements(tree).find((node) => node.props?.onAppliedAtChange).props,
    save: () => elements(tree).find((node) => node.props?.onSubmit).props.onSubmit({ preventDefault() {} }),
    // 칸 아래 오류(errors)와 창 안 알림(role=alert)을 화면 순서대로 모은다. 빈 알림 영역은 뺀다.
    alerts: () => [
      ...Object.values(elements(tree).find((node) => node.props?.onAppliedAtChange)?.props.errors ?? {}),
      ...elements(tree).filter((node) => node.props?.role === 'alert').map((node) => node.props.children),
    ].filter(Boolean),
  };
}
