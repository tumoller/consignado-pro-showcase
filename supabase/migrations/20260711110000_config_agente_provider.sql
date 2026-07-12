-- Adiciona coluna provider em config_agente (multi-provider: anthropic/openai/gemini).
-- NÃO aplicar automaticamente — só criar o arquivo (branch feat/dashboard-kanban-crud).
alter table config_agente add column if not exists provider text not null default 'anthropic';
