// 공고 본문 이미지 대신 받기 (#238, 결정 기록 003의 3번). 규칙은 ../_shared/postingImage/proxy.ts에 있고 Node 테스트로 검증한다.
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handlePostingImage, MAX_PROXY_IMAGE_BYTES, type FetchedImage } from "../_shared/postingImage/proxy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const FETCH_TIMEOUT_MS = 10_000;

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// 리다이렉트를 따라가지 않고(다른 서버로 넘어가는 것 차단), 상한까지만 읽는다.
async function fetchImage(url: string): Promise<FetchedImage> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { redirect: "manual", signal: controller.signal, headers: { Accept: "image/*" } });
    const contentType = response.headers.get("content-type") ?? "";
    if (response.status !== 200 || !response.body) {
      await response.body?.cancel();
      return { status: response.status, contentType, bytes: null };
    }
    const declared = Number(response.headers.get("content-length") ?? "0");
    if (declared > MAX_PROXY_IMAGE_BYTES) {
      await response.body.cancel();
      return { status: 200, contentType, bytes: null };
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_PROXY_IMAGE_BYTES) {
        await reader.cancel();
        return { status: 200, contentType, bytes: null };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { status: 200, contentType, bytes };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST 요청만 받아요.", code: "method_not_allowed" }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return jsonResponse({ error: "로그인이 필요해요.", code: "unauthorized" }, 401);

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return jsonResponse({ error: "요청 형식이 올바르지 않아요.", code: "bad_request" }, 400);
  }

  const callerClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const result = await handlePostingImage({
    async getUserId() {
      const { data, error } = await callerClient.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    fetchImage,
    logError(message, detail) {
      console.error(message, detail instanceof Error ? detail.message : "");
    },
  }, rawBody);

  if ("json" in result) return jsonResponse(result.json, result.status);
  // Uint8Array를 그대로 넘기면 Deno 타입에서 BodyInit로 받지 않아 Blob으로 감싼다.
  return new Response(new Blob([result.bytes as Uint8Array<ArrayBuffer>], { type: result.contentType }), { status: 200, headers: { ...corsHeaders, "Content-Type": result.contentType, "Cache-Control": "private, max-age=600" } });
});
