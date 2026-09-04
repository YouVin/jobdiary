// jobdiary-extension(크롬 익스텐션)과의 연동 상수. docs/INTEGRATION.md §6 참고.

// 프로덕션 빌드는 크롬 웹스토어 정식 배포본과 통신해야 하므로 스토어가 부여한 ID를 쓴다.
// 그 외(로컬 dev)는 jobdiary-extension을 압축해제(unpacked) 상태로 로드해 테스트하므로
// manifest.config.ts의 key로 고정된 ID를 쓴다 — 스토어 배포판은 최초 업로드 시 key 없이
// 올라가 스토어가 별도 ID를 부여하므로(manifest.config.ts 주석 참고) 두 ID가 서로 다르다.
export const JOBDIARY_EXTENSION_ID =
  process.env.NODE_ENV === 'production'
    ? 'afnboeihbppogfinbickjaaadcgjkmil' // 크롬 웹스토어 정식 배포 ID
    : 'dckfpbmglbagcpnkkkdcnbnpjdpfjcde'; // 압축해제 개발 빌드 고정 ID (jobdiary-extension의 manifest.config.ts key)

// 익스텐션 → 웹앱 수집 데이터 전달 메시지의 type 값.
export const JOBDIARY_COLLECT_MESSAGE_TYPE = 'JOBDIARY_COLLECT';
