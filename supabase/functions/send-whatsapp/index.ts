// send-whatsapp — envio de mensagens WhatsApp via wuzapi (substitui a legada send-message).
//
// Env vars necessárias:
//   SUPABASE_URL                 (injetada automaticamente pelo runtime)
//   SUPABASE_SERVICE_ROLE_KEY    (injetada automaticamente)
//   WUZAPI_BASE_URL              base da API wuzapi, ex: https://wuzapi.meudominio.com
//
// POST { workspace_id, phone, body, instance_id?, actor? }
//   - Auth: exige header Authorization com service role key OU um JWT válido.
//   - actor: se começa com "user:" grava mensagem como type 'human'; senão 'ai'.
//
// Fluxo: resolve instância -> presence composing -> aguarda ~800ms -> send text
//        -> grava em chats (out) + timeline_events (msg_out).

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WUZAPI_BASE_URL = (Deno.env.get("WUZAPI_BASE_URL") ?? "").replace(/\/+$/, "");

// Apenas dígitos do telefone (wuzapi espera o número sem símbolos).
function soDigitos(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Helper de envio via wuzapi. Retorna { ok, detalhe }.
async function enviarWuzapi(
  token: string,
  phone: string,
  body: string,
): Promise<{ ok: boolean; detalhe?: unknown }> {
  const headers = { "Content-Type": "application/json", token };

  // presence "composing" — humaniza; erro aqui é ignorado.
  try {
    await fetch(`${WUZAPI_BASE_URL}/chat/presence`, {
      method: "POST",
      headers,
      body: JSON.stringify({ Phone: phone, State: "composing" }),
    });
  } catch (_) {
    // ignora
  }

  await sleep(800);

  try {
    const resp = await fetch(`${WUZAPI_BASE_URL}/chat/send/text`, {
      method: "POST",
      headers,
      body: JSON.stringify({ Phone: phone, Body: body }),
    });
    const detalhe = await resp.json().catch(() => ({}));
    return { ok: resp.ok, detalhe };
  } catch (e) {
    return { ok: false, detalhe: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // --- Auth: service role OU JWT válido ---
  const authHeader = req.headers.get("Authorization") ?? "";
  const providedToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!providedToken) {
    return json({ ok: false, error: "missing_authorization" }, 401);
  }
  const isServiceRole = providedToken === SERVICE_ROLE_KEY;
  if (!isServiceRole) {
    // valida JWT do usuário repassando o header ao supabase-js
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ ok: false, error: "invalid_token" }, 401);
    }
  }

  // cliente admin para operações de banco
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let payload: {
    workspace_id?: number | string;
    phone?: string;
    body?: string;
    instance_id?: string;
    actor?: string;
  };
  try {
    payload = await req.json();
  } catch (_) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  const { workspace_id, phone, body, instance_id, actor } = payload;
  if (!workspace_id || !phone || !body) {
    return json(
      { ok: false, error: "workspace_id, phone e body são obrigatórios" },
      400,
    );
  }

  const phoneDigits = soDigitos(String(phone));

  // --- Resolve instância: a informada, senão primeira conectada, senão a primeira ---
  let instancia: { instance_id: string; token: string } | null = null;
  if (instance_id) {
    const { data } = await admin
      .from("user_instances")
      .select("instance_id, token")
      .eq("workspace_id", workspace_id)
      .eq("instance_id", instance_id)
      .maybeSingle();
    instancia = data ?? null;
  }
  if (!instancia) {
    const { data: conectadas } = await admin
      .from("user_instances")
      .select("instance_id, token, status")
      .eq("workspace_id", workspace_id)
      .order("instance_id", { ascending: true });
    const lista = conectadas ?? [];
    instancia =
      lista.find((i) =>
        String(i.status ?? "").toLowerCase().includes("connect") ||
        String(i.status ?? "").toLowerCase().includes("conect")
      ) ?? lista[0] ?? null;
  }

  if (!instancia?.token) {
    return json({ ok: false, error: "nenhuma_instancia_disponivel" }, 502);
  }

  // --- Envia ---
  const resultado = await enviarWuzapi(instancia.token, phoneDigits, String(body));
  const statusGravar = resultado.ok ? "sent" : "failed";
  const msgType = actor && actor.startsWith("user:") ? "human" : "ai";

  // resolve contato pelo telefone (para timeline)
  const { data: contato } = await admin
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspace_id)
    .eq("phone_number", phoneDigits)
    .maybeSingle();

  // grava chats (out)
  const { data: chatRow } = await admin
    .from("chats")
    .insert({
      workspace_id,
      instance_id: instancia.instance_id,
      session_id: phoneDigits,
      direction: "out",
      status: statusGravar,
      message: { type: msgType, content: body },
    })
    .select("id")
    .maybeSingle();

  // grava timeline
  await admin.from("timeline_events").insert({
    workspace_id,
    contact_id: contato?.id ?? null,
    actor: actor ?? "system",
    tipo: "msg_out",
    titulo: "Mensagem enviada",
    payload: { conteudo: body, status: statusGravar },
  });

  if (!resultado.ok) {
    return json(
      { ok: false, error: "falha_envio_wuzapi", detalhe: resultado.detalhe },
      502,
    );
  }

  return json({ ok: true, chat_id: chatRow?.id ?? null });
});
