# Consignado Pro → Hub de Negócios ("Jarvis do Corban")
### Relatório de Análise + Plano de Execução por Etapas
**Data:** 2026-07-11 · **Autor:** Claude (Opus 4.8) · **Status:** proposta para aprovação

---

## 0. Sumário executivo (leia isto primeiro)

Você não tem um "dashboard cru" — você tem **duas metades desconectadas**: um banco de dados já rico (366 contatos, 319 propostas, comissões, RLS multi-tenant, motor de simulação já no ar) e um front que só **lê** esses dados. O que falta não é reescrever: é **conectar, dar inteligência e fechar o loop operacional**.

A estratégia deste plano segue a sua realidade: **o motor de receita é o YouTube → lead cai no WhatsApp**. Portanto a ordem de ataque é:

> **1) Agente de WhatsApp** (recebe, simula, qualifica, cadastra, fecha) → **2) CRM operacional** (sua central de comando) → **3) Simulador ponta-a-ponta** (PDF→resultado→CRM) → **4) Campanhas** (reaquecer a carteira).

Cada etapa entrega **valor de venda isolado** — nada de "big bang" de 3 meses sem retorno. Você grava vídeo, o lead chega, o agente trabalha 24/7, e você acompanha tudo de um lugar só.

**Princípio-guia:** "No consignado o cliente nunca se perde." O sistema é desenhado para que **todo lead vire registro qualificado**, mesmo sem fechar — porque uma hora surge margem, surge oportunidade, e a IA (com memória) vai lembrar.

---

## 1. Metodologia

Como cheguei a este plano:

1. **Auditoria do que existe** — li o schema real do Supabase (14 tabelas), o estado do Git (branch `feat/dashboard-kanban-crud` com 3 commits não mergeados), o relatório de frontend já produzido (`docs/relatorio_frontend.md`) e o fluxo n8n antigo (`AFBOT Analise PDF INSS.json`, de onde extraí o motor de cálculo).
2. **Mapeamento da rotina real do corban** — a esteira Lead → Simulação → Digitação → Averbação → Comissão, cruzada com as suas regras (bancos, usuários de banco por promotora, parâmetros por banco, log de simulações).
3. **Benchmark** — Storm Tecnologia (pipeline Kanban de propostas, controle de pendências) e Promosys (simulação comparativa entre bancos + consulta de margem unificada).
4. **Validação de arquitetura** — escolhas que aguentam o crescimento (multi-tenant, serverless, fila de mensagens) sem virar um monstro caro de manter.

**Regra de ouro adotada:** nada de hardcode em código para valores que mudam ("na minha área muda muita coisa o tempo todo"). Coeficientes, taxas, bancos, parâmetros → **tabelas de configuração** editáveis pela interface. Você muda na tela, o sistema obedece, sem redeploy.

---

## 2. Diagnóstico do estado atual

### 2.1 O que já está bom (não mexer / aproveitar)
- **Kanban de propostas** (branch `feat/dashboard-kanban-crud`) — você aprovou, está perfeito. Vira a espinha dorsal da tela de Propostas.
- **Banco de dados** — schema sólido, RLS multi-tenant funcionando, comissão como coluna gerada correta (`saldo*cms_pct/100`).
- **Motor de simulação** — `Edge Function simular-credito` já no ar e testada (taxa via Newton-Raphson, saldo devedor, refin/portabilidade, travas BPC). Grava em `simulations`.
- **Config versionada** — tabela `config_credito` criada, parâmetros editáveis por workspace.
- **Conexão WhatsApp (Wuzapi)** — telas de instância/QR já existem e funcionam.

### 2.2 Bugs e dívidas técnicas identificados (fixes)
| # | Problema | Onde | Ação |
|---|----------|------|------|
| B1 | `Integracoes.tsx` 100% comentado (código morto) + link quebrado no menu que redireciona pra home | `src/pages/Integracoes.tsx`, `Sidebar.tsx` | Remover arquivo e item de menu |
| B2 | Cores hardcoded (`bg-gray-100`, `text-red-500`) quebram dark mode | `Login.tsx`, `NotFound.tsx`, `Sidebar.tsx` | Migrar p/ tokens do design system |
| B3 | Tokens de status (`--success/--warning/--info`) só no `:root`, ausentes no `.dark` | `src/index.css` | Já parcialmente corrigido na branch; finalizar |
| B4 | Bug de opacidade do Tailwind (`hsl(var(--x))` sem `<alpha-value>`) | `tailwind.config.ts` | Já corrigido na branch (commit 78b43b2); validar |
| B5 | Tabela `contacts_backup_20260708` com **RLS desligado** (exposta ao anon key) | Supabase | Ligar RLS ou dropar o backup (é temporário) |
| B6 | Tela de Conversas é passiva (não envia mensagem nem lê histórico) | `Conversas.tsx` | Reescrever como chat real na Etapa 2 |
| B7 | Contato com `workspace_id` null (1 registro) não aparece em queries | `contacts` | Corrigir na limpeza de dados |

### 2.3 O que falta para virar "Jarvis" (as lacunas de produto)
1. **Inteligência / cruzamento de dados** — hoje cada tela mostra sua tabela isolada. Falta o que gera dinheiro: *"clientes com margem que nunca receberam proposta"*, *"portabilidades maduras (12+ meses)"*, *"comissão por banco/promotora"*, *"aniversariantes do mês"*.
2. **Escrita/CRUD inteligente** — cadastrar e editar de dentro das fichas (parcialmente feito na branch).
3. **Telas de configuração do negócio** — bancos, usuários de banco, promotoras, parâmetros de simulação por banco. **Não existem.**
4. **O agente de IA** — o cérebro que recebe o lead, simula, qualifica e fecha. **Não existe** (só o motor de cálculo isolado existe).
5. **Mensageria robusta** — fila, guardrails anti-bloqueio, rotação. Hoje é envio direto (arriscado para disparo em escala).

---

## 3. Arquitetura recomendada (validada)

### 3.1 Princípio: "serverless-first, um container só quando obrigatório"
```
┌─────────────────────────────────────────────────────────────┐
│  YOUTUBE (motor de receita) → gera leads                     │
└───────────────┬─────────────────────────────────────────────┘
                ▼
┌──────────────────────┐   webhook   ┌────────────────────────┐
│  Wuzapi (Railway)    │────────────▶│ Edge Function          │
│  1 container 24/7     │             │ whatsapp-inbound       │
│  (WhatsApp não-oficial)│◀───────────│ (o "Aya" — cérebro IA) │
└──────────────────────┘   envia      └───────┬────────────────┘
                                              │ usa
                          ┌───────────────────┼───────────────────┐
                          ▼                   ▼                   ▼
                  ┌──────────────┐   ┌────────────────┐  ┌──────────────┐
                  │ simular-credito│  │ Claude API      │  │ Supabase DB  │
                  │ (motor cálculo)│  │ (conversa/tools)│  │ + RAG memória│
                  └──────────────┘   └────────────────┘  └──────────────┘
                                                                 ▲
┌──────────────────────────────────────────────────────────────┘
│  DASHBOARD (Vite+React, Vercel) — sua central de comando
│  lê/escreve o mesmo Supabase; acompanha em tempo real
└──────────────────────────────────────────────────────────────┘
```

**Por que assim (justificativa):**
- **Edge Functions (Deno) para a lógica** — sem servidor para manter, escala sozinho, já é onde vive `simular-credito`. O agente Aya roda aqui.
- **Wuzapi em 1 container na Railway** — WhatsApp não-oficial *precisa* de processo always-on (Edge Function é serverless, não serve). 1 instância serve N workspaces. Já validado no seu fluxo antigo.
- **Supabase como fonte única da verdade** — CRM, memória do agente (RAG via `chats.embedding`), configs. Tudo num lugar, com RLS.
- **Claude API como o "cérebro" conversacional** — tool-use para chamar `simular-credito`, buscar/cadastrar cliente, consultar CRM. Você já tem crédito.

### 3.2 O que NÃO fazer (decisões conscientes)
- ❌ **Não migrar para Next.js** — Vite+React atende, migração é custo puro sem retorno agora.
- ❌ **Não usar WA-HA open-source** — limitação real com áudio/vídeo; Wuzapi já testado e lida com mídia.
- ❌ **Não construir fila com Redis externo agora** — usar `pg_cron` + tabela de fila no próprio Postgres (mais simples, sem infra extra). Migrar para fila dedicada só se o volume exigir.

---

## 4. Modelo de dados — o que falta no CRM (a sua profissão exige)

Estas tabelas **não existem** e são pré-requisito para o Simulador e o Agente funcionarem com a sua realidade. Proposta de schema (a validar com você):

### 4.1 `bancos` (já existe `bancos_ativos` com 13 registros — expandir)
Enriquecer com: `codigo_febraban`, `opera_portabilidade` (bool), `opera_refin` (bool), `opera_margem_livre` (bool), `opera_cartao` (bool), `observacoes`.

### 4.2 `promotoras` (NOVA)
As promotoras/correspondentes-mestre por onde você opera. Campos: `nome`, `cnpj`, `ativo`, `observacoes`.

### 4.3 `usuarios_banco` (NOVA) — *o ponto que você destacou*
> "posso ter um mesmo usuário de banco por promotoras diferentes"

Modelagem correta = **um registro por combinação (banco + promotora + login)**:
```
usuarios_banco:
  id, workspace_id, banco_id (FK), promotora_id (FK),
  login, senha_ref (referência/apelido, NUNCA senha em texto puro),
  ativo, observacoes
  UNIQUE (banco_id, promotora_id, login)
```
Assim o mesmo login aparece sob promotoras diferentes sem conflito. **Senhas reais não ficam no banco** — guardamos só um apelido/referência; a credencial real fica no seu gerenciador. (Regra de segurança: eu nunca manipulo senha em texto puro.)

### 4.4 `parametros_simulacao` (NOVA) — *taxa por banco*
> "Banco X opera portabilidade a 1,50% e refin a 1,75%"

```
parametros_simulacao:
  id, workspace_id, banco_id (FK),
  coef_emprestimo, coef_cartao,
  taxa_portabilidade_perc, taxa_refin_perc,
  prazo_maximo_meses, vigente_desde (date),
  ativo
```
Isto **estende** `config_credito` (que é o default global) com overrides por banco. A `simular-credito` passa a aceitar `banco_id` e usar o parâmetro específico. Você cadastra na tela, muda quando o banco muda a tabela, e o histórico fica registrado (`vigente_desde`).

### 4.5 `simulations` (já existe — enriquecer o log)
> "Toda simulação deve gerar log com data e hora... a primeira simulação é sempre pra achar os dados do contrato e depois ver onde encaixa"

A tabela já grava `created_at`, `result_data`, `valor_total_disponivel`. Adicionar: `banco_id` (onde encaixou), `tipo` (`descoberta` = 1ª leitura do extrato vs `enquadramento` = simulação de fechamento), `contact_id`. Assim você tem a **linha do tempo de cada cliente**: quando simulou, o que achou, onde encaixou.

---

## 5. Sistema de mensageria WhatsApp (filas, guardrails, anti-bloqueio)

O ponto mais delicado — WhatsApp não-oficial **bane número que dispara como robô**. Arquitetura defensiva:

### 5.1 Fila (não enviar direto)
- Tabela `message_queue` no Postgres: `id, workspace_id, instance_id, phone, payload, status (pending/sent/failed), scheduled_at, sent_at, attempts`.
- `pg_cron` roda a cada minuto, pega N mensagens `pending` cujo `scheduled_at` já passou, envia via Wuzapi, marca `sent`.

### 5.2 Guardrails anti-bloqueio (obrigatórios para campanhas)
1. **Throttle** — máximo X mensagens por minuto/hora por instância (configurável). Nunca rajada.
2. **Intervalo aleatório** — jitter entre envios (ex: 20–90s randômico), simula humano.
3. **Rotação de mensagens** — nunca o mesmo texto idêntico para 100 pessoas. Templates com variações (spintax: `{Olá|Oi|E aí}, {nome}`) — some N variações geradas.
4. **Aquecimento** — número novo começa com volume baixo, sobe gradual.
5. **Janela de horário comercial** — não disparar 3h da manhã (marca de bot).
6. **Respeito a opt-out** — quem pede pra parar, para. Flag no contato.
7. **Presence typing** — o "digitando..." antes de enviar (já existe no fluxo antigo via Wuzapi) humaniza.
8. **Priorização** — conversa 1:1 (lead ativo respondendo) tem prioridade sobre campanha em massa; nunca misturar na mesma cadência.

### 5.3 Camadas de risco (transparência)
- **Baixo risco:** responder quem te mandou mensagem (conversa 1:1). É o núcleo do agente. ✅
- **Médio risco:** follow-up individual agendado. ✅ com throttle.
- **Alto risco:** disparo em massa. ⚠️ Só com todos os guardrails acima. O caminho 100% seguro de longo prazo é a **Cloud API oficial** do WhatsApp (Meta) para campanhas — Wuzapi para conversa.

---

## 6. Roadmap de execução por etapas

> Ordem definida por você: **Agentes → CRM → Simulador → Campanhas.** Cada etapa é entregável e testável isoladamente.

### ETAPA 0 — Fundação (pré-requisito curto, ~1 sessão)
- Consolidar/validar a branch `feat/dashboard-kanban-crud` (Kanban, CRUD, design tokens).
- Aplicar fixes B1–B7.
- Criar as tabelas do §4 (bancos enriquecido, promotoras, usuarios_banco, parametros_simulacao, log de simulação).
- **Entregável:** base estável + telas de configuração (bancos/promotoras/usuários/parâmetros).

### ETAPA 1 — AGENTE DE WHATSAPP (a mola de receita) 🎯
1. **Wuzapi na Railway** — subir 1 container 24/7 (montar docker/config do zero, já que o compose antigo se perdeu), parear número, apontar webhook.
2. **Edge Function `whatsapp-inbound`** — recebe mensagem → grava em `chats` → chama Claude API com:
   - **Persona da Aya** (você vai me passar o prompt do bot antigo "Cosmus").
   - **Tools:** `simular_credito`, `buscar_cliente`, `cadastrar_cliente`, `consultar_crm`, `agendar_followup`.
   - **RAG** (memória por telefone via `match_chat_memory`) — a IA lembra do histórico do cliente.
3. **Loop de fechamento** — a IA: tira dúvidas repetitivas, simula em tempo real, contorna objeções, e **sempre cadastra/qualifica o lead** mesmo sem fechar ("cliente nunca se perde").
4. **Aprendizado** — registros/insights que a IA grava na memória (o que você pediu).
- **Entregável:** lead do YouTube cai no WhatsApp e é atendido 24/7 por uma IA que simula e fecha.

### ETAPA 2 — CRM OPERACIONAL (sua central de comando)
1. **Tela de Conversas real** — chat com histórico + envio manual (assumir a conversa da IA quando quiser).
2. **Inteligência na Visão Geral** — os cruzamentos que geram dinheiro (§2.3.1): margem ociosa, portabilidades maduras, comissão por banco/promotora, aniversariantes.
3. **Ficha do cliente 360º** — dados + propostas + simulações + conversas + follow-ups num lugar.
4. **CRUD completo** com validações (CPF, telefone, máscaras BRL) — parte já na branch.
- **Entregável:** você abre o dashboard de manhã e sabe exatamente o que fazer hoje.

### ETAPA 3 — SIMULADOR PONTA-A-PONTA (parser de PDF modernizado)
**Pipeline antigo (n8n):** wuzapi → detecta PDF → base64 → Stirling PDF (VPS) corta 3 primeiras páginas → converte em imagens → 3 chamadas Gemini (1 prompt/página) → parser regex → fórmula.

**Pipeline novo (decidido 2026-07-11):** o Gemini/Claude hoje aceitam **PDF nativo direto na API** — o modelo enxerga cada página como imagem internamente (mesma qualidade visual que superava OCR, sem conversão manual). Fluxo:
1. wuzapi entrega base64 → Edge Function `extrair-extrato` corta as 3 primeiras páginas com `pdf-lib` (JS puro em Deno — sem Stirling, sem VPS, sem worker).
2. **1 chamada** Gemini com `responseSchema` JSON estruturado (substitui 3 chamadas + parser regex frágil).
3. Resultado alimenta `simular-credito` (usando `parametros_simulacao` por banco) → grava em `simulations` + `timeline_events`.
- O agente faz a **triagem e conduz** o cliente ao PDF, mas não trava: sem PDF, segue conversando/qualificando.
- **Entregável:** do PDF ao resultado em segundos, tudo registrado para acompanhamento.

### ETAPA 4 — CAMPANHAS (reaquecer a carteira)
1. **Segmentação por filtros** — montar público (por convênio, banco, margem, status, data) de forma visual.
2. **Campanha email** (começar simples) + **WhatsApp** com toda a mensageria do §5 (fila, guardrails, rotação).
3. **Métricas** — entregues, respondidas, conversões.
- **Entregável:** transformar a base parada em pipeline ativo.

### FUTURO (quando fizer sentido)
- **Digitação via API** dos bancos (você mencionou "em breve") — automação da esteira.
- **Cloud API oficial** para campanhas em escala sem risco de ban.
- **Multi-usuário/equipe** (roles já existem no schema) quando crescer o time.
- **Venda do SaaS** para outros corbans (multi-tenant já está pronto para isso) — seu objetivo de longo prazo.

---

## 7. Design premium (proposta)

Direção visual para um hub que você usa o dia todo — precisa ser bonito E rápido de operar:

- **Base:** o design system iniciado na branch (tokens HSL, dark mode) é boa fundação. Refinar para nível de produto de mercado.
- **Identidade:** azul-royal como cor de marca + neutros sofisticados (não cinza genérico). Dark mode como padrão (você olha isso horas — menos fadiga).
- **Tipografia:** Geist/Inter para texto, Geist Mono para números (CPF, valores, matrículas alinham em coluna — detalhe que separa amador de profissional).
- **Densidade inteligente:** informação densa mas respirável. KPIs no topo, ação a 1 clique. Nada de "tela morta".
- **Proatividade:** o dashboard sugere ("3 clientes com margem esperando proposta →"). Não espera você procurar.
- **Micro-interações:** drag-and-drop fluido no Kanban, optimistic UI (a tela responde antes do servidor confirmar), toasts de feedback.

Referências de mercado destiladas: **Storm** (clareza do pipeline Kanban, pendências destacadas) + **Promosys** (simulação comparativa entre bancos num lugar só) + padrão visual de CRMs modernos (Attio, Pipedrive).

---

## 8. O que preciso de você para destravar cada etapa

| Etapa | Preciso de você |
|-------|-----------------|
| 0 | Confirmar o schema do §4 (bancos, promotoras, usuários, parâmetros) |
| 1 | **Prompt/regras da Aya** (bot "Cosmus" do n8n antigo) + confirmar acesso Railway |
| 3 | Um **PDF de extrato real** (anonimizado se quiser) para testar a extração |
| 4 | Definir remetente de email (domínio) e regras de opt-out |

---

## 9. Próximo passo imediato

Este documento é a proposta. **Nenhum código foi escrito nesta rodada** (conforme você pediu). Quando aprovar:

1. Você revisa/ajusta este plano (comenta o que discorda).
2. Confirma o schema do §4.
3. Autoriza a **Etapa 0** (fundação) ou já pula para a **Etapa 1** (agente) se preferir velocidade na receita.
4. Me passa o prompt da Aya quando puder (destrava a Etapa 1).

> Metodologia resumida das medidas: **consolidar o que já existe** (não reescrever), **configurar o que muda** (não hardcodar), **automatizar o repetitivo** (agente IA), **fechar o loop operacional** (todo lead vira registro), e **crescer por etapas com receita a cada passo**.
