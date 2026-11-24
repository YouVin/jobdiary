// 회사 정보 만들기 (#228, 결정 기록 002: 서버를 Supabase 한곳에 모은다).
// 처리 순서·규칙은 ../_shared/companyInfo/handler.ts에 있고 Node 테스트(apps/web/tests/companyInfoHandler.test.mjs)로 검증한다.
// 이 파일은 실제 Supabase·Anthropic 연결만 맡는다.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "@anthropic-ai/sdk";
import { handleCompanyInfo, type CompanyInfoDeps, type StoredAnalysis } from "../_shared/companyInfo/handler.ts";

// delete-account와 같다. verify_jwt=true(config.toml)가 보안 경계라 Origin은 넓게 허용한다.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

// 로그에는 원인만 남긴다. 공고 본문·키·사용자 입력은 남기지 않는다.
function errorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) return `Anthropic ${error.status ?? "-"}: ${error.name}`;
  if (error instanceof Error) return error.message;
  return String(error);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST 요청만 받아요.", code: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "로그인이 필요해요.", code: "unauthorized" }, 401);

  // 키는 Supabase 비밀값(supabase secrets set)으로만 넣는다. 없으면 기능을 끈 것으로 본다.
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[company-info] ANTHROPIC_API_KEY가 설정되지 않음");
    return jsonResponse({ error: "회사 정보 기능을 준비하고 있어요.", code: "not_configured" }, 503);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "요청 형식이 올바르지 않아요.", code: "bad_request" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // 요청자 JWT를 실은 클라이언트: 신원 확인과 "본인 지원인지"(RLS) 확인에만 쓴다.
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  // service_role은 이 함수 안에서만 쓴다. 공고별 결과·한도·연결 저장은 브라우저가 직접 할 수 없다.
  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anthropic = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 });

  const deps: CompanyInfoDeps = {
    async getUserId() {
      const { data, error } = await callerClient.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    async getApplication(applicationId) {
      const { data, error } = await callerClient.from("applications").select("id, company, position").eq("id", applicationId).maybeSingle();
      if (error) throw new Error(`지원 조회 실패: ${error.message}`);
      return data;
    },
    async findAnalysis(postingHash) {
      const { data, error } = await adminClient.from("posting_analyses").select("id, result, model, created_at").eq("posting_hash", postingHash).maybeSingle();
      if (error) throw new Error(`결과 조회 실패: ${error.message}`);
      return data ? { id: data.id, result: data.result, model: data.model, createdAt: data.created_at } : null;
    },
    async consumeQuota(userId, limit) {
      const { data, error } = await adminClient.rpc("consume_ai_quota", { p_user_id: userId, p_limit: limit });
      if (error) throw new Error(`한도 확인 실패: ${error.message}`);
      return data === true;
    },
    async releaseQuota(userId) {
      const { error } = await adminClient.rpc("release_ai_quota", { p_user_id: userId });
      if (error) console.error("[company-info] 한도 되돌리기 실패:", error.message);
    },
    async analyze(request) {
      const response = await anthropic.messages.create(request);
      if (response.stop_reason === "refusal") {
        return { stopReason: "refusal", model: response.model, usage: response.usage, result: null };
      }
      const text = response.content.find((block) => block.type === "text");
      // 결과 형식(JSON 스키마)을 지정했으므로 text 블록은 그 형식의 JSON이다. 깨져 있으면 예외 → 502·한도 되돌림.
      return { stopReason: response.stop_reason, model: response.model, usage: response.usage, result: text ? JSON.parse(text.text) : null };
    },
    async saveAnalysis(row) {
      // 다시 만들기면 같은 공고 지문의 결과를 새 결과로 바꾼다.
      const { data, error } = await adminClient
        .from("posting_analyses")
        .upsert({
          posting_hash: row.postingHash,
          model: row.model,
          prompt_version: row.promptVersion,
          result: row.result,
          usage: row.usage,
          cost_usd: row.costUsd,
          created_at: new Date().toISOString(),
        }, { onConflict: "posting_hash" })
        .select("id, result, model, created_at")
        .single();
      if (error) throw new Error(`결과 저장 실패: ${error.message}`);
      return { id: data.id, result: data.result, model: data.model, createdAt: data.created_at } satisfies StoredAnalysis;
    },
    async linkApplication({ applicationId, userId, analysis }) {
      const { error } = await adminClient.from("application_analyses").upsert({
        application_id: applicationId,
        user_id: userId,
        posting_analysis_id: analysis.id,
        result: analysis.result,
        model: analysis.model,
        created_at: analysis.createdAt, // 화면의 "○월 ○일 기준"은 분석한 날이다
      }, { onConflict: "application_id" });
      if (error) throw new Error(`회사 정보 연결 실패: ${error.message}`);
    },
    async sha256(text) {
      return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    },
    logError(message, detail) {
      console.error(message, detail === undefined ? "" : errorMessage(detail));
    },
  };

  try {
    const { status, body } = await handleCompanyInfo(deps, rawBody);
    return jsonResponse(body, status);
  } catch (error) {
    console.error("[company-info] 처리 실패:", errorMessage(error));
    return jsonResponse({ error: "회사 정보를 만들지 못했어요. 잠시 후 다시 해 주세요.", code: "server_error" }, 500);
  }
});
