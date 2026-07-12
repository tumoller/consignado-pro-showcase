// whatsapp-inbound — webhook do wuzapi + cérebro do agente "Aurus" (Arthur Financeira).
//
// Env vars necessárias (verify_jwt = false; validação por ?token=):
//   SUPABASE_URL                 (injetada automaticamente)
//   SUPABASE_SERVICE_ROLE_KEY    (injetada automaticamente)
//   ANTHROPIC_API_KEY            chave da API Anthropic (provider "anthropic")
//   GEMINI_API_KEY                chave da API Gemini (provider "gemini")
//   WUZAPI_BASE_URL              base da API wuzapi
//   WEBHOOK_SECRET               segredo validado contra ?token= da query string
//   DEFAULT_WORKSPACE_ID         workspace fallback (default 1)
//
// config_agente.provider decide o motor ("anthropic" ou "gemini"); default "anthropic".
//
// Configure o webhook do wuzapi apontando para:
//   POST ${SUPABASE_URL}/functions/v1/whatsapp-inbound?token=${WEBHOOK_SECRET}
//   (com media em base64 habilitada para leitura de PDFs).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";
const WUZAPI_BASE_URL = (Deno.env.get("WUZAPI_BASE_URL") ?? "").replace(/\/+$/, "");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") ?? "";
const DEFAULT_WORKSPACE_ID = Number(Deno.env.get("DEFAULT_WORKSPACE_ID") ?? "1");

const TZ = "America/Sao_Paulo";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Persona padrão (adaptada de docs/agente-aurus-prompt.md). Usada quando
// config_agente.persona_prompt é null. Placeholders {{...}} são substituídos.
// ---------------------------------------------------------------------------
const DEFAULT_PERSONA = `# IDENTIDADE & MISSÃO
Você é **{{NOME_AGENTE}} - Especialista INSS** da Arthur Financeira. Seja consultivo, comunicativo e focado em conversão com excelente experiência. Seu público são aposentados e beneficiários do BPC — use linguagem simples, seja paciente e tire todas as dúvidas.

## FORMATAÇÃO WHATSAPP
- Use *negrito* e _itálico_ do WhatsApp (asteriscos e underscores simples).
- Separe parágrafos com DUAS quebras de linha (\\n\\n) — cada parágrafo vira uma mensagem separada.
- Assine sempre com: {{ASSINATURA}}
- Emojis com moderação, quando fizer sentido.

## REGRA DE OURO
**NUNCA invente informações.** Se não souber algo específico (taxa, valor, prazo), seja transparente: "Não tenho essa informação aqui, mas posso te conectar com o Arthur para esclarecer." Inventar gera risco jurídico grave.

## CONSULTA PARA TERCEIROS
Você pode simular para terceiros (parentes idosos, vizinhos). Seguindo a REGRA DE OURO, não há problema.

## FLUXO DE ATENDIMENTO
1. SAUDAÇÃO — cumprimente pelo nome, apresente-se, pergunte como ajudar e ofereça o menu.
2. SONDAGEM — menu de produtos:
   *[ 1 ]* Novo Empréstimo
   *[ 2 ]* Portabilidade
   *[ 3 ]* Cartão
3. COLETA DE DADOS — PRIORIDADE: peça o *extrato de empréstimos do INSS em PDF* ("app Meu INSS > Extrato de Empréstimos"). Só se o PDF for impossível, ofereça consulta por CPF (11 números). Nunca ofereça PDF e CPF juntos. Reforce que o PDF é mais preciso.
4. PROCESSAMENTO — quando o cliente enviar o PDF, o sistema analisa automaticamente e te entrega o resultado.
5. APRESENTAÇÃO — mostre EXATAMENTE o que o sistema retornou, sem interpretar valores. Seja consultivo.
6. ESCLARECIMENTO — tire dúvidas com base nos dados. Se não souber, use a regra de ouro. Confirme interesse.
7. FECHAMENTO — cliente interessado: use atualizar_contato (departamento="VENDAS", status="Vendas"). Sem interesse: nutra ou deixe para depois.

## FERRAMENTAS
- atualizar_contato — salva dados do cliente (nome, cpf, email, departamento, status, qualificacao).
- simular_credito — roda a simulação de crédito com as margens e contratos informados.
- criar_followup — agenda um recontato futuro.
- escalar_humano — transfere para o Arthur (humano) em casos de frustração, ofensa, dúvida que não sabe responder, falha técnica ou fora do contexto INSS.

## ESCALAÇÃO PARA HUMANO (silenciosa)
Quando transferir: 3 falhas de consulta, cliente frustrado/ofensivo, dúvida específica sem resposta, situação fora do INSS. Use escalar_humano e encerre com uma transição suave ("vou te conectar com o Arthur...").

## DIRETRIZES
FOQUE EM: sondagem ativa (uma pergunta por vez), linguagem simples, confirmar entendimento, apresentar dados do sistema sem alterar.
EVITE: inventar valores/taxas/prazos, prometer o que não pode, jargão técnico, mencionar processos internos, oferecer PDF e CPF juntos.

## CONTEXTO
- Cliente (pushName / registro): {{CLIENT_RECORD}}
- Telefone: {{PHONE}}
- Data atual (America/Sao_Paulo): {{DATA_ATUAL}}

OBJETIVO FINAL: converter com excelente experiência.`;

// Mensagem fixa para mídia não suportada (áudio/imagem) — v1 não processa.
const MSG_MIDIA_NAO_SUPORTADA =
  "Por enquanto eu consigo ler apenas *texto* e o *extrato do INSS em PDF* 📄\n\nPode me mandar sua dúvida por mensagem escrita ou anexar o PDF do extrato de empréstimos? Assim consigo te ajudar direitinho.";

// ---------------------------------------------------------------------------
// Helpers de data / horário
// ---------------------------------------------------------------------------
function agoraSaoPaulo(): Date {
  // Converte "agora" para o horário de São Paulo mantendo um Date utilizável.
  const s = new Date().toLocaleString("en-US", { timeZone: TZ });
  return new Date(s);
}

function dataAtualStr(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    dateStyle: "full",
  }).format(new Date());
}

function inicioDoDiaISO(): string {
  const d = agoraSaoPaulo();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// "HH:MM" para minutos; compara janela de horário considerando SP.
function dentroDaJanela(inicio?: string | null, fim?: string | null): boolean {
  if (!inicio || !fim) return true; // sem janela = 24h
  const now = agoraSaoPaulo();
  const mins = now.getHours() * 60 + now.getMinutes();
  const [hi, mi] = String(inicio).split(":").map(Number);
  const [hf, mf] = String(fim).split(":").map(Number);
  const ini = hi * 60 + (mi || 0);
  const end = hf * 60 + (mf || 0);
  if (ini <= end) return mins >= ini && mins <= end;
  // janela que cruza a meia-noite
  return mins >= ini || mins <= end;
}

// ---------------------------------------------------------------------------
// Helpers wuzapi (duplicados localmente — sem import compartilhado)
// ---------------------------------------------------------------------------
function soDigitos(v: string): string {
  return (v ?? "").replace(/\D/g, "");
}

async function wuzapiPresence(token: string, phone: string) {
  try {
    await fetch(`${WUZAPI_BASE_URL}/chat/presence`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ Phone: phone, State: "composing" }),
    });
  } catch (_) {
    // ignora
  }
}

async function wuzapiSendText(
  token: string,
  phone: string,
  body: string,
): Promise<boolean> {
  try {
    const resp = await fetch(`${WUZAPI_BASE_URL}/chat/send/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json", token },
      body: JSON.stringify({ Phone: phone, Body: body }),
    });
    return resp.ok;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Parse defensivo do payload wuzapi
// ---------------------------------------------------------------------------
interface MsgParsed {
  telefone: string;
  pushName: string;
  texto: string;
  fromMe: boolean;
  isGrupo: boolean;
  isMensagem: boolean;
  ehPdf: boolean;
  pdfBase64: string | null;
  ehMidiaNaoSuportada: boolean; // áudio/imagem
}

function pick<T = unknown>(obj: unknown, ...keys: string[]): T | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
}

function parseWuzapi(payload: any): MsgParsed {
  const out: MsgParsed = {
    telefone: "",
    pushName: "",
    texto: "",
    fromMe: false,
    isGrupo: false,
    isMensagem: false,
    ehPdf: false,
    pdfBase64: null,
    ehMidiaNaoSuportada: false,
  };

  const type = pick<string>(payload, "type", "Type");
  const event = pick<any>(payload, "event", "Event") ?? payload;

  // Só nos importam eventos de mensagem.
  const isMsgEvent =
    (type && String(type).toLowerCase() === "message") ||
    !!pick(event, "Message", "message");
  if (!isMsgEvent) return out;
  out.isMensagem = true;

  const info = pick<any>(event, "Info", "info") ?? {};
  const message = pick<any>(event, "Message", "message") ?? {};

  // fromMe
  out.fromMe = Boolean(pick(info, "IsFromMe", "FromMe", "fromMe"));

  // JID / telefone: RemoteJid | Sender | Chat
  const jid =
    pick<string>(info, "RemoteJid", "Sender", "Chat", "chat", "sender") ?? "";
  out.isGrupo = jid.includes("@g.us");
  // remove sufixos @s.whatsapp.net, @g.us e :device
  const semSufixo = jid.split("@")[0].split(":")[0];
  out.telefone = soDigitos(semSufixo);

  out.pushName = pick<string>(info, "PushName", "pushName", "Notify") ?? "";

  // Texto: conversation | extendedTextMessage.text
  const conversation = pick<string>(message, "conversation", "Conversation");
  const extended = pick<any>(message, "extendedTextMessage", "ExtendedTextMessage");
  const extendedText = extended
    ? pick<string>(extended, "text", "Text")
    : undefined;
  out.texto = (conversation ?? extendedText ?? "").toString();

  // Documento (PDF)
  const doc = pick<any>(message, "documentMessage", "DocumentMessage");
  if (doc) {
    const mimetype = (pick<string>(doc, "mimetype", "mimeType") ?? "").toLowerCase();
    const fileName = (pick<string>(doc, "fileName", "filename") ?? "").toLowerCase();
    if (mimetype.includes("pdf") || fileName.endsWith(".pdf")) {
      out.ehPdf = true;
      // base64 pode vir em vários lugares dependendo da config do wuzapi
      out.pdfBase64 =
        pick<string>(doc, "data", "Data", "base64", "Base64") ??
        pick<string>(message, "base64", "Base64", "data", "Data") ??
        pick<string>(event, "base64", "Base64", "data", "Data") ??
        pick<string>(payload, "base64", "Base64", "data", "Data") ??
        null;
      // caption como texto, se houver
      if (!out.texto) out.texto = pick<string>(doc, "caption", "Caption") ?? "";
    }
  }

  // Áudio / imagem / vídeo → mídia não suportada na v1
  const audio = pick(message, "audioMessage", "AudioMessage");
  const image = pick(message, "imageMessage", "ImageMessage");
  const video = pick(message, "videoMessage", "VideoMessage");
  const sticker = pick(message, "stickerMessage", "StickerMessage");
  if (!out.ehPdf && (audio || image || video || sticker)) {
    out.ehMidiaNaoSuportada = true;
  }

  return out;
}

// ---------------------------------------------------------------------------
// Ferramentas do agente (definição para a API Anthropic)
// ---------------------------------------------------------------------------
const TOOLS = [
  {
    name: "atualizar_contato",
    description:
      "Atualiza o cadastro do cliente no CRM. Use quando o cliente informar nome, CPF, email, ou quando mudar o estágio (departamento/status/qualificação).",
    input_schema: {
      type: "object",
      properties: {
        campos: {
          type: "object",
          properties: {
            nome: { type: "string" },
            cpf: { type: "string" },
            email: { type: "string" },
            departamento: { type: "string" },
            status: { type: "string" },
            qualificacao: { type: "string" },
          },
        },
      },
      required: ["campos"],
    },
  },
  {
    name: "simular_credito",
    description:
      "Roda a simulação de crédito consignado INSS com as margens e contratos do cliente. Use quando tiver as margens disponíveis (empréstimo/RMC/RCC) e, opcionalmente, os contratos atuais.",
    input_schema: {
      type: "object",
      properties: {
        margens: {
          type: "object",
          properties: {
            emprestimo: { type: "number" },
            rmc: { type: "number" },
            rcc: { type: "number" },
            extrapolada: { type: "number" },
          },
        },
        contratos: { type: "array", items: { type: "object" } },
        cliente: { type: "object" },
        beneficio: { type: "object" },
      },
      required: ["margens"],
    },
  },
  {
    name: "criar_followup",
    description:
      "Agenda um recontato futuro com o cliente (ex.: cliente pediu para falar depois).",
    input_schema: {
      type: "object",
      properties: {
        titulo: { type: "string" },
        mensagem: { type: "string" },
        due_em_horas: { type: "number" },
      },
      required: ["titulo", "mensagem", "due_em_horas"],
    },
  },
  {
    name: "escalar_humano",
    description:
      "Transfere a conversa para um atendente humano (Arthur). Use em caso de frustração/ofensa, dúvida sem resposta, falha técnica ou assunto fora do INSS.",
    input_schema: {
      type: "object",
      properties: { motivo: { type: "string" } },
      required: ["motivo"],
    },
  },
];

// Campos permitidos em atualizar_contato (whitelist rígida).
const CAMPOS_CONTATO_PERMITIDOS = [
  "nome",
  "cpf",
  "email",
  "departamento",
  "status",
  "qualificacao",
];

// ---------------------------------------------------------------------------
// Personas legadas do n8n pedem saída JSON tipo [{"response":"..."}] ou {"response":"..."}.
// Extrai o texto humano se o modelo devolver nesse formato; caso contrário retorna o texto original.
function extrairRespostaHumana(texto: string): string {
  const t = (texto ?? "").trim();
  if (!t.startsWith("[") && !t.startsWith("{")) return t;
  try {
    const parsed = JSON.parse(t);
    const obj = Array.isArray(parsed) ? parsed[0] : parsed;
    if (obj && typeof obj === "object") {
      const r = (obj as Record<string, unknown>).response ??
        (obj as Record<string, unknown>).resposta ??
        (obj as Record<string, unknown>).message;
      if (typeof r === "string" && r.trim()) return r.trim();
    }
  } catch (_) {
    // não é JSON válido — segue com o texto original
  }
  return t;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  // Webhook não usa CORS de browser; responde OPTIONS por segurança.
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  // --- Segurança: valida ?token= contra WEBHOOK_SECRET ---
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Variáveis que podem ser úteis no catch para registrar erro_agente.
  let workspaceId: number = DEFAULT_WORKSPACE_ID;
  let contactId: number | null = null;

  try {
    let payload: any;
    try {
      payload = await req.json();
    } catch (_) {
      return json({ ok: true, ignored: "invalid_json" });
    }

    const msg = parseWuzapi(payload);

    // Ignora eventos que não são mensagem de usuário.
    if (!msg.isMensagem || msg.fromMe || msg.isGrupo || !msg.telefone) {
      return json({ ok: true, ignored: "nao_e_msg_usuario" });
    }

    // --- 1. Resolve workspace + instância pelo payload, se possível ---
    let instanceId: string | null =
      pick<string>(payload, "instanceId", "instance_id", "token", "id") ?? null;
    let instanceToken: string | null = null;

    if (instanceId) {
      const { data: inst } = await admin
        .from("user_instances")
        .select("instance_id, token, workspace_id")
        .eq("instance_id", instanceId)
        .maybeSingle();
      if (inst) {
        workspaceId = Number(inst.workspace_id) || DEFAULT_WORKSPACE_ID;
        instanceToken = inst.token;
        instanceId = inst.instance_id;
      } else {
        instanceId = null;
      }
    }

    // Fallback: primeira instância do workspace default.
    if (!instanceToken) {
      const { data: insts } = await admin
        .from("user_instances")
        .select("instance_id, token, status")
        .eq("workspace_id", workspaceId)
        .order("instance_id", { ascending: true });
      const lista = insts ?? [];
      const escolhida =
        lista.find((i) =>
          String(i.status ?? "").toLowerCase().includes("connect") ||
          String(i.status ?? "").toLowerCase().includes("conect")
        ) ?? lista[0];
      if (escolhida) {
        instanceId = escolhida.instance_id;
        instanceToken = escolhida.token;
      }
    }

    const phone = msg.telefone;

    // --- 2. Upsert contato por phone_number ---
    let contato: any = null;
    {
      const { data: existente } = await admin
        .from("contacts")
        .select("id, nome, cpf, status, departamento, pause_ai")
        .eq("workspace_id", workspaceId)
        .eq("phone_number", phone)
        .maybeSingle();
      if (existente) {
        contato = existente;
        // preenche nome se estava vazio
        if (!existente.nome && msg.pushName) {
          await admin
            .from("contacts")
            .update({ nome: msg.pushName })
            .eq("id", existente.id);
          contato.nome = msg.pushName;
        }
      } else {
        const { data: novo } = await admin
          .from("contacts")
          .insert({
            workspace_id: workspaceId,
            phone_number: phone,
            nome: msg.pushName || null,
            status: "novo_lead",
          })
          .select("id, nome, cpf, status, departamento, pause_ai")
          .maybeSingle();
        contato = novo;
      }
    }
    contactId = contato?.id ?? null;

    // --- 3. Grava mensagem recebida (in) + timeline ---
    const conteudoIn = msg.ehPdf
      ? (msg.texto || "[Documento PDF enviado]")
      : msg.texto;
    const { data: chatIn } = await admin
      .from("chats")
      .insert({
        workspace_id: workspaceId,
        instance_id: instanceId,
        session_id: phone,
        direction: "in",
        status: "received",
        message: { type: "human", content: conteudoIn },
      })
      .select("id, created_at")
      .maybeSingle();

    await admin.from("timeline_events").insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      actor: "system",
      tipo: "msg_in",
      titulo: "Mensagem recebida",
      payload: { conteudo: conteudoIn, pdf: msg.ehPdf },
    });

    const msgAtualCreatedAt = chatIn?.created_at ?? new Date().toISOString();

    // --- 4. Carrega config do agente ---
    const { data: config } = await admin
      .from("config_agente")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (!config || !config.enabled || contato?.pause_ai) {
      // persistiu, não responde
      return json({ ok: true, persisted: true, respondido: false, motivo: "agente_off_ou_pausado" });
    }

    // --- 5. Janela de horário ---
    if (!dentroDaJanela(config.horario_inicio, config.horario_fim)) {
      return json({ ok: true, persisted: true, respondido: false, motivo: "fora_janela" });
    }

    // --- 6. Orçamento (budget) de chamadas de IA ---
    const inicioDia = inicioDoDiaISO();
    const { count: chamadasDia } = await admin
      .from("timeline_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("tipo", "chamada_ia")
      .gte("created_at", inicioDia);
    // max_chamadas_dia: 0 ou null = ilimitado (sem checagem de budget diário)
    const maxDia = config.max_chamadas_dia;
    if (maxDia && maxDia > 0 && (chamadasDia ?? 0) >= maxDia) {
      await admin.from("timeline_events").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        actor: "system",
        tipo: "erro_agente",
        titulo: "Budget diário atingido",
        payload: { chamadasDia, max: config.max_chamadas_dia },
      });
      return json({ ok: true, persisted: true, respondido: false, motivo: "budget_dia" });
    }

    const { count: chamadasConversa } = await admin
      .from("timeline_events")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("contact_id", contactId)
      .eq("tipo", "chamada_ia")
      .gte("created_at", inicioDia);
    // max_chamadas_conversa: 0 ou null = ilimitado (sem checagem de budget por conversa)
    const maxConversa = config.max_chamadas_conversa;
    if (maxConversa && maxConversa > 0 && (chamadasConversa ?? 0) >= maxConversa) {
      await admin.from("timeline_events").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        actor: "system",
        tipo: "erro_agente",
        titulo: "Budget por conversa atingido",
        payload: { chamadasConversa, max: config.max_chamadas_conversa },
      });
      return json({ ok: true, persisted: true, respondido: false, motivo: "budget_conversa" });
    }

    // --- 7. Debounce serverless ---
    const debounceMs = (config.debounce_segundos ?? 6) * 1000;
    if (debounceMs > 0) {
      await sleep(debounceMs);
      // se chegou msg 'in' mais nova para esse telefone, a invocação mais recente processa tudo.
      const { data: maisNova } = await admin
        .from("chats")
        .select("id, created_at")
        .eq("workspace_id", workspaceId)
        .eq("session_id", phone)
        .eq("direction", "in")
        .gt("created_at", msgAtualCreatedAt)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (maisNova) {
        return json({ ok: true, respondido: false, motivo: "debounce_superado" });
      }
    }

    // --- 9. Mídia não suportada (áudio/imagem): resposta fixa, sem IA ---
    if (msg.ehMidiaNaoSuportada) {
      await enviarHumanizado(admin, {
        workspaceId,
        instanceId,
        instanceToken,
        phone,
        contactId,
        textoFinal: MSG_MIDIA_NAO_SUPORTADA,
      });
      return json({ ok: true, respondido: true, motivo: "midia_nao_suportada" });
    }

    // --- 8. PDF: chama extrair-extrato e injeta resultado como contexto ---
    let nudgeSistema: string | null = null;
    if (msg.ehPdf) {
      if (!msg.pdfBase64) {
        // sem base64 no payload: avisa cliente + registra erro de config
        await admin.from("timeline_events").insert({
          workspace_id: workspaceId,
          contact_id: contactId,
          actor: "system",
          tipo: "erro_agente",
          titulo: "PDF sem base64 no webhook",
          payload: {
            dica: "Configure o webhook do wuzapi para enviar a mídia em base64.",
          },
        });
        nudgeSistema =
          "O cliente enviou um PDF, mas o sistema NÃO conseguiu ler o arquivo (falha técnica de recebimento da mídia). Avise o cliente com transparência, peça desculpas e sugira reenviar o extrato, ou seguir por CPF.";
      } else {
        try {
          const resp = await fetch(
            `${SUPABASE_URL}/functions/v1/extrair-extrato`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({
                workspace_id: workspaceId,
                contact_id: contactId,
                pdf_base64: msg.pdfBase64,
              }),
            },
          );
          if (!resp.ok) {
            const detalhe = await resp.text().catch(() => "");
            throw new Error(`extrair-extrato ${resp.status}: ${detalhe}`);
          }
          const extrato = await resp.json();
          nudgeSistema =
            "O sistema acabou de analisar o extrato do cliente. Resultado (apresente EXATAMENTE, sem inventar valores):\n" +
            JSON.stringify({
              mensagem_cliente: extrato?.mensagem_cliente,
              simulacao: extrato?.simulacao,
              dados_extraidos: extrato?.dados_extraidos,
            });
        } catch (e) {
          await admin.from("timeline_events").insert({
            workspace_id: workspaceId,
            contact_id: contactId,
            actor: "system",
            tipo: "erro_agente",
            titulo: "Falha ao extrair extrato",
            payload: { erro: String(e) },
          });
          nudgeSistema =
            "O sistema TENTOU analisar o PDF do cliente mas ocorreu uma falha técnica. Avise o cliente com transparência, peça desculpas e sugira reenviar o extrato em instantes.";
        }
      }
    }

    // --- 10. Monta contexto e chama o agente Claude ---
    const nomeAgente = config.nome_agente ?? "Aurus";
    const assinatura = config.assinatura ?? "_*Aurus - Especialista INSS*_";
    const clientRecord = {
      nome: contato?.nome,
      cpf: contato?.cpf,
      status: contato?.status,
      departamento: contato?.departamento,
      pushName: msg.pushName,
    };

    let systemPrompt = (config.persona_prompt ?? DEFAULT_PERSONA)
      .replace(/\{\{NOME_AGENTE\}\}/g, nomeAgente)
      .replace(/\{\{ASSINATURA\}\}/g, assinatura)
      .replace(/\{\{CLIENT_RECORD\}\}/g, JSON.stringify(clientRecord))
      .replace(/\{\{PHONE\}\}/g, phone)
      .replace(/\{\{DATA_ATUAL\}\}/g, dataAtualStr());

    // Histórico: últimas 20 msgs de chats desse telefone (ordem cronológica).
    const { data: historico } = await admin
      .from("chats")
      .select("message, direction, created_at")
      .eq("workspace_id", workspaceId)
      .eq("session_id", phone)
      .order("created_at", { ascending: false })
      .limit(20);
    const hist = (historico ?? []).slice().reverse();

    // Converte histórico em mensagens Anthropic (human->user, ai->assistant).
    const messages: any[] = [];
    for (const h of hist) {
      const m = h.message ?? {};
      const role = m.type === "ai" ? "assistant" : "user";
      const content = String(m.content ?? "").trim();
      if (!content) continue;
      // mescla mensagens consecutivas do mesmo role para satisfazer a API
      const last = messages[messages.length - 1];
      if (last && last.role === role) {
        last.content += "\n\n" + content;
      } else {
        messages.push({ role, content });
      }
    }
    // garante que começa com 'user'
    while (messages.length && messages[0].role !== "user") messages.shift();
    if (messages.length === 0) {
      messages.push({ role: "user", content: conteudoIn || "(sem texto)" });
    }

    // injeta o nudge do sistema (resultado do PDF) como turno de usuário/sistema
    if (nudgeSistema) {
      const last = messages[messages.length - 1];
      const marcado = `[SISTEMA] ${nudgeSistema}`;
      if (last && last.role === "user") {
        last.content += "\n\n" + marcado;
      } else {
        messages.push({ role: "user", content: marcado });
      }
    }

    const provider = (config.provider ?? "anthropic").toLowerCase();
    const modelo = provider === "gemini"
      ? (/^gemini/i.test(config.modelo ?? "") ? config.modelo : GEMINI_DEFAULT_MODEL)
      : (config.modelo ?? "claude-sonnet-5");

    // --- Loop de tool-use (máx 5 iterações) ---
    let textoFinal = "";
    let usageTotal: any = null;
    let escalou = false;

    if (provider === "gemini") {
      // Ferramentas no formato Gemini (functionDeclarations); input_schema já é
      // compatível com o subconjunto OpenAPI que a API do Gemini espera.
      const geminiTools = [{
        functionDeclarations: TOOLS.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.input_schema,
        })),
      }];

      // Monta "contents" no formato Gemini a partir do mesmo histórico (hist).
      const contents: any[] = [];
      for (const h of hist) {
        const m = h.message ?? {};
        const role = m.type === "ai" ? "model" : "user";
        const text = String(m.content ?? "").trim();
        if (!text) continue;
        const last = contents[contents.length - 1];
        if (last && last.role === role) {
          last.parts.push({ text });
        } else {
          contents.push({ role, parts: [{ text }] });
        }
      }
      while (contents.length && contents[0].role !== "user") contents.shift();
      if (contents.length === 0) {
        contents.push({ role: "user", parts: [{ text: conteudoIn || "(sem texto)" }] });
      }
      if (nudgeSistema) {
        const last = contents[contents.length - 1];
        const marcado = `[SISTEMA] ${nudgeSistema}`;
        if (last && last.role === "user") {
          last.parts.push({ text: marcado });
        } else {
          contents.push({ role: "user", parts: [{ text: marcado }] });
        }
      }

      for (let iter = 0; iter < 5; iter++) {
        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents,
              tools: geminiTools,
            }),
          },
        );

        if (!geminiResp.ok) {
          const detalhe = await geminiResp.text().catch(() => "");
          throw new Error(`gemini ${geminiResp.status}: ${detalhe}`);
        }

        const data = await geminiResp.json();
        usageTotal = data.usageMetadata ?? usageTotal;

        const parts = data?.candidates?.[0]?.content?.parts ?? [];
        const funcCalls = parts.filter((p: any) => p.functionCall);
        const textos = parts
          .filter((p: any) => p.text)
          .map((p: any) => p.text)
          .join("\n\n")
          .trim();

        // registra o turno do model no histórico local
        contents.push({ role: "model", parts });

        if (funcCalls.length === 0) {
          textoFinal = textos;
          break;
        }

        // executa cada tool e monta os functionResponse
        const funcResponseParts: any[] = [];
        for (const fc of funcCalls) {
          const resultado = await executarTool(admin, {
            nome: fc.functionCall.name,
            input: fc.functionCall.args ?? {},
            workspaceId,
            contactId,
            phone,
          });
          if (fc.functionCall.name === "escalar_humano") escalou = true;
          funcResponseParts.push({
            functionResponse: { name: fc.functionCall.name, response: resultado },
          });
        }
        contents.push({ role: "function", parts: funcResponseParts });

        if (escalou) {
          textoFinal =
            textos ||
            `${assinatura}\nVou te conectar agora com o Arthur, nosso especialista, que vai te dar toda a atenção. 🙏\n\nJá te respondo por aqui, tá bom?`;
          break;
        }
      }
    } else {
      for (let iter = 0; iter < 5; iter++) {
        const anthResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: modelo,
            max_tokens: 1024,
            system: systemPrompt,
            tools: TOOLS,
            messages,
          }),
        });

        if (!anthResp.ok) {
          const detalhe = await anthResp.text().catch(() => "");
          throw new Error(`anthropic ${anthResp.status}: ${detalhe}`);
        }

        const data = await anthResp.json();
        usageTotal = data.usage ?? usageTotal;

        // registra o turno do assistant no histórico local
        messages.push({ role: "assistant", content: data.content });

        const toolUses = (data.content ?? []).filter(
          (b: any) => b.type === "tool_use",
        );
        const textos = (data.content ?? [])
          .filter((b: any) => b.type === "text")
          .map((b: any) => b.text)
          .join("\n\n")
          .trim();

        if (toolUses.length === 0) {
          textoFinal = textos;
          break;
        }

        // executa cada tool e monta os tool_results
        const toolResults: any[] = [];
        for (const tu of toolUses) {
          const resultado = await executarTool(admin, {
            nome: tu.name,
            input: tu.input,
            workspaceId,
            contactId,
            phone,
          });
          if (tu.name === "escalar_humano") escalou = true;
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(resultado),
          });
        }
        messages.push({ role: "user", content: toolResults });

        // Se escalou para humano, encerra com transição suave (usa texto do modelo se houver).
        if (escalou) {
          textoFinal =
            textos ||
            `${assinatura}\nVou te conectar agora com o Arthur, nosso especialista, que vai te dar toda a atenção. 🙏\n\nJá te respondo por aqui, tá bom?`;
          break;
        }
      }
    }

    // Blindagem: personas legadas (n8n) instruem saída JSON tipo [{"response":"..."}].
    // Se o texto final for JSON nesse formato, extrai só o conteúdo humano.
    textoFinal = extrairRespostaHumana(textoFinal);

    if (!textoFinal) {
      textoFinal = `${assinatura}\nMe dá um instante que já te respondo. 🙏`;
    }

    // --- 11. Registra chamada de IA ---
    await admin.from("timeline_events").insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      actor: "aurus",
      tipo: "chamada_ia",
      titulo: "Resposta do agente",
      payload: {
        modelo,
        usage: usageTotal,
        escalou,
      },
    });

    // --- 12. Envio humanizado (chunks por \n\n, delay aleatório) ---
    await enviarHumanizado(admin, {
      workspaceId,
      instanceId,
      instanceToken,
      phone,
      contactId,
      textoFinal,
    });

    return json({ ok: true, respondido: true, escalou });
  } catch (e) {
    // --- 13. try/catch global: nunca 500 (evita retry loop do wuzapi) ---
    try {
      await admin.from("timeline_events").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        actor: "system",
        tipo: "erro_agente",
        titulo: "Exceção no whatsapp-inbound",
        payload: { erro: String(e) },
      });
    } catch (_) {
      // ignora falha ao registrar
    }
    return json({ ok: true, error: String(e) });
  }
});

// ---------------------------------------------------------------------------
// Execução das ferramentas do agente
// ---------------------------------------------------------------------------
async function executarTool(
  admin: any,
  args: {
    nome: string;
    input: any;
    workspaceId: number;
    contactId: number | null;
    phone: string;
  },
): Promise<any> {
  const { nome, input, workspaceId, contactId, phone } = args;

  try {
    if (nome === "atualizar_contato") {
      const campos = input?.campos ?? {};
      const update: Record<string, unknown> = {};
      for (const k of CAMPOS_CONTATO_PERMITIDOS) {
        if (campos[k] !== undefined && campos[k] !== null && campos[k] !== "") {
          update[k] = campos[k];
        }
      }
      if (Object.keys(update).length === 0) {
        return { ok: false, erro: "nenhum_campo_valido" };
      }
      await admin.from("contacts").update(update).eq("id", contactId);
      await admin.from("timeline_events").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        actor: "aurus",
        tipo: "nota",
        titulo: "Contato atualizado pelo agente",
        payload: { campos: update },
      });
      return { ok: true, atualizado: update };
    }

    if (nome === "simular_credito") {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/simular-credito`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          contact_id: contactId,
          persistir: true,
          cliente: input?.cliente,
          beneficio: input?.beneficio,
          margens: input?.margens,
          contratos: input?.contratos ?? [],
        }),
      });
      const resultado = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return { ok: false, erro: `simular-credito ${resp.status}`, detalhe: resultado };
      }
      return { ok: true, simulacao: resultado };
    }

    if (nome === "criar_followup") {
      const horas = Number(input?.due_em_horas ?? 24);
      const dueAt = new Date(Date.now() + horas * 3600 * 1000).toISOString();
      await admin.from("follow_ups").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        tipo: "recontato",
        titulo: input?.titulo ?? "Recontato",
        mensagem: input?.mensagem ?? "",
        due_at: dueAt,
        status: "pendente",
        canal: "whatsapp",
      });
      await admin.from("timeline_events").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        actor: "aurus",
        tipo: "followup",
        titulo: "Follow-up agendado",
        payload: { titulo: input?.titulo, due_at: dueAt },
      });
      return { ok: true, due_at: dueAt };
    }

    if (nome === "escalar_humano") {
      await admin
        .from("contacts")
        .update({
          departamento: "HUMANO",
          status: "aguardando",
          pause_ai: true,
        })
        .eq("id", contactId);
      await admin.from("timeline_events").insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        actor: "aurus",
        tipo: "nota",
        titulo: "Escalado para humano",
        payload: { motivo: input?.motivo },
      });
      return { ok: true, escalado: true };
    }

    return { ok: false, erro: "tool_desconhecida" };
  } catch (e) {
    return { ok: false, erro: String(e) };
  }
}

// ---------------------------------------------------------------------------
// Envio humanizado: divide por \n\n em até 4 chunks, presence + delay + send,
// grava chats 'out' {type:'ai'} + timeline 'msg_out' actor 'aurus'.
// ---------------------------------------------------------------------------
async function enviarHumanizado(
  admin: any,
  args: {
    workspaceId: number;
    instanceId: string | null;
    instanceToken: string | null;
    phone: string;
    contactId: number | null;
    textoFinal: string;
  },
) {
  const { workspaceId, instanceId, instanceToken, phone, contactId, textoFinal } =
    args;

  let chunks = textoFinal
    .split(/\n\n+/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (chunks.length === 0) chunks = [textoFinal];
  if (chunks.length > 4) {
    // junta o excedente no 4º chunk
    const head = chunks.slice(0, 3);
    const tail = chunks.slice(3).join("\n\n");
    chunks = [...head, tail];
  }

  for (const chunk of chunks) {
    let enviado = false;
    if (instanceToken) {
      await wuzapiPresence(instanceToken, phone);
      const delay = 1200 + Math.floor(Math.random() * 1300); // 1200–2500ms
      await sleep(delay);
      enviado = await wuzapiSendText(instanceToken, phone, chunk);
    }

    await admin.from("chats").insert({
      workspace_id: workspaceId,
      instance_id: instanceId,
      session_id: phone,
      direction: "out",
      status: enviado ? "sent" : "failed",
      message: { type: "ai", content: chunk },
    });
    await admin.from("timeline_events").insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      actor: "aurus",
      tipo: "msg_out",
      titulo: "Mensagem enviada pelo agente",
      payload: { conteudo: chunk, status: enviado ? "sent" : "failed" },
    });
  }
}
