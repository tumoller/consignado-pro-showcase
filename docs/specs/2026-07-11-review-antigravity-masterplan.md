# Revisão Crítica — AntiGravity Master Plan v1
**Revisor:** Claude (papel: Principal Architect / PM / CTO) · **Data:** 2026-07-11
**Insumos cruzados:** estado real do Supabase (14 tabelas, RLS, dados live), branch `feat/dashboard-kanban-crud`, plano mestre de 2026-07-11, prompt do agente Aurus, motor `simular-credito` (já no ar), fluxos n8n antigos, ecossistema arthur-os/arthur-studio (Content OS que JÁ existe).

---

## Veredito executivo

**A visão está certa. O plano de execução está errado em 3 pontos que custam dinheiro:**

1. **Ignora o que já existe.** ~40% das Fases 1–3 do roadmap **já está construído e no ar** (multi-tenant RLS, design system, motor financeiro parametrizado, config por banco em andamento, Kanban aprovado). Seguir o roadmap como escrito = retrabalho de semanas.
2. **Enterra o motor de receita na Fase 4–5.** WhatsApp+IA só na fase 4/5, atrás de "Arquitetura, Eventos, Design System". Isso é o anti-padrão clássico: meses de encanamento sem um real de retorno — exatamente o que você NÃO pode agora. O lead do YouTube chega HOJE no WhatsApp.
3. **Overengineering estrutural:** Redis + event bus + workers Python + Next.js — quatro decisões que adicionam custo fixo e complexidade operacional sem necessidade no volume atual (1 operador, ~400 contatos, ~320 propostas). Detalhado abaixo.

**Nota geral: visão 9/10, arquitetura 5/10, roadmap 3/10.** O plano é salvável com as correções abaixo — e fica melhor que o original.

---

## 1. O que o plano acerta (manter)

- **Princípio "todo conhecimento entra, toda oportunidade sai"** — é a definição correta de um CRM de corban. Vira o critério de aceite de toda feature.
- **"Cliente nunca é encerrado"** — já era nossa regra; correto para consignado (margem renova, oportunidade volta).
- **Motor de simulação parametrizável por banco, versionado, sem alterar código** — exatamente o que `config_credito` + `parametros_simulacao` (§4 do plano mestre) implementam. Convergência total.
- **Timeline única por cliente** — decisão de produto forte (ver §5.2: proposta de unificar timeline com event log).
- **Guard rails "IA auxilia, não decide"** — direção certa, mas incompleta e com uma contradição interna (§4.1).
- **Critério de sucesso ("abrir de manhã e saber o que fazer")** — perfeito. É mensurável e orienta a UX inteira.
- **WuzAPI → Meta Cloud API futuramente** — rota de risco correta (não-oficial para 1:1, oficial para escala).

---

## 2. Falhas críticas

### 2.1 O roadmap compete com a realidade (a falha nº 1)
O plano trata o projeto como greenfield. Estado real:

| Fase do plano | Item | Estado REAL |
|---|---|---|
| 1 | Multi-tenant | ✅ FEITO (RLS + `check_workspace_member/role` live) |
| 1 | Design System | 🟡 80% na branch (tokens HSL, dark mode, bug de opacidade corrigido) |
| 1 | Eventos | ❌ Não existe — e não deveria existir como "fase" (ver §5.2) |
| 2 | CRM/Kanban | 🟡 Kanban pronto e aprovado; CRUD na branch; faltam telas de config |
| 2 | Bancos | 🟡 `bancos_ativos` existe; falta enriquecer + promotoras + usuarios_banco |
| 3 | Motor financeiro | ✅ FEITO (`simular-credito` no ar, testado, Newton-Raphson, travas BPC) |
| 3 | Parser PDF | ❌ Falta (temos extrato real de teste + pipeline validado do n8n) |
| 4 | WhatsApp | 🟡 Telas de instância Wuzapi funcionam; falta container + webhook + agente |
| 5 | IA/RAG | 🟡 Infra RAG pronta (`chats.embedding` + `match_chat_memory`); falta o agente |
| 6 | Content OS | ✅ **JÁ EXISTE FORA** — arthur-os (Next) + arthur-studio (Python) |

**Correção:** o roadmap não é "construir 6 fases", é **"fechar 4 lacunas"**: (a) parser PDF, (b) agente WhatsApp, (c) telas de config do negócio, (d) inteligência no dashboard. Tudo o mais é consolidação.

### 2.2 Content OS como Fase 6 = reconstruir o que você já tem
A memória do projeto registra: **arthur-os** (cérebro de roteiro, Next) e **arthur-studio** (worker de vídeo, Python) já existem como sistemas separados. O Master Plan os re-especifica como pilar a construir. Isso é duplicação pura.

**Correção técnica:** Content OS = **integração, não construção**. Os dois sistemas compartilham Supabase; o que falta é o *contrato de dados* entre eles (ex: tabela `leads_origem` ligando vídeo→lead→venda). Custo: dias, não meses. Benefício extra: fecha o loop de atribuição (§6.3).

### 2.3 Next.js no frontend = migração proibida
Decisão travada do projeto (com razão): **Vite+React, não migrar**. Uma migração Vite→Next custa 2–4 semanas, quebra o que funciona, e não entrega NENHUM valor de negócio (não há SSR/SEO relevante num dashboard autenticado). O plano lista Next.js sem justificativa. **Rejeitar.** Se um dia o SaaS precisar de site público/SEO, faz-se um site separado (aí sim Next/Astro) — nunca migrar o app.

---

## 3. Overengineering (o que cortar e por quê)

| Item do plano | Veredito | Justificativa técnica |
|---|---|---|
| **Redis (filas + event bus)** | ❌ Cortar agora | Volume atual: dezenas de msgs/dia. Postgres + `pg_cron` + `FOR UPDATE SKIP LOCKED` processa **milhares** de jobs/min. Redis = +1 serviço 24/7 pago, +1 ponto de falha, +1 coisa pra operar. Migre SÓ quando a fila Postgres medir >100 jobs/s (não vai acontecer tão cedo). |
| **Workers Python (OCR/PDF/IA/embeddings)** | ❌ Cortar agora | O pipeline validado é PDF→imagem→**Gemini Vision** (você mesmo comprovou que supera OCR). Isso é uma chamada HTTP — roda em Edge Function. Embeddings = API call. Não há carga computacional que justifique um worker persistente. Cada worker always-on = custo fixo + deploy + monitoramento. O único container legítimo é o **wuzapi** (precisa de sessão persistente). |
| **Event Bus / arquitetura por eventos** | ❌ Como infra; ✅ como modelo de dados | Resposta à Questão 1 do plano: **não**. Event bus (broker, consumers, replay, DLQ) para 1 tenant ativo é arquitetura de empresa de 50 devs. O que você quer de "eventos" — timeline, auditoria, reatividade — se obtém com: (a) tabela `timeline_events` (é o event log E a timeline do cliente ao mesmo tempo, §5.2); (b) **Supabase Realtime** (push pro dashboard de graça, já incluso); (c) triggers Postgres. Zero infra nova. |
| **8 agentes especializados (Comercial, CRM, Conteúdo, SEO, INSS, SIAPE, FGTS, Analytics)** | ❌ Reduzir para 1+tools | 8 agentes = 8 prompts pra manter, 8 comportamentos pra depurar, roteamento entre eles (mais um problema). Padrão correto em 2026: **1 agente (Aurus) com ferramentas** (`simular_credito`, `consultar_crm`, `agendar_followup`...) e **injeção de contexto por convênio** (bloco INSS/SIAPE/FGTS no prompt conforme o cliente). Especializar em agentes separados SÓ quando um caso de uso medido justificar. Analytics não é agente, é dashboard. |
| **Knowledge OS com RSS de legislação** | ⏸️ Adiar/reduzir | Risco jurídico invertido: RAG alimentado por feed não-curado pode fazer o agente citar norma errada — no consignado isso é passivo jurídico (a "Regra de Ouro" do Aurus existe exatamente por isso). Começar com **corpus curado por você** (roteiros de banco, fórmulas, FAQ das mesmas-dúvidas-de-sempre). RSS regulatório vira *alerta pra você ler*, não fonte do agente. |

**Custo evitado:** ~R$100–300/mês de infra (Redis+workers) + semanas de setup + carga operacional permanente. **Regra do plano que eu subscrevo e o próprio plano viola:** *"aumentar produtividade antes de adicionar complexidade."*

---

## 4. Guard rails — incompletos e com 1 contradição

### 4.1 A contradição
"IA não pode alterar propostas" vs. o fluxo do Aurus que **precisa escrever no CRM** (qualificar lead, mudar departamento, registrar simulação). "Não decide" é vago demais pra virar código.

**Correção — matriz de escopo de escrita (enforçável por RLS/função):**

| Operação | IA pode? | Mecanismo |
|---|---|---|
| Criar/atualizar contato (dados cadastrais, status, departamento) | ✅ | tool `update_contact` (já existia no n8n) |
| Criar simulação, follow-up, nota na timeline | ✅ | tools dedicadas |
| Criar proposta em status inicial ("pré-digitação") | ✅ com flag `origem='ia'` | você revisa antes de digitar |
| Alterar valores financeiros de proposta existente | ❌ | tool não existe (não é "regra", é ausência de capacidade) |
| Excluir qualquer registro | ❌ | idem |
| Enviar campanha em massa | ❌ sem aprovação | fila exige `approved_by` |

Princípio técnico: **guard rail não é instrução no prompt, é ferramenta que não existe**. Prompt é a última linha de defesa, não a primeira.

### 4.2 Guard rails ausentes no plano (graves)
1. **Human takeover** — `pause_ai` já existe no schema e no fluxo antigo; o plano não menciona. É o guard rail mais importante do atendimento (você assume, a IA cala e persiste).
2. **Anti-ban WhatsApp** — o plano diz "Guard Rails" na Fase 4 sem especificar. O plano mestre já detalha (throttle, jitter, spintax, aquecimento, janela horária, opt-out). Sem isso, o risco não é "campanha ruim", é **perder o número que é seu canal de receita**.
3. **LGPD** — módulo AUSENTE e vocês lidam com dado sensível de idoso (CPF, benefício, dados bancários). Mínimo viável: consentimento registrado na 1ª conversa (o próprio Aurus coleta), opt-out honrado, retenção definida, e **nunca** dado pessoal em log/URL. Não é burocracia: é defesa do negócio (multa LGPD começa em 2% do faturamento) e argumento de venda do futuro SaaS.
4. **Auditoria** — quem (humano ou IA) mudou o quê. A tabela `timeline_events` (§5.2) resolve de graça: toda escrita da IA gera evento com `actor='aurus'`.
5. **Orçamento de IA** — sem teto, um loop de conversa ruim queima crédito Anthropic. Guard rail: máx. N chamadas/conversa/dia + alerta de custo. (Você pediu pra nunca gastar API sem aprovação — isso vira config, não promessa.)

---

## 5. Decisões arquiteturais melhores

### 5.1 Arquitetura-alvo corrigida (delta sobre o plano mestre, que continua válido)
```
YouTube (arthur-os já existe) ──ref/UTM──▶ wa.me link ──▶ WhatsApp
                                                            │
                                              Wuzapi (Railway, ÚNICO container)
                                                            │ webhook
                                              Edge Function whatsapp-inbound
                                              ├─ buffer/debounce (padrão do n8n antigo)
                                              ├─ Aurus (Claude API + tools + RAG pgvector)
                                              ├─ extrair-extrato (Gemini Vision, PDF→img)
                                              └─ simular-credito (✅ já no ar)
                                                            │
                                    Supabase Postgres (fonte única)
                                    ├─ message_queue (pg_cron + SKIP LOCKED)
                                    ├─ timeline_events (event log = timeline)
                                    └─ Realtime ──push──▶ Dashboard (Vite/Vercel)
```
Um container. Zero Redis. Zero worker Python. Todo o resto serverless/managed.

### 5.2 A melhor ideia escondida no plano: timeline = event log
O plano pede "timeline única" (CRM) e "eventos" (Automation OS) como coisas separadas. **São a mesma tabela:**
```
timeline_events: id, workspace_id, contact_id, actor ('user:uuid'|'aurus'|'system'),
                 tipo (msg_in|msg_out|simulacao|proposta_status|followup|nota|campanha),
                 payload jsonb, created_at
```
- Pro CRM: a ficha 360º do cliente é `SELECT * WHERE contact_id ORDER BY created_at`.
- Pra auditoria: `actor` responde "quem fez".
- Pra reatividade: Supabase Realtime nessa tabela = dashboard proativo ao vivo.
- Pra IA: últimos N eventos = contexto da conversa (complementa o RAG).
Uma tabela resolve 4 requisitos. Isso é a versão simples e correta da "arquitetura por eventos".

### 5.3 Multi-tenant (Questão 5 do plano)
**Não mudar.** `workspace_id` + RLS é o modelo certo até ~centenas de tenants. Schema-per-tenant ou DB-per-tenant só se um cliente enterprise exigir isolamento contratual. O que FALTA para o SaaS (futuro, não agora): billing por workspace (base já existe em `profiles.billing_status`), onboarding self-service, e limites por plano (nº de instâncias WhatsApp, msgs/mês) — que a `message_queue` já viabiliza medir.

---

## 6. Módulos ausentes (além dos guard rails do §4.2)

1. **Conciliação de comissões** 💰 — o plano fala em propostas mas não em conferir se a promotora **pagou o que devia**. Comissão estimada (coluna gerada) vs. extrato de repasse recebido → divergências viram alerta. Pra um corban isso é dinheiro deixado na mesa todo mês. Baixo custo (upload de planilha + matching por contrato), alto retorno. **Prioridade alta pós-agente.**
2. **Metas** — o dashboard deve mostrar "meta do mês" (o próprio plano pede!) mas não existe tabela `metas` (volume, comissão, nº de fechamentos por mês). Sem meta não há "quanto falta", e "quanto falta" é o número que move comportamento.
3. **Atribuição YouTube→venda** — o plano trata Content OS e Sales OS como pilares separados; a ponte é o módulo que falta: link `wa.me` com código por vídeo (`?text=Oi! Vi o vídeo X`) → Aurus captura a origem → `contacts.aquisicao` (campo já existe!) → dashboard mostra **qual vídeo gera venda, não só view**. Isso orienta sua pauta de gravação com dado de receita. Custo: trivial. Valor: enorme.
4. **Inbox de aprovação (human-in-the-loop UI)** — o plano diz "campanha só com aprovação" mas não especifica ONDE. Tela: rascunhos da IA (campanhas, respostas sugeridas em conversas pausadas, propostas pré-digitadas) com aprovar/editar/rejeitar. É o casamento entre "IA não decide" e produtividade.
5. **Observabilidade do agente** — se o Aurus falhar silenciosamente às 2h da manhã, você perde leads a noite toda. Mínimo: log estruturado por conversa, custo por conversa, alerta (push/email) em erro repetido, e painel "conversas da IA hoje" no dashboard.
6. **Consulta de margem via API (IN100/Dataprev)** — o plano ignora; o fluxo antigo tinha `consultar_cpf1`. É o fallback quando o cliente não tem o PDF. Mapear provedores (há APIs comerciais de consulta INSS) como item futuro próximo.
7. **Digitação via API** — você já mencionou ("em breve"); ausente no plano. Fica no mapa como Fase futura com gancho: a proposta "pré-digitada" pela IA (§4.1) já nasce no formato certo pra virar digitação automática depois.

---

## 7. UX — correções e melhorias

1. **Dashboard = fila de trabalho, não painel de vitrine.** O critério de sucesso do plano ("abrir de manhã e saber quem atender") se traduz num componente: **"Hoje"** — lista ordenada por valor: follow-ups vencidos, leads quentes da noite (IA qualificou), propostas paradas >X dias, aniversariantes com margem. Cada item com ação de 1 clique (abrir conversa, ligar, ver ficha). KPIs ficam ABAIXO disso, não acima.
2. **Conversas = cockpit do takeover.** Não é "ver mensagens": é ver a conversa da IA em tempo real (Realtime), botão "assumir" (seta `pause_ai`), campo de resposta com **rascunho sugerido pela IA** que você edita/envia, e botão "devolver pra IA". Essa tela é onde o híbrido humano+IA acontece.
3. **Simulação visível como linha do tempo** — cada cliente mostra o histórico de simulações (descoberta → enquadramento) com diff ("na 1ª tinha R$X de margem, agora tem R$Y"). O dado já vai existir em `simulations`; a UX é só ordenar e comparar.
4. **Mobile-first de verdade** — corban vive no celular/WhatsApp. Antes de qualquer feature nova de tela: garantir que Kanban, ficha e Conversas funcionam bem em 390px + PWA instalável (Vite tem plugin pronto). Custo baixo, uso diário.
5. **Config do negócio como planilha, não como formulário burocrático** — bancos, taxas por banco, usuários de banco: edição inline em tabela (padrão shadcn DataTable editável), porque você atualiza isso toda semana ("na minha área muda tudo o tempo todo").

---

## 8. Riscos técnicos relevantes (Questão 4)

| Risco | Impacto | Mitigação |
|---|---|---|
| **Ban do número WhatsApp (wuzapi não-oficial)** | 🔴 Para TODO o funil de receita | Guard rails §4.2; número de backup pareado; campanhas em massa só via Cloud API oficial no futuro; nunca misturar cadência de campanha com 1:1 |
| Instância wuzapi cai (Railway restart, sessão perdida) | 🔴 Leads perdidos silenciosamente | Volume persistente p/ sessão + healthcheck + alerta se webhook ficar >15min sem tráfego em horário comercial |
| Alucinação de valores pela IA | 🔴 Passivo jurídico | Regra de Ouro (herdada do Aurus) + valores SEMPRE vindos de tool (nunca gerados) + disclaimer "estimativa, confirmação após análise do banco" (já existia no n8n) |
| Extração errada do PDF (Gemini lê valor errado) | 🟠 Simulação errada → proposta errada | Validação cruzada (margens devem somar; parcela×prazo ≈ contrato), flag de confiança, revisão humana quando confiança < limiar |
| Custo Claude/Gemini por conversa | 🟠 Margem corroída | Teto por conversa/dia, modelo menor p/ triagem e maior só p/ negociação, cache de FAQ |
| Dependência de 1 pessoa (você) | 🟠 | Docs versionados no repo (já fazendo), runbooks de deploy |
| Arquivos legados em `C:\Windows.old` | 🟠 Perda de conhecimento | ⚠️ **Backup imediato** — pasta é auto-apagada pelo Windows |

---

## 9. Respostas diretas às 7 questões do plano

1. **Eventos é a melhor abordagem?** Como infra (bus/broker): **não** — overengineering no seu estágio. Como modelo de dados (`timeline_events` + Realtime): **sim** (§5.2).
2. **Módulos faltando?** Sete: conciliação de comissões, metas, atribuição YouTube→venda, inbox de aprovação, observabilidade do agente, LGPD/consent, consulta de margem via API (§6, §4.2).
3. **Roadmap na ordem correta?** **Não.** Inverte valor: infra primeiro, receita depois. Ordem correta = a do plano mestre já aprovado (Agente → CRM → Simulador acoplado ao agente → Campanhas), reconhecendo o que já está pronto (§2.1).
4. **Riscos técnicos?** Tabela do §8; o dominante é o ban do WhatsApp — trate o número como ativo crítico.
5. **Multi-tenant deve mudar?** **Não.** RLS por workspace_id está correto e já funciona; SaaS futuro precisa de billing/limites, não de outra topologia (§5.3).
6. **Como fortalecer guard rails?** Capacidade > instrução: a IA só escreve pelo que as tools permitem; matriz de escopo do §4.1; `pause_ai`; fila com aprovação; auditoria via timeline; teto de custo.
7. **O que simplificar sem perder escala?** Cortar Redis, workers Python, event bus, 8-agentes→1-agente-com-tools, Next.js→manter Vite, Content OS→integrar o existente. Nada disso fecha porta futura: cada corte tem rota de upgrade clara quando a métrica justificar.

---

## 10. Roadmap reconciliado (AntiGravity ∩ realidade)

**Sprint A — Fundação enxuta** *(itens da Fase 1–2 que faltam de verdade)*
Fixes B1–B7 · tabelas do negócio (promotoras, usuarios_banco, parametros_simulacao, metas, timeline_events) · telas de config inline.

**Sprint B — Motor de receita** *(Fases 3+4+5 comprimidas no fluxo que importa)*
Wuzapi na Railway · `whatsapp-inbound` com Aurus (buffer, tools, RAG, pause_ai, Think, split+delay) · `extrair-extrato` (PDF→img→Gemini→`simular-credito`, testado com o extrato real que você mandou) · atribuição por vídeo (wa.me ref) · observabilidade mínima.

**Sprint C — Cockpit**
Tela Conversas c/ takeover + rascunho IA · componente "Hoje" no dashboard · timeline 360º na ficha · Realtime.

**Sprint D — Escala comercial**
Campanhas c/ fila+guard rails+aprovação · conciliação de comissões · metas no dashboard.

**Backlog mapeado (futuro):** digitação via API · consulta margem via API · Cloud API oficial · Knowledge OS curado · billing SaaS · integração formal arthur-os (atribuição já cria a ponte).

---

*Síntese em uma frase: a visão do AntiGravity está pronta pra ser executada — desde que você construa as 4 lacunas reais em vez das 6 fases imaginárias, e gaste complexidade só onde há receita.*
