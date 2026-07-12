-- Migration: triggers de Timeline automatica
-- Grava eventos em timeline_events a partir de mudancas em propostas e contacts.
-- NAO aplicada ainda. Aplicar via MCP/CLI quando aprovado.
--
-- Regras:
--   propostas  AFTER INSERT                         -> 'Proposta criada'
--   propostas  AFTER UPDATE (status|saldo|bco_op)   -> 'Proposta atualizada' {de,para}
--   contacts   AFTER UPDATE (nome|cpf|status|departamento|qualificacao) -> 'Cadastro alterado'
--
-- Cada funcao e SECURITY DEFINER (roda como owner p/ contornar RLS na escrita
-- do log) e usa IS DISTINCT FROM para detectar alteracao real por campo.

-- ---------------------------------------------------------------------------
-- PROPOSTAS
-- ---------------------------------------------------------------------------
create or replace function public.tg_timeline_propostas()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diffs jsonb := '{}'::jsonb;
begin
  if (tg_op = 'INSERT') then
    insert into public.timeline_events (workspace_id, contact_id, actor, tipo, titulo, payload)
    values (
      new.workspace_id,
      new.contact_id,
      'system',
      'proposta_status',
      'Proposta criada',
      jsonb_build_object(
        'proposta_id', new.id,
        'banco', new.bco_op,
        'saldo', new.saldo,
        'operacao', new.operacao,
        'status', new.status
      )
    );
    return new;
  end if;

  -- UPDATE: monta diffs apenas dos campos relevantes que mudaram
  if (new.status is distinct from old.status) then
    v_diffs := v_diffs || jsonb_build_object(
      'status', jsonb_build_object('de', old.status, 'para', new.status)
    );
  end if;
  if (new.saldo is distinct from old.saldo) then
    v_diffs := v_diffs || jsonb_build_object(
      'saldo', jsonb_build_object('de', old.saldo, 'para', new.saldo)
    );
  end if;
  if (new.bco_op is distinct from old.bco_op) then
    v_diffs := v_diffs || jsonb_build_object(
      'banco', jsonb_build_object('de', old.bco_op, 'para', new.bco_op)
    );
  end if;

  if (v_diffs <> '{}'::jsonb) then
    insert into public.timeline_events (workspace_id, contact_id, actor, tipo, titulo, payload)
    values (
      new.workspace_id,
      new.contact_id,
      'system',
      'proposta_status',
      'Proposta atualizada',
      jsonb_build_object('proposta_id', new.id) || v_diffs
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_timeline_propostas_ins on public.propostas;
create trigger trg_timeline_propostas_ins
  after insert on public.propostas
  for each row execute function public.tg_timeline_propostas();

drop trigger if exists trg_timeline_propostas_upd on public.propostas;
create trigger trg_timeline_propostas_upd
  after update on public.propostas
  for each row execute function public.tg_timeline_propostas();

-- ---------------------------------------------------------------------------
-- CONTACTS
-- ---------------------------------------------------------------------------
create or replace function public.tg_timeline_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diffs jsonb := '{}'::jsonb;
begin
  if (new.nome is distinct from old.nome) then
    v_diffs := v_diffs || jsonb_build_object(
      'nome', jsonb_build_object('de', old.nome, 'para', new.nome)
    );
  end if;
  if (new.cpf is distinct from old.cpf) then
    v_diffs := v_diffs || jsonb_build_object(
      'cpf', jsonb_build_object('de', old.cpf, 'para', new.cpf)
    );
  end if;
  if (new.status is distinct from old.status) then
    v_diffs := v_diffs || jsonb_build_object(
      'status', jsonb_build_object('de', old.status, 'para', new.status)
    );
  end if;
  if (new.departamento is distinct from old.departamento) then
    v_diffs := v_diffs || jsonb_build_object(
      'departamento', jsonb_build_object('de', old.departamento, 'para', new.departamento)
    );
  end if;
  if (new.qualificacao is distinct from old.qualificacao) then
    v_diffs := v_diffs || jsonb_build_object(
      'qualificacao', jsonb_build_object('de', old.qualificacao, 'para', new.qualificacao)
    );
  end if;

  if (v_diffs <> '{}'::jsonb) then
    insert into public.timeline_events (workspace_id, contact_id, actor, tipo, titulo, payload)
    values (
      new.workspace_id,
      new.id,
      'system',
      'nota',
      'Cadastro alterado',
      v_diffs
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_timeline_contacts_upd on public.contacts;
create trigger trg_timeline_contacts_upd
  after update on public.contacts
  for each row execute function public.tg_timeline_contacts();
