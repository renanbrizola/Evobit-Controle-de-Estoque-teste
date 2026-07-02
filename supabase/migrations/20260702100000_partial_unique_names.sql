-- ==============================================================================
-- MIGRATION: unicidade de nome ignora tombstones (products/providers)
-- O modelo de exclusao e soft-delete (deleted_at) e a linha fica na tabela.
-- Com UNIQUE(user_id, name) contando deletados: (1) recriar um item com nome
-- de um deletado falha; (2) o tombstone de um duplicado local nunca consegue
-- subir (23505) e trava o cursor de push. Troca por indice unico PARCIAL:
-- nomes so precisam ser unicos entre linhas ATIVAS.
-- ==============================================================================

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_user_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS products_user_id_name_active_key
  ON public.products(user_id, name) WHERE deleted_at IS NULL;

ALTER TABLE public.providers DROP CONSTRAINT IF EXISTS providers_user_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS providers_user_id_name_active_key
  ON public.providers(user_id, name) WHERE deleted_at IS NULL;
