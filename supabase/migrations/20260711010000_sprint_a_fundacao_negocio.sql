-- Sprint A: tabelas do negócio do corban + timeline + fila + config do agente
-- Aplicada via MCP em 2026-07-11. (chats já estava na publication realtime.)

alter table public.bancos_ativos
  add column if not exists codigo_febraban text,
  add column if not exists opera_margem_livre boolean not null default true,
  add column if not exists opera_portabilidade boolean not null default true,
  add column if not exists opera_refin boolean not null default true,
  add column if not exists opera_cartao boolean not null default false,
  add column if not exists observacoes text;

create table public.promotoras (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  nome text not null,
  cnpj text,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.promotoras enable row level security;
create policy promotoras_all on public.promotoras for all
  using (check_workspace_member(workspace_id, auth.uid()))
  with check (check_workspace_member(workspace_id, auth.uid()));

create table public.usuarios_banco (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  banco_id bigint not null references public.bancos_ativos(id),
  promotora_id bigint references public.promotoras(id),
  login text not null,
  senha_ref text, -- APENAS apelido/referência; nunca senha real
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, banco_id, promotora_id, login)
);
alter table public.usuarios_banco enable row level security;
create policy usuarios_banco_all on public.usuarios_banco for all
  using (check_workspace_member(workspace_id, auth.uid()))
  with check (check_workspace_member(workspace_id, auth.uid()));

create table public.parametros_simulacao (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  banco_id bigint not null references public.bancos_ativos(id),
  coef_emprestimo numeric,
  coef_cartao numeric,
  taxa_portabilidade_perc numeric,
  taxa_refin_perc numeric,
  prazo_maximo_meses integer,
  vigente_desde date not null default current_date,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.parametros_simulacao enable row level security;
create policy parametros_simulacao_all on public.parametros_simulacao for all
  using (check_workspace_member(workspace_id, auth.uid()))
  with check (check_workspace_member(workspace_id, auth.uid()));

create table public.metas (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  mes date not null,
  meta_volume numeric default 0,
  meta_comissao numeric default 0,
  meta_fechamentos integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, mes)
);
alter table public.metas enable row level security;
create policy metas_all on public.metas for all
  using (check_workspace_member(workspace_id, auth.uid()))
  with check (check_workspace_member(workspace_id, auth.uid()));

create table public.timeline_events (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  contact_id bigint references public.contacts(id),
  actor text not null default 'system', -- 'user:<uuid>' | 'aurus' | 'system'
  tipo text not null, -- msg_in|msg_out|simulacao|proposta_status|followup|nota|campanha|erro_agente
  titulo text,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index idx_timeline_contact on public.timeline_events (workspace_id, contact_id, created_at desc);
alter table public.timeline_events enable row level security;
create policy timeline_events_all on public.timeline_events for all
  using (check_workspace_member(workspace_id, auth.uid()))
  with check (check_workspace_member(workspace_id, auth.uid()));

create table public.message_queue (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  instance_id text references public.user_instances(instance_id),
  contact_id bigint references public.contacts(id),
  phone text not null,
  tipo text not null default 'followup', -- followup|campanha|manual
  payload jsonb not null,
  status text not null default 'pending', -- pending|sent|failed|cancelled
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_mq_pending on public.message_queue (status, scheduled_at) where status = 'pending';
alter table public.message_queue enable row level security;
create policy message_queue_all on public.message_queue for all
  using (check_workspace_member(workspace_id, auth.uid()))
  with check (check_workspace_member(workspace_id, auth.uid()));

create table public.config_agente (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id) unique,
  enabled boolean not null default false,
  nome_agente text not null default 'Aurus',
  assinatura text not null default '_*Aurus - Especialista INSS*_',
  persona_prompt text, -- null = usa prompt padrão embutido na function
  modelo text not null default 'claude-sonnet-5',
  max_chamadas_dia integer not null default 200,
  max_chamadas_conversa integer not null default 30,
  debounce_segundos integer not null default 6,
  horario_inicio time, -- null = 24h
  horario_fim time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.config_agente enable row level security;
create policy config_agente_select on public.config_agente for select
  using (check_workspace_member(workspace_id, auth.uid()));
create policy config_agente_write on public.config_agente for all
  using (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]))
  with check (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]));
insert into public.config_agente (workspace_id) values (1);

alter table public.simulations
  add column if not exists banco_id bigint references public.bancos_ativos(id),
  add column if not exists tipo text not null default 'descoberta'; -- descoberta|enquadramento

update public.contacts set workspace_id = 1 where workspace_id is null;
alter table public.contacts_backup_20260708 enable row level security;

alter publication supabase_realtime add table public.timeline_events;
