-- Amplia o trigger de timeline de contacts para cobrir endereco, contato e dados bancarios.
-- Substitui a versao de 20260711100000 que so cobria nome/cpf/status/departamento/qualificacao.
-- Usa to_jsonb(old/new) + loop sobre a lista de campos p/ detectar mudancas via IS DISTINCT FROM.

create or replace function public.tg_timeline_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diffs jsonb := '{}'::jsonb;
  v_campo text;
  v_campos text[] := array[
    'nome','cpf','rg','data_nasc','esp_benef','nb_mat','status','departamento','qualificacao',
    'email','phone_number',
    'rua','numero','complemento','bairro','cidade','uf','cep',
    'banco','agencia','conta'
  ];
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
begin
  foreach v_campo in array v_campos loop
    if (v_new -> v_campo) is distinct from (v_old -> v_campo) then
      v_diffs := v_diffs || jsonb_build_object(
        v_campo, jsonb_build_object('de', v_old -> v_campo, 'para', v_new -> v_campo)
      );
    end if;
  end loop;

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

-- trigger trg_timeline_contacts_upd ja existe (20260711100000); a funcao acima o substitui.
