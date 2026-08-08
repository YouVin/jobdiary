// 회원 탈퇴 자리 — 서버리스(Edge Function) 구현은 다음 단계 (docs/AUTH.md §6.5.4, "Phase 5-2").
export function DeleteAccountSection() {
  return (
    <section className="rounded-[14px] border border-status-rejected/30 bg-status-rejected/5 p-5">
      <h2 className="text-[15px] font-semibold text-status-rejected">회원 탈퇴</h2>
      <p className="mt-2 text-[13px] text-text-secondary">회원 탈퇴 기능은 준비 중입니다.</p>
    </section>
  );
}
