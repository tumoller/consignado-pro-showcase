// Edge Function: extrair-extrato
// Recebe o PDF do "Extrato de Empréstimos" do Meu INSS (via WhatsApp ou front),
// corta as 3 primeiras páginas, extrai dados estruturados com Gemini (PDF nativo,
// sem converter para imagem), roda a simulação de crédito e monta a mensagem
// de resposta ao cliente.

import { PDFDocument } from "npm:pdf-lib@1.17.1";

// ---------------------------------------------------------------------------
// Config / env
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface RequestBody {
  workspace_id: number;
  contact_id?: number;
  pdf_base64: string;
  tipo?: "descoberta" | "enquadramento";
}

interface DadosExtraidos {
  cliente: {
    nome_completo: string | null;
    tipo_beneficio: string | null;
    representante_legal: "SIM" | "NAO" | null;
    meio_pagamento: string | null;
    banco_pagamento: string | null;
    data_emissao_extrato: string | null;
  };
  beneficio: {
    numero_beneficio: string | null;
    situacao_emprestimos: string | null;
    elegivel_emprestimos: string | null;
  };
  margens: {
    emprestimo: number;
    rmc: number;
    rcc: number;
    extrapolada: number;
    base_calculo: number;
    total_comprometido: number;
  };
  contratos: Array<{
    numero_contrato: string | null;
    banco: string | null;
    data_inclusao: string | null;
    parcela: number;
    prazo_total: number;
    parcelas_pagas: number;
    valor_emprestado: number;
  }>;
}

// ---------------------------------------------------------------------------
// 1. Cortar PDF nas 3 primeiras páginas
// ---------------------------------------------------------------------------

async function cortarPdfTresPaginas(pdfBase64: string): Promise<string> {
  const bytes = base64ToBytes(pdfBase64);
  const srcDoc = await PDFDocument.load(bytes);
  const totalPaginas = srcDoc.getPageCount();
  const qtd = Math.min(3, totalPaginas);
  const indices = Array.from({ length: qtd }, (_, i) => i);

  const novoDoc = await PDFDocument.create();
  const paginasCopiadas = await novoDoc.copyPages(srcDoc, indices);
  for (const pagina of paginasCopiadas) novoDoc.addPage(pagina);

  const novoBytes = await novoDoc.save();
  return bytesToBase64(novoBytes);
}

function base64ToBytes(b64: string): Uint8Array {
  const binStr = atob(b64);
  const bytes = new Uint8Array(binStr.length);
  for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binStr = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binStr += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binStr);
}

// ---------------------------------------------------------------------------
// 2. Gemini — extração estruturada do PDF
// ---------------------------------------------------------------------------

const GEMINI_PROMPT = `Você vai analisar um "Extrato de Empréstimos Consignados" do Meu INSS, com até 3 páginas:
- Página 1: dados do beneficiário e do benefício (nome, tipo de benefício, se possui representante legal, meio e banco de pagamento, data de emissão do extrato, número do benefício, situação dos empréstimos, elegibilidade a novos empréstimos).
- Página 2: margens consignáveis, com os campos "Base de Cálculo", "Máximo de Comprometimento"/"Total Comprometido", "Margem Extrapolada", "Empréstimos - Margem Disponível", "RMC - Margem Disponível" (cartão de crédito consignado) e "RCC - Margem Disponível" (cartão de crédito com reserva de conta/benefício).
- Página 3 em diante: tabela de contratos ativos, com colunas "Contrato", "Banco", "Data de Inclusão", "Valor da Parcela", "Prazo Total" (também chamado "QTDE PARCELAS"), "Quantidade de Parcelas Pagas" e "Valor Emprestado".

Extraia os dados EXATAMENTE conforme aparecem no documento, seguindo o schema JSON fornecido. Regras obrigatórias:
- Todos os valores monetários devem ser números SEM símbolo de moeda e SEM separador de milhar, usando PONTO como separador decimal (ex.: "R$ 1.234,56" vira 1234.56).
- Se um campo não existir ou não estiver legível no documento, retorne null (ou 0 para números de margens/contratos).
- NUNCA invente ou estime valores que não estejam explicitamente no documento.
- Contratos de cartão de crédito (RMC/RCC) normalmente têm prazo total "00" — nesse caso retorne prazo_total como 0.
- Liste TODOS os contratos encontrados na(s) página(s) de contratos.`;

const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    cliente: {
      type: "OBJECT",
      properties: {
        nome_completo: { type: "STRING", nullable: true },
        tipo_beneficio: { type: "STRING", nullable: true },
        representante_legal: { type: "STRING", enum: ["SIM", "NAO"], nullable: true },
        meio_pagamento: { type: "STRING", nullable: true },
        banco_pagamento: { type: "STRING", nullable: true },
        data_emissao_extrato: { type: "STRING", nullable: true },
      },
      required: ["nome_completo"],
    },
    beneficio: {
      type: "OBJECT",
      properties: {
        numero_beneficio: { type: "STRING", nullable: true },
        situacao_emprestimos: { type: "STRING", nullable: true },
        elegivel_emprestimos: { type: "STRING", nullable: true },
      },
    },
    margens: {
      type: "OBJECT",
      properties: {
        emprestimo: { type: "NUMBER" },
        rmc: { type: "NUMBER" },
        rcc: { type: "NUMBER" },
        extrapolada: { type: "NUMBER" },
        base_calculo: { type: "NUMBER" },
        total_comprometido: { type: "NUMBER" },
      },
      required: ["emprestimo", "rmc", "rcc", "extrapolada", "base_calculo", "total_comprometido"],
    },
    contratos: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          numero_contrato: { type: "STRING", nullable: true },
          banco: { type: "STRING", nullable: true },
          data_inclusao: { type: "STRING", nullable: true },
          parcela: { type: "NUMBER" },
          prazo_total: { type: "NUMBER" },
          parcelas_pagas: { type: "NUMBER" },
          valor_emprestado: { type: "NUMBER" },
        },
        required: ["parcela", "prazo_total", "parcelas_pagas", "valor_emprestado"],
      },
    },
  },
  required: ["cliente", "beneficio", "margens", "contratos"],
};

async function extrairComGemini(pdfBase64Cortado: string): Promise<DadosExtraidos> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: GEMINI_PROMPT },
            { inline_data: { mime_type: "application/pdf", data: pdfBase64Cortado } },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: "application/json",
        response_schema: GEMINI_SCHEMA,
        temperature: 0,
      },
    }),
  });

  if (!resp.ok) {
    const detalhe = (await resp.text()).slice(0, 500);
    throw new GeminiError(`Gemini respondeu ${resp.status}: ${detalhe}`);
  }

  const data = await resp.json();
  const textoJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textoJson) {
    throw new GeminiError("Gemini não retornou conteúdo estruturado.");
  }

  try {
    return JSON.parse(textoJson) as DadosExtraidos;
  } catch {
    throw new GeminiError("Falha ao parsear JSON retornado pelo Gemini.");
  }
}

class GeminiError extends Error {}

// ---------------------------------------------------------------------------
// 3. Validação de sanidade
// ---------------------------------------------------------------------------

function validarSanidade(dados: DadosExtraidos): string[] {
  const alertas: string[] = [];

  const m = dados.margens ?? ({} as DadosExtraidos["margens"]);
  for (const campo of ["emprestimo", "rmc", "rcc", "extrapolada", "base_calculo", "total_comprometido"] as const) {
    const valor = m[campo];
    if (typeof valor === "number" && valor < 0) {
      alertas.push(`Margem "${campo}" negativa (${valor}) — possível erro de extração.`);
    }
  }

  for (const contrato of dados.contratos ?? []) {
    let contratoSuspeito = false;
    if (!(contrato.parcela > 0)) contratoSuspeito = true;
    if (!(contrato.prazo_total >= 0)) contratoSuspeito = true;
    if (contrato.parcelas_pagas > contrato.prazo_total && contrato.prazo_total > 0) {
      contratoSuspeito = true;
    }
    if (contratoSuspeito) {
      alertas.push(
        `Contrato ${contrato.numero_contrato ?? "(sem número)"} com dados inconsistentes — confiança baixa.`,
      );
    }
  }

  return alertas;
}

// ---------------------------------------------------------------------------
// 4. Chamar simular-credito
// ---------------------------------------------------------------------------

async function chamarSimulacao(
  body: RequestBody,
  dados: DadosExtraidos,
): Promise<Record<string, unknown>> {
  const contratosFiltrados = (dados.contratos ?? [])
    .filter((c) => c.prazo_total > 0)
    .map((c) => ({
      banco: c.banco,
      numero_contrato: c.numero_contrato,
      parcela_original: c.parcela,
      valor_emprestado_original: c.valor_emprestado,
      qtd_parcelas_pagas: c.parcelas_pagas,
      prazo_total_original: c.prazo_total,
    }));

  const payload = {
    workspace_id: body.workspace_id,
    contact_id: body.contact_id,
    persistir: !!body.contact_id,
    cliente: {
      nome_completo: dados.cliente?.nome_completo,
      tipo_beneficio: dados.cliente?.tipo_beneficio,
      representante_legal: dados.cliente?.representante_legal,
    },
    beneficio: {
      situacao_emprestimos: dados.beneficio?.situacao_emprestimos,
      elegivel_emprestimos: dados.beneficio?.elegivel_emprestimos,
    },
    margens: {
      emprestimo: dados.margens?.emprestimo ?? 0,
      rmc: dados.margens?.rmc ?? 0,
      rcc: dados.margens?.rcc ?? 0,
      extrapolada: dados.margens?.extrapolada ?? 0,
    },
    contratos: contratosFiltrados,
  };

  const resp = await fetch(`${SUPABASE_URL}/functions/v1/simular-credito`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const detalhe = (await resp.text()).slice(0, 500);
    throw new Error(`simular-credito respondeu ${resp.status}: ${detalhe}`);
  }

  return await resp.json();
}

// ---------------------------------------------------------------------------
// 5. Pós-processamento: timeline_events + update em simulations/contacts
// ---------------------------------------------------------------------------

function pgHeaders(): Record<string, string> {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
}

async function atualizarTipoSimulacao(simulationId: number, tipo: string): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/simulations?id=eq.${simulationId}`, {
    method: "PATCH",
    headers: { ...pgHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ tipo }),
  });
}

async function inserirTimelineEvent(evento: Record<string, unknown>): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/timeline_events`, {
    method: "POST",
    headers: { ...pgHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(evento),
  });
}

async function atualizarContatoFillOnlyEmpty(
  contactId: number,
  dados: DadosExtraidos,
): Promise<void> {
  // Lê o contato atual para preencher só campos vazios.
  const respGet = await fetch(
    `${SUPABASE_URL}/rest/v1/contacts?id=eq.${contactId}&select=nome,esp_benef,nb_mat`,
    { headers: pgHeaders() },
  );
  if (!respGet.ok) return;
  const rows = await respGet.json();
  const atual = rows?.[0];
  if (!atual) return;

  const update: Record<string, unknown> = {};
  if (!atual.nome && dados.cliente?.nome_completo) update.nome = dados.cliente.nome_completo;
  if (!atual.esp_benef && dados.cliente?.tipo_beneficio) update.esp_benef = dados.cliente.tipo_beneficio;
  if (!atual.nb_mat && dados.beneficio?.numero_beneficio) update.nb_mat = dados.beneficio.numero_beneficio;

  if (Object.keys(update).length === 0) return;

  await fetch(`${SUPABASE_URL}/rest/v1/contacts?id=eq.${contactId}`, {
    method: "PATCH",
    headers: { ...pgHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify(update),
  });
}

// ---------------------------------------------------------------------------
// 6. Mensagem para o cliente (WhatsApp)
// ---------------------------------------------------------------------------

function fmtBRL(valor: number | undefined | null): string {
  const v = typeof valor === "number" ? valor : 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function montarMensagemCliente(dados: DadosExtraidos, simulacao: Record<string, unknown>): string {
  const nome = dados.cliente?.nome_completo?.split(" ")[0] ?? "cliente";
  const linhasDisponiveis: string[] = [];
  const linhasIndisponiveis: string[] = [];

  const emprestimoNovo = simulacao?.emprestimo_novo as
    | { disponivel?: boolean; valor_liberado?: number; motivo?: string }
    | undefined;
  if (emprestimoNovo) {
    if (emprestimoNovo.disponivel) {
      linhasDisponiveis.push(
        `💰 *Empréstimo novo*: até ${fmtBRL(emprestimoNovo.valor_liberado)} liberados.`,
      );
    } else {
      linhasIndisponiveis.push(
        `💰 *Empréstimo novo*: indisponível${emprestimoNovo.motivo ? ` — ${emprestimoNovo.motivo}` : ""}.`,
      );
    }
  }

  const cartaoRmc = simulacao?.cartao_rmc as
    | { disponivel?: boolean; valor_liberado?: number; motivo?: string }
    | undefined;
  if (cartaoRmc) {
    if (cartaoRmc.disponivel) {
      linhasDisponiveis.push(
        `💳 *Cartão RMC*: até ${fmtBRL(cartaoRmc.valor_liberado)} disponível.`,
      );
    } else {
      linhasIndisponiveis.push(
        `💳 *Cartão RMC*: indisponível${cartaoRmc.motivo ? ` — ${cartaoRmc.motivo}` : ""}.`,
      );
    }
  }

  const cartaoRcc = simulacao?.cartao_rcc as
    | { disponivel?: boolean; valor_liberado?: number; motivo?: string }
    | undefined;
  if (cartaoRcc) {
    if (cartaoRcc.disponivel) {
      linhasDisponiveis.push(
        `💳 *Cartão RCC*: até ${fmtBRL(cartaoRcc.valor_liberado)} disponível.`,
      );
    } else {
      linhasIndisponiveis.push(
        `💳 *Cartão RCC*: indisponível${cartaoRcc.motivo ? ` — ${cartaoRcc.motivo}` : ""}.`,
      );
    }
  }

  const contratosSim = (simulacao?.contratos as Array<Record<string, unknown>>) ?? [];
  for (const contrato of contratosSim) {
    const refin = contrato?.simulacao_refin_portabilidade as
      | {
          disponivel?: boolean;
          banco?: string;
          troco_estimado_min?: number;
          troco_estimado?: number;
          motivo?: string;
        }
      | undefined;
    if (!refin) continue;
    const banco = refin.banco ?? contrato?.banco ?? "banco atual";
    if (refin.disponivel) {
      linhasDisponiveis.push(
        `🔄 *Portabilidade (${banco})*: troco estimado entre ${fmtBRL(refin.troco_estimado_min)} e ${fmtBRL(refin.troco_estimado)}.`,
      );
    } else {
      linhasIndisponiveis.push(
        `🔄 *Portabilidade (${banco})*: indisponível${refin.motivo ? ` — ${refin.motivo}` : ""}.`,
      );
    }
  }

  const partes: string[] = [`Olá, ${nome}! Analisei seu extrato do INSS. Veja o que encontrei:`];

  if (linhasDisponiveis.length > 0) {
    partes.push("\n✅ *Oportunidades disponíveis:*");
    partes.push(...linhasDisponiveis);
  }

  if (linhasIndisponiveis.length > 0) {
    partes.push("\n❌ *Não disponível no momento:*");
    partes.push(...linhasIndisponiveis);
  }

  partes.push(
    "\n📋 *Importante:* Valores são estimativas com base no extrato. Confirmação final após análise do banco.",
  );

  return partes.join("\n");
}

// ---------------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    if (req.method !== "POST") {
      return json({ ok: false, error: "Método não suportado." }, 400);
    }

    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Body inválido (JSON malformado)." }, 400);
    }

    if (!body?.workspace_id || !body?.pdf_base64) {
      return json(
        { ok: false, error: "Campos obrigatórios ausentes: workspace_id, pdf_base64." },
        400,
      );
    }

    // 1. Corta o PDF nas 3 primeiras páginas.
    let pdfCortadoBase64: string;
    try {
      pdfCortadoBase64 = await cortarPdfTresPaginas(body.pdf_base64);
    } catch (err) {
      return json(
        { ok: false, error: `Falha ao processar o PDF: ${(err as Error).message}` },
        400,
      );
    }

    // 2. Extração estruturada via Gemini.
    let dados: DadosExtraidos;
    try {
      dados = await extrairComGemini(pdfCortadoBase64);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ ok: false, error: `Falha na extração via Gemini: ${msg}` }, 502);
    }

    // 3. Validação de sanidade.
    const alertas = validarSanidade(dados);

    // 4. Simulação de crédito.
    let simulacao: Record<string, unknown>;
    try {
      simulacao = await chamarSimulacao(body, dados);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ ok: false, error: `Falha ao simular crédito: ${msg}` }, 502);
    }

    // 5. Persistência (apenas quando há contact_id).
    if (body.contact_id) {
      const simulationId = simulacao?.simulation_id as number | undefined;
      const tipo = body.tipo ?? "descoberta";

      if (simulationId) {
        await atualizarTipoSimulacao(simulationId, tipo).catch(() => {});
      }

      const valorTotalDisponivel =
        (simulacao?.valor_total_disponivel as number | undefined) ??
        (simulacao?.emprestimo_novo as { valor_liberado?: number })?.valor_liberado ?? 0;

      await inserirTimelineEvent({
        workspace_id: body.workspace_id,
        contact_id: body.contact_id,
        actor: "system",
        tipo: "simulacao",
        titulo: `Extrato analisado: ${dados.cliente?.nome_completo ?? "cliente"}`,
        payload: {
          margens: dados.margens,
          n_contratos: dados.contratos?.length ?? 0,
          valor_total_disponivel: valorTotalDisponivel,
          alertas,
        },
      }).catch(() => {});

      await atualizarContatoFillOnlyEmpty(body.contact_id, dados).catch(() => {});
    }

    // 6. Mensagem final ao cliente.
    const mensagemCliente = montarMensagemCliente(dados, simulacao);

    return json({
      ok: true,
      dados_extraidos: dados,
      simulacao,
      mensagem_cliente: mensagemCliente,
      alertas,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: `Erro inesperado: ${msg}` }, 500);
  }
});
