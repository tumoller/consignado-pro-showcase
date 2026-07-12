# Plano: wuzapi na Railway + conexão com o dashboard

Data: 2026-07-12. Objetivo: colocar a wuzapi (API do WhatsApp) no ar na Railway,
parear o número e ligar a ponta a ponta com o CRM (recebe mensagem → agente Aurus
responde; envia mensagem pela tela de Conversas; lê PDF de extrato).

## O que já existe (não precisa reescrever)

O dashboard já tem toda a camada de integração:
- Proxies Vercel em `api/wuzapi/*`: `create-instance`, `connect-instance`, `get-qrcode`,
  `get-status`, `delete-instance`.
- `create-instance.js` chama `POST {WUZAPI_URL}/admin/users` com header
  `Authorization: {WUZAPI_ADMIN_TOKEN}`, body `{name, token, events:"Message", webhook}`.
  O webhook vem da env `N8N_WEBHOOK_URL_FOR_WUZAPI` (nome legado — vamos reaproveitar
  apontando para a Edge Function, ou renomear depois).
- Tabela `user_instances` (instance_id, token, workspace_id, status) — populada no create.
- Edge Functions no ar: `whatsapp-inbound` (webhook + agente), `send-whatsapp` (envio),
  `extrair-extrato` (PDF). Todas usam `WUZAPI_BASE_URL` para falar com a wuzapi.

Ou seja: falta **infra** (subir a wuzapi) + **fiação de variáveis** em 3 lugares.

## Passo 1 — Subir a wuzapi na Railway

Railway não consome docker-compose (o `wuzapi/docker-compose.yml` é referência p/ local
e documentação das envs/volumes). Na Railway é 1 serviço + 1 volume:

1. New Project → **Deploy from GitHub repo** apontando para um fork de
   `github.com/asternic/wuzapi` (Railway builda o Dockerfile do repo).
   - Alternativa: **Deploy from Docker Image** se você tiver uma imagem confiável (confirme a tag).
2. **Variables** do serviço:
   - `WUZAPI_ADMIN_TOKEN` = valor aleatório longo (ex: `openssl rand -hex 24`).
   - `TZ` = `America/Sao_Paulo`.
   - (Opcional Postgres: `DB_USER/DB_PASSWORD/DB_NAME/DB_HOST/DB_PORT`. Sem isso, usa SQLite.)
3. **Volume**: adicione um volume montado em `/app/dbdata` (guarda a sessão do WhatsApp e
   o users.db). Sem volume, todo redeploy perde a sessão e pede QR de novo.
   - Confirme o caminho de sessão no README da sua versão da wuzapi; ajuste o mount se diferir.
4. **Networking**: gere um domínio público (`xxx.up.railway.app`) e defina a porta-alvo `8080`.
   HTTPS já vem pronto — essencial p/ o webhook e p/ o `WUZAPI_BASE_URL`.
5. Confirme que o plano da Railway mantém o serviço **sempre ligado** (sem sleep) — a sessão
   do WhatsApp cai se o container dormir.

Guarde a URL pública: `https://SEU-APP.up.railway.app` (vira o valor das duas vars de URL abaixo).

## Passo 2 — Fiação das variáveis (3 lugares)

Mesma URL da Railway aparece com **nomes diferentes** em cada lugar — atenção:

| Onde | Variável | Valor |
|------|----------|-------|
| **Railway** (wuzapi) | `WUZAPI_ADMIN_TOKEN` | token admin aleatório |
| **Vercel** (proxies do dash) | `WUZAPI_URL` | `https://SEU-APP.up.railway.app` |
| **Vercel** | `WUZAPI_ADMIN_TOKEN` | o MESMO token admin da Railway |
| **Vercel** | `N8N_WEBHOOK_URL_FOR_WUZAPI` | `https://lxpjokhihxccpuspqeuw.supabase.co/functions/v1/whatsapp-inbound?token=SEU_WEBHOOK_SECRET` |
| **Supabase** (Edge Functions → Secrets) | `WUZAPI_BASE_URL` | `https://SEU-APP.up.railway.app` |
| **Supabase** | `WEBHOOK_SECRET` | segredo longo (o mesmo do `?token=` acima) |
| **Supabase** | `ANTHROPIC_API_KEY` | sua chave Anthropic |
| **Supabase** | `GEMINI_API_KEY` | sua chave Gemini (p/ ler PDF) |
| **Supabase** | `DEFAULT_WORKSPACE_ID` | `1` (opcional; default já é 1) |

> As chaves você cadastra direto nos painéis — eu não manuseio segredos.

## Passo 3 — Criar a instância e parear (pela tela do dash)

1. No dashboard, menu **WhatsApp** (`/instances`): "Criar instância" → informe o número.
   Isso chama `api/wuzapi/create-instance` → cria o user na wuzapi já com o webhook correto
   (porque o `N8N_WEBHOOK_URL_FOR_WUZAPI` agora aponta pra Edge Function) e grava em
   `user_instances`.
2. Clique em **Conectar/QR** → escaneie o QR com o WhatsApp do número → status vira "conectado".
3. Confirme em `get-status` que ficou `Connected/LoggedIn`.

## Passo 4 — Ligar o agente e testar ponta a ponta

1. Tela **Agente IA** (`/agente`): revise a persona (remova qualquer instrução de saída em
   JSON herdada do n8n — o backend já blinda, mas melhor limpar), defina modelo e limites,
   e ligue o switch **Agente ativo** (`config_agente.enabled = true`).
2. **Teste texto**: mande uma mensagem de um outro número para o WhatsApp pareado. Esperado:
   chega em Conversas (realtime) e o Aurus responde humanizado. Se não responder, veja
   `timeline_events` tipo `erro_agente` (visível no card "Atividade hoje" do /agente) e os
   logs da Edge Function no Supabase.
3. **Teste PDF**: envie um extrato do INSS em PDF. Esperado: `extrair-extrato` corta 3 páginas,
   Gemini extrai, roda a simulação e o Aurus apresenta o resultado.
4. **Teste envio manual**: em Conversas, assuma a conversa (switch "Aurus responde" off) e
   envie uma mensagem pelo composer (usa `send-whatsapp`).

## Riscos / pontos a verificar na primeira execução

- **Formato do payload do webhook**: o `whatsapp-inbound` faz parse defensivo (tenta várias
  chaves), mas só o primeiro evento real confirma o shape da sua versão da wuzapi. Se algo não
  casar, ajusto o `parseWuzapi()` com o payload real dos logs.
- **Mídia em base64**: para o PDF chegar processável, a wuzapi precisa entregar a mídia em
  base64 no webhook (ou o inbound baixá-la). Confirme no README da sua versão como habilitar
  mídia no webhook; se vier sem base64, o sistema avisa o cliente e registra `erro_agente`
  ("PDF sem base64 no webhook").
- **`events`**: hoje o create usa `events:"Message"` — cobre texto e documento. Se precisar de
  outros eventos, ajustar em `create-instance.js`.
- **Anti-ban**: número novo = risco. Comece devagar (poucas conversas), sem disparo em massa
  (a fila anti-ban é fase futura). Ver [[consignado-crm-handoff]].

## Limpezas opcionais (depois de funcionar)

- Renomear `N8N_WEBHOOK_URL_FOR_WUZAPI` → `WHATSAPP_INBOUND_WEBHOOK_URL` (só cosmético; exige
  editar `create-instance.js`).
- Aposentar a Edge Function legada `send-message` (substituída por `send-whatsapp`).
