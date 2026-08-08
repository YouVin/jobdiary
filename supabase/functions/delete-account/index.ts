// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// 웹앱(브라우저)에서 supabase.functions.invoke(...)로 호출하므로 CORS preflight(OPTIONS)에
// 응답해야 한다. verify_jwt=true(config.toml)가 실질적인 보안 경계라, Origin은 넓게 허용해도
// 무방하다 — 유효한 사용자 JWT 없이는 애초에 함수 코드에 도달하지 못한다.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  // Authorization 헤더를 실은 요청은 preflight를 타는데, Allow-Methods가 없으면 일부 브라우저가
  // preflight 응답을 거부해 본 요청(POST)까지 막힐 수 있다.
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// 회원 탈퇴. service_role로만 가능한 auth.admin.deleteUser를 이 함수 안에서만 수행한다.
// applications.user_id FK가 ON DELETE CASCADE이므로 지원 내역은 별도 삭제 코드 없이 함께 정리된다
// (docs/AUTH.md §6.5.4).
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "인증 정보가 없습니다." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // 요청을 보낸 사람의 JWT를 그대로 실어서 클라이언트를 만든다. 이 클라이언트로 auth.getUser()를
  // 호출하면 Supabase가 그 JWT를 서버 쪽에서 직접 검증해 "진짜 누구인지"를 돌려준다 — 요청 본문의
  // 어떤 값도 아직 읽지 않았다는 점이 중요하다(신뢰할 수 있는 신원은 오직 이 결과뿐).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: getUserError,
  } = await callerClient.auth.getUser();

  if (getUserError || !user) {
    return jsonResponse({ error: "인증 정보를 확인할 수 없습니다." }, 401);
  }

  // service_role은 이 함수 실행 환경에만 존재한다(Supabase가 자동 주입) — 응답으로도, 로그로도
  // 절대 내보내지 않는다. 이 클라이언트도 함수 스코프를 벗어나지 않는다.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // 삭제 대상은 위에서 검증한 user.id만 쓴다. 요청 본문은 애초에 파싱하지도 않는다 — 클라이언트가
  // { userId: "..." } 같은 값을 보내도 그 값을 신뢰할 경로 자체가 존재하지 않는다(타인 계정 삭제
  // 취약점 방지, docs/AUTH.md §6.5.5).
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    // 상세 원인은 서버 로그에만 남기고, 클라이언트에는 내부 구현이 드러나지 않는 고정 문구만 준다.
    console.error("[delete-account] 삭제 실패:", deleteError.message);
    return jsonResponse({ error: "계정 삭제에 실패했습니다." }, 500);
  }

  return jsonResponse({ ok: true }, 200);
});

/* 로컬 테스트:

  1. supabase start
  2. 로그인해서 얻은 사용자 access_token으로:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/delete-account' \
    --header 'Authorization: Bearer <사용자 access_token>'

  배포:

  supabase functions deploy delete-account
*/
