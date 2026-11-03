-- =====================================================================
-- Meu Armário | seed.sql
-- Categorias e locais iniciais são criados automaticamente para cada nova
-- conta pelo trigger on_auth_user_created (migration 4).
--
-- Este arquivo aplica os mesmos padrões às contas que já existiam antes
-- das migrations. Pode ser executado mais de uma vez sem duplicar dados.
-- Execute no SQL Editor do Supabase ou com `supabase db reset` (local).
-- =====================================================================

insert into public.profiles (id, full_name)
select u.id, nullif(btrim(u.raw_user_meta_data ->> 'full_name'), '')
from auth.users u
on conflict (id) do nothing;

select private.seed_user_defaults(u.id) from auth.users u;
