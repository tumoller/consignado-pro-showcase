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

**Correção 2026-07-12:** checando o repo real (`asternic/wuzapi`, branch main) na hora de
revisar este plano, confirmei que a versão atual **exige Postgres** — não existe mais
fallback SQLite — e pede 2 chaves extras (`WUZAPI_GLOBAL_ENCRYPTION_KEY`,
`WUZAPI_GLOBAL_HMAC_KEY`) que a versão anterior deste plano não tinha. Isso explica a trava
de "não consegui colocar o Postgres" — o passo abaixo resolve.

Railway não consome docker-compose (o `wuzapi/docker-compose.yml`, já corrigido, é só
referência/documentação das envs). Na Railway são **2 serviços no mesmo projeto**: o app
wuzapi + um banco Postgres.

1. **Criar o Postgres primeiro**: no projeto Railway → **New** → **Database** →
   **Add PostgreSQL**. A Railway cria o serviço (geralmente chamado `Postgres`) e já gera
   as variáveis de conexão internamente — você não digita usuário/senha, ela gera.
2. **Serviço da wuzapi**: New → **Deploy from GitHub repo** apontando para um fork de
   `github.com/asternic/wuzapi` (Railway builda o `Dockerfile` do repo, que já existe lá).
3. **Variables** do serviço wuzapi — aqui está a parte que travou você. Em vez de digitar
   host/porta/senha do banco à mão, você **referencia** as variáveis do serviço Postgres
   usando a sintaxe `${{NomeDoServico.VARIAVEL}}` da Railway:

   | Variável (no serviço wuzapi) | Valor |
   |---|---|
   | `DB_HOST` | `${{Postgres.PGHOST}}` |
   | `DB_PORT` | `${{Postgres.PGPORT}}` |
   | `DB_USER` | `${{Postgres.PGUSER}}` |
   | `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` |
   | `DB_NAME` | `${{Postgres.PGDATABASE}}` |
   | `DB_SSLMODE` | `disable` (tente isso primeiro; se a conexão falhar, teste `require`) |
   | `WUZAPI_ADMIN_TOKEN` | valor aleatório longo — gere com `openssl rand -hex 24` |
   | `WUZAPI_GLOBAL_ENCRYPTION_KEY` | **exatamente 32 caracteres** — gere com `openssl rand -hex 16` (dá 32 chars) |
   | `WUZAPI_GLOBAL_HMAC_KEY` | mínimo 32 chars — gere com `openssl rand -hex 20` |
   | `WEBHOOK_FORMAT` | `json` |
   | `SESSION_DEVICE_NAME` | `Aurus` (aparece como nome do dispositivo no WhatsApp) |
   | `TZ` | `America/Sao_Paulo` |
   | `WUZAPI_PORT` | `8080` |
   | `WUZAPI_ADDRESS` | `0.0.0.0` |

   **Importante:** `${{Postgres.PGHOST}}` só funciona se o serviço de banco realmente se
   chamar `Postgres` no seu projeto — clique nele e confira o nome exato no topo do card;
   ajuste a referência se for diferente (ex: `${{Postgres-1.PGHOST}}`). Para ver os nomes
   exatos das variáveis que o Postgres da Railway expõe, abra o serviço Postgres → aba
   **Variables** e copie de lá — o autocomplete da Railway (`${{`) também lista as opções
   ao digitar dentro do campo de variável de outro serviço.
4. **Networking** (no serviço wuzapi): gere um domínio público (**Settings → Networking →
   Generate Domain**) e confirme que a **porta-alvo é 8080** (bate com `WUZAPI_PORT`).
   HTTPS já vem pronto — essencial p/ o webhook e p/ o `WUZAPI_BASE_URL`.
5. **Sem volume necessário** nesta versão — a sessão do WhatsApp fica no Postgres, não em
   arquivo. Isso é uma boa notícia: redeploys não perdem a sessão.
6. Confirme que o plano da Railway mantém o serviço **sempre ligado** (sem sleep) — a sessão
   do WhatsApp cai se o container dormir.

Guarde a URL pública: `https://SEU-APP.up.railway.app` (vira o valor das duas vars de URL abaixo).

## Passo 2 — Fiação das variáveis

**Correção 2026-07-12 (2):** o projeto local roda com `npm run dev` (Vite puro) — não há
`vercel.json` nem `vercel dev` rodando, então os proxies `api/wuzapi/*.js` (que só existem
como Vercel Serverless Functions) **não respondem nada agora**. O botão "Criar instância" em
`/instances` vai dar 404 localmente até o projeto ser deployado na Vercel (ou você rodar
`vercel dev`, que exige login na Vercel — o user decidiu adiar isso pro fim do MVP).

**Isso não bloqueia o teste do sistema**: `whatsapp-inbound`, `send-whatsapp` e
`extrair-extrato` são Edge Functions do Supabase — funcionam independente da Vercel. Só a
tela `/instances` (criar/QR/status/deletar pela UI) depende do proxy Vercel. Solução: criar
a instância e parear via **curl direto** (Passo 2-bis abaixo), sem tocar na Vercel. Quando a
Vercel entrar em cena (fim do MVP), a tela `/instances` passa a funcionar sozinha com as
mesmas variáveis abaixo — nada no banco muda.

Variáveis por lugar (mesma URL Railway, nomes diferentes):

| Onde | Variável | Valor |
|------|----------|-------|
| **Railway** (wuzapi) | `WUZAPI_ADMIN_TOKEN` | token admin aleatório |
| **Vercel** (só quando for deployar) | `WUZAPI_URL` | `https://SEU-APP.up.railway.app` |
| **Vercel** | `WUZAPI_ADMIN_TOKEN` | o MESMO token admin da Railway |
| **Vercel** | `N8N_WEBHOOK_URL_FOR_WUZAPI` | `https://lxpjokhihxccpuspqeuw.supabase.co/functions/v1/whatsapp-inbound?token=SEU_WEBHOOK_SECRET` |
| **Supabase** (Edge Functions → Secrets) | `WUZAPI_BASE_URL` | `https://SEU-APP.up.railway.app` |
| **Supabase** | `WEBHOOK_SECRET` | segredo longo (o mesmo do `?token=` acima) |
| **Supabase** | `ANTHROPIC_API_KEY` | sua chave Anthropic |
| **Supabase** | `GEMINI_API_KEY` | sua chave Gemini (p/ ler PDF) |

## Passo 2-bis — Criar e parear a instância SEM Vercel (curl direto)

Rotas confirmadas no código-fonte da wuzapi (`handlers.go`, branch main):
`POST /admin/users` (auth admin), `POST /session/connect` e `GET /session/qr` (auth por
instância, header `token`).

1. **Health check**:
   ```bash
   curl https://wuzapi-production-21ee.up.railway.app/health
   ```

2. **Criar a instância** (troque `SEU_ADMIN_TOKEN`; escolha você mesmo o `token` da
   instância — não precisa ser o telefone, pode ser um apelido tipo `aurus-principal`):
   ```bash
   curl -X POST https://wuzapi-production-21ee.up.railway.app/admin/users \
     -H "Authorization: SEU_ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "aurus-principal",
       "token": "ESCOLHA_UM_TOKEN_DA_INSTANCIA",
       "webhook": "https://lxpjokhihxccpuspqeuw.supabase.co/functions/v1/whatsapp-inbound?token=SEU_WEBHOOK_SECRET",
       "events": "Message"
     }'
   ```
   Resposta esperada: `{"code":201,"data":{"id":"...","name":"...","token":"..."},"success":true}`.
   Guarde o `data.id` (é o `instance_id`).

3. **Registrar no Supabase** — rode no SQL Editor do projeto (substitua os valores):
   ```sql
   insert into user_instances (instance_id, name, token, workspace_id)
   values ('ID_RETORNADO_NO_PASSO_2', 'aurus-principal', 'ESCOLHA_UM_TOKEN_DA_INSTANCIA', 1);
   ```

4. **Conectar a sessão** (header `token` = o token da instância, NÃO o admin):
   ```bash
   curl -X POST https://wuzapi-production-21ee.up.railway.app/session/connect \
     -H "token: ESCOLHA_UM_TOKEN_DA_INSTANCIA" \
     -H "Content-Type: application/json" \
     -d '{"Subscribe": ["Message"], "Immediate": false}'
   ```

5. **Pegar o QR** (espere uns 2-3s após o connect):
   ```bash
   curl https://wuzapi-production-21ee.up.railway.app/session/qr \
     -H "token: ESCOLHA_UM_TOKEN_DA_INSTANCIA"
   ```
   Retorna `{"code":200,"data":{"QRCode":"2@....."},"success":true}`. O valor de `QRCode` é
   a string bruta de pareamento — precisa virar imagem QR pra escanear. Cole esse valor num
   gerador de QR (ex: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=<valor
   urlencoded>`) ou peça pra eu renderizar no preview do browser.
   Escaneie com **WhatsApp → Aparelhos conectados → Conectar um aparelho** no número que vai
   atender.

6. **Confirmar conexão**:
   ```bash
   curl https://wuzapi-production-21ee.up.railway.app/session/status \
     -H "token: ESCOLHA_UM_TOKEN_DA_INSTANCIA"
   ```
   Deve indicar conectado/logado.

A partir daqui o pipeline já está de pé: mande uma mensagem de teste pro número pareado.
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
