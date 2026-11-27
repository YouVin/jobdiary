// 공고 전형 절차 읽기 (#295). 처리 순서·규칙은 ../_shared/hiringProcess/handler.ts에 있고 Node 테스트로 검증한다.
// 이 파일은 실제 Supabase·Anthropic 연결만 맡는다(company-info와 같은 구조).
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "@anthropic-ai/sdk";
import { handleHiringProcess, type HiringProcessDeps } from "../_shared/hiringProcess/handler.ts";
import { PROCESS_PROMPT_VERSION } from "../_shared/hiringProcess/process.ts";

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

// 로그에는 원인만 남긴다. 공고 본문·키는 남기지 않는다.
function errorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) return `Anthropic ${error.status ?? "-"}: ${error.name}`;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") return JSON.stringify(error);
  return String(error);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST 요청만 받아요.", code: "method_not_allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "로그인이 필요해요.", code: "unauthorized" }, 401);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[hiring-process] ANTHROPIC_API_KEY가 설정되지 않음");
    return jsonResponse({ error: "전형 절차 읽기를 준비하고 있어요.", code: "not_configured" }, 503);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "요청 형식이 올바르지 않아요.", code: "bad_request" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // 요청자 JWT 클라이언트: 신원 확인과 "본인 지원인지"(RLS) 확인에만 쓴다.
  const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  // service_role은 이 함수 안에서만: 공고별 결과·한도는 브라우저가 직접 다루지 못한다.
  const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const anthropic = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });

  const deps: HiringProcessDeps = {
    async getUserId() {
      const { data, error } = await callerClient.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    async hasApplication(applicationId) {
      const { data, error } = await callerClient.from("applications").select("id").eq("id", applicationId).maybeSingle();
      if (error) throw new Error(`지원 조회 실패: ${error.message}`);
      return !!data;
    },
    async findProcess(postingHash) {
      const { data, error } = await adminClient.from("posting_processes").select("steps").eq("posting_hash", postingHash).maybeSingle();
      if (error) throw new Error(`결과 조회 실패: ${error.message}`);
      return data ? data.steps : null;
    },
    async consumeQuota(userId, limit) {
      const { data, error } = await adminClient.rpc("consume_process_quota", { p_user_id: userId, p_limit: limit });
      if (error) throw new Error(`한도 확인 실패: ${error.message}`);
      return data === true;
    },
    async releaseQuota(userId) {
      const { error } = await adminClient.rpc("release_process_quota", { p_user_id: userId });
      if (error) console.error("[hiring-process] 한도 되돌리기 실패:", error.message);
    },
    async readProcess(request) {
      const response = await anthropic.messages.create(request);
      const text = response.content.find((block) => block.type === "text");
      return {
        stopReason: response.stop_reason,
        model: response.model,
        usage: response.usage,
        result: response.stop_reason === "refusal" || !text ? null : JSON.parse(text.text),
      };
    },
    async saveProcess(row) {
      const { error } = await adminClient.from("posting_processes").upsert({
        posting_hash: row.postingHash,
        steps: row.steps,
        model: row.model,
        prompt_version: PROCESS_PROMPT_VERSION,
        usage: row.usage,
        cost_usd: row.costUsd,
        created_at: new Date().toISOString(),
      }, { onConflict: "posting_hash" });
      if (error) throw new Error(`결과 저장 실패: ${error.message}`);
    },
    async sha256(text) {
      return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
    },
    logError(message, detail) {
      console.error(message, detail === undefined ? "" : errorMessage(detail));
    },
  };

  try {
    const { status, body } = await handleHiringProcess(deps, rawBody);
    return jsonResponse(body, status);
  } catch (error) {
    console.error("[hiring-process] 처리 실패:", errorMessage(error));
    return jsonResponse({ error: "전형 절차를 읽지 못했어요.", code: "server_error" }, 500);
  }
});
