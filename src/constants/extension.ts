// jobdiary-extension(크롬 익스텐션)과의 연동 상수. docs/INTEGRATION.md §6 참고.

// 익스텐션 manifest.json의 key로 고정된 익스텐션 ID. sender.id 검증에 사용 (§6.2 ②).
export const JOBDIARY_EXTENSION_ID = 'dckfpbmglbagcpnkkkdcnbnpjdpfjcde';

// 익스텐션 → 웹앱 수집 데이터 전달 메시지의 type 값.
export const JOBDIARY_COLLECT_MESSAGE_TYPE = 'JOBDIARY_COLLECT';
