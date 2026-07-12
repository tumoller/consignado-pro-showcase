-- Produtos e Convênios (para cadastro de proposta) + delete FK-safe em promotoras/usuarios_banco
-- NÃO aplicar automaticamente — só criar o arquivo (branch feat/dashboard-kanban-crud).

create table public.produtos (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  nome text not null,
  ativo boolean not null default true,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.produtos enable row level security;
create policy produtos_select on public.produtos for select
  using (check_workspace_member(workspace_id, auth.uid()));
create policy produtos_write on public.produtos for all
  using (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]))
  with check (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]));

insert into public.produtos (workspace_id, nome) values
  (1, 'Portabilidade'),
  (1, 'Portabilidade + Refin'),
  (1, 'Empréstimo Novo'),
  (1, 'Cartão'),
  (1, 'Cartão Benefício'),
  (1, 'CLT');

create table public.convenios (
  id bigint generated always as identity primary key,
  workspace_id bigint not null references public.workspaces(id),
  nome text not null,
  ativo boolean not null default true,
  motivo_inativo text,
  prazo_maximo_meses integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.convenios enable row level security;
create policy convenios_select on public.convenios for select
  using (check_workspace_member(workspace_id, auth.uid()));
create policy convenios_write on public.convenios for all
  using (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]))
  with check (check_workspace_role(workspace_id, auth.uid(), array['owner','admin']::workspace_role[]));

insert into public.convenios (workspace_id, nome, prazo_maximo_meses) values
  (1, 'INSS', 108),
  (1, 'SIAPE', 120),
  (1, 'FGTS', null),
  (1, 'CLT', null);

-- Cadastro de proposta: unificar produto/operacao em `operacao` (já usado na listagem/Kanban)
-- e adicionar convênio. Prazo já existe como `qtde_parc` (quantidade de parcelas) — não duplicar.
alter table public.propostas
  add column if not exists convenio text;
