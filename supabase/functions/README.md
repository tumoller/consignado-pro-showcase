# Edge Functions — WhatsApp / Agente Aurus

Funções Deno (Supabase Edge Functions) que operam o atendimento de WhatsApp via
[wuzapi](https://github.com/asternic/wuzapi) e o agente de IA "Aurus - Especialista INSS"
da Arthur Financeira.

## Funções

### `send-whatsapp`
Envio limpo de mensagens WhatsApp. **Substitui a legada `send-message`.**

- **Rota:** `POST ${SUPABASE_URL}/functions/v1/send-whatsapp`
- **Auth:** header `Authorization: Bearer <service_role_key OU JWT de usuário>`.
  Se não for a service role key, o JWT é validado via `auth.getUser()`.
- **Body:**
  ```json
  {
    "workspace_id": 1,
    "phone": "5511999999999",
    "body": "Texto da mensagem",
    "instance_id": "opcional",
    "actor": "user:<uuid> | aurus | system (opcional)"
  }
  ```
  - `actor` iniciado por `user:` grava a mensagem como `type: 'human'`; caso contrário `type: 'ai'`.
- **Comportamento:** resolve a instância (informada → primeira conectada → primeira),
  dispara `presence composing`, aguarda ~800ms e envia `send/text` pelo wuzapi.
  Grava em `chats` (direction `out`) e `timeline_events` (`msg_out`).
- **Resposta:** `{ ok, chat_id }` ou `502` com `detalhe` em caso de falha no wuzapi.
- **Envs:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (automáticas), `WUZAPI_BASE_URL`.

### `whatsapp-inbound`
Webhook do wuzapi + cérebro do agente. Recebe as mensagens dos clientes, persiste,
aplica regras (pausa, horário, budget, debounce), processa PDF do extrato, chama o
agente Claude com ferramentas e responde de forma humanizada.

- **Rota:** `POST ${SUPABASE_URL}/functions/v1/whatsapp-inbound?token=${WEBHOOK_SECRET}`
- **Auth:** `verify_jwt = false`. A autenticação é o parâmetro `?token=` comparado
  com `WEBHOOK_SECRET`. Divergência → `401`.
- **Body:** payload de evento do wuzapi (formato `Message`). Parse é defensivo.
- **Fluxo resumido:**
  1. Resolve workspace/instância pelo payload (fallback `DEFAULT_WORKSPACE_ID`).
  2. Upsert do contato por `phone_number`.
  3. Persiste a mensagem recebida (`chats` in + `timeline_events` `msg_in`).
  4. Carrega `config_agente`; se `!enabled` ou `contacts.pause_ai` → só persiste.
  5. Verifica janela de horário (America/Sao_Paulo).
  6. Verifica budget diário e por conversa (contagem de `timeline_events` `chamada_ia`).
  7. Debounce serverless (`debounce_segundos`): se chegou mensagem mais nova, aborta.
  8. Se PDF → chama `extrair-extrato` e injeta o resultado como contexto do agente.
  9. Áudio/imagem → resposta fixa pedindo texto/PDF (sem IA).
  10. Chama a API Anthropic com as tools; loop de tool-use (máx 5 iterações).
  11. Registra `chamada_ia` na timeline.
  12. Envia a resposta em até 4 chunks (`\n\n`) com presence + delay aleatório.
  13. `try/catch` global → registra `erro_agente` e responde `200` (nunca `500`).
- **Ferramentas do agente:** `atualizar_contato` (whitelist de campos),
  `simular_credito` (chama `simular-credito`), `criar_followup` (insere em `follow_ups`),
  `escalar_humano` (departamento=HUMANO, pause_ai=true).
- **Envs:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (automáticas),
  `ANTHROPIC_API_KEY`, `WUZAPI_BASE_URL`, `WEBHOOK_SECRET`, `DEFAULT_WORKSPACE_ID`.

## Configuração de secrets

Via CLI:
```bash
supabase secrets set \
  ANTHROPIC_API_KEY="sk-ant-..." \
  WUZAPI_BASE_URL="https://wuzapi.seu-dominio.com" \
  WEBHOOK_SECRET="um-segredo-forte-aleatorio" \
  DEFAULT_WORKSPACE_ID="1"
```

Ou pelo painel: **Project Settings → Edge Functions → Secrets**.

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são injetadas automaticamente pelo runtime — não precisam ser definidas.

## Deploy

```bash
supabase functions deploy send-whatsapp
# whatsapp-inbound precisa de verify_jwt=false (auth é por ?token=)
supabase functions deploy whatsapp-inbound --no-verify-jwt
```

## Configuração do webhook no wuzapi

Aponte o webhook da instância para a função inbound, **incluindo o token na URL** e
habilitando o envio de **mídia em base64** (necessário para ler PDFs do extrato):

```
URL: https://<PROJECT_REF>.supabase.co/functions/v1/whatsapp-inbound?token=<WEBHOOK_SECRET>
Eventos: Message
Media em base64: ativado
```

Se o wuzapi não enviar o base64 do documento, a função registra um `erro_agente`
com a dica de configuração e avisa o cliente que não conseguiu ler o arquivo.

## Nota sobre a `send-message` (v1 legada)

A função `send-message` deve ser **aposentada**. Toda emissão de mensagens passa a
usar `send-whatsapp` (gravação padronizada em `chats` + `timeline_events`, resolução
de instância e humanização de presence). Migre os callers e remova a `send-message`
após a virada.
