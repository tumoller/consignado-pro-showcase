-- Config de crédito versionada por workspace (defaults globais do motor simular-credito)
-- Aplicada via MCP em 2026-07-11.
create table public.config_credito (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  coef_emprestimo numeric not null default 0.02338,
  coef_cartao numeric not null default 0.0275,
  taxa_refin_nova_perc numeric not null default 1.85,
  prazo_refin_novo_meses integer not null default 96,
  percentual_variacao_troco numeric not null default 0.15,
  limite_minimo_valor_contrato numeric not null default 2500,
  limite_minimo_parcela numeric not null default 90,
  limite_minimo_prazo integer not null default 15,
  min_valor_emprestimo_novo numeric not null default 1500,
  min_valor_cartao numeric not null default 50,
  min_valor_novo_contrato_portabilidade numeric not null default 2500,
  troco_minimo_multiplo numeric not null default 1.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id)
);

alter table public.config_credito enable row level security;

create policy "config_credito_select" on public.config_credito for select
  using (check_workspace_member(workspace_id, auth.uid()));
create policy "config_credito_update" on public.config_credito for update
  using (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]));
create policy "config_credito_insert" on public.config_credito for insert
  with check (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]));

insert into public.config_credito (workspace_id) values (1);
