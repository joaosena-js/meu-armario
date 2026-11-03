-- =====================================================================
-- Meu Armário | Migration 2: Row Level Security
-- Regra 11: toda consulta respeita o usuário autenticado.
-- O padrão (select auth.uid()) é avaliado uma única vez por consulta,
-- conforme recomendação de desempenho do Supabase.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.categories enable row level security;
alter table public.storage_locations enable row level security;
alter table public.products enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stores enable row level security;
alter table public.shopping_list_items enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

-- Visitantes anônimos não acessam nenhuma tabela privada.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------------
-- profiles: o id do perfil é o próprio id do usuário.
-- O perfil é criado pelo trigger de cadastro e excluído junto com a conta.
-- ---------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------
-- Tabelas com CRUD completo do próprio usuário
-- ---------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings',
    'categories',
    'storage_locations',
    'products',
    'inventory_items',
    'stores',
    'shopping_list_items'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- purchases e purchase_items: somente leitura e inclusão.
-- Regra 9 e escopo do MVP: compras finalizadas não podem ser editadas
-- nem excluídas. Por isso não existem políticas de UPDATE e DELETE,
-- o que faz o PostgreSQL negar essas operações para o usuário.
-- Quando a edição com reversão de estoque for criada, novas políticas
-- serão adicionadas em uma migration própria.
-- ---------------------------------------------------------------------
create policy "purchases_select_own" on public.purchases
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "purchases_insert_own" on public.purchases
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "purchase_items_select_own" on public.purchase_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "purchase_items_insert_own" on public.purchase_items
  for insert to authenticated with check ((select auth.uid()) = user_id);

-- Regra 12: o total da compra é calculado no servidor. Para garantir isso,
-- o usuário não grava compras diretamente pela API. A inclusão acontece
-- somente pelas funções finalize_purchase e create_product_with_inventory
-- (migration 3), que calculam os valores a partir dos itens.
revoke insert, update, delete on public.purchases from authenticated;
revoke insert, update, delete on public.purchase_items from authenticated;
