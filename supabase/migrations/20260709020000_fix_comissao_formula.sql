-- Fix: coluna gerada `comissao` estava como (saldo * cms_pct), sem dividir por 100,
-- resultando em valores 100x maiores. Correto: saldo * cms_pct / 100 (o % aplicado
-- ao valor da operacao). Recria a coluna gerada com a formula certa.

alter table propostas drop column comissao;
alter table propostas add column comissao numeric
  generated always as (round(coalesce(saldo,0)*coalesce(cms_pct,0)/100, 2)) stored;
