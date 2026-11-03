-- Testes de RLS e regras de negócio. Executar somente em banco local de
-- teste (ver supabase/tests/README.md). Cada bloco falha com exceção se
-- o resultado não for o esperado.
\set ON_ERROR_STOP 1

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'ana@teste.local', '{"full_name":"Ana"}'),
  ('00000000-0000-0000-0000-00000000000b', 'bia@teste.local', '{"full_name":"Bia"}');

-- Trigger de cadastro criou perfil, configurações, 8 categorias e 7 locais
do $$
begin
  assert (select count(*) from public.profiles) = 2, 'perfis';
  assert (select count(*) from public.user_settings) = 2, 'configurações';
  assert (select count(*) from public.categories where user_id = '00000000-0000-0000-0000-00000000000a') = 8, 'categorias';
  assert (select count(*) from public.storage_locations where user_id = '00000000-0000-0000-0000-00000000000a') = 7, 'locais';
end $$;

-- ===================== Usuária A =====================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

insert into public.stores (id, name, city) values ('10000000-0000-0000-0000-000000000001', 'Mercado Central', 'Manaus');

-- Cadastro com compra: arroz 5 kg, R$ 32,00, 2 unidades em casa, mínimo 1
select public.create_product_with_inventory(jsonb_build_object(
  'name', 'Arroz', 'brand', 'Tio João',
  'category_id', (select id from public.categories where name = 'Alimentos'),
  'storage_location_id', (select id from public.storage_locations where name = 'Despensa'),
  'current_quantity', 2, 'minimum_quantity', 1, 'control_unit', 'pacote',
  'package_size', 5, 'package_unit', 'kg', 'units_per_package', 1,
  'purchase', jsonb_build_object(
    'store_id', '10000000-0000-0000-0000-000000000001',
    'purchase_date', '2026-10-01', 'unit_price', 32.00, 'packages_count', 1)
)) as cadastro_arroz;

do $$
begin
  assert (select status from public.inventory_items) = 'available', 'arroz disponível';
  assert (select total_amount from public.purchases) = 32.00, 'total da compra';
  assert (select normalized_unit_price from public.purchase_items) = 6.4, 'R$ 6,40 por kg';
  assert (select normalized_unit from public.purchase_items) = 'kg', 'unidade kg';
end $$;

-- Regra 2: quantidade 1 com mínimo 1 => acabando
select public.adjust_inventory_quantity((select id from public.inventory_items), -1) as diminuir;
do $$ begin assert (select status from public.inventory_items) = 'low_stock', 'acabando'; end $$;

-- Regras 1 e 4: zero => acabou e entra na lista automaticamente
select public.adjust_inventory_quantity((select id from public.inventory_items), -5) as zerar;
do $$
begin
  assert (select current_quantity from public.inventory_items) = 0, 'nunca negativo';
  assert (select status from public.inventory_items) = 'out_of_stock', 'acabou';
  assert (select count(*) from public.shopping_list_items where status = 'pending') = 1, 'entrou na lista';
  assert (select reason from public.shopping_list_items) = 'out_of_stock', 'motivo acabou';
end $$;

-- Regra 5: sem duplicidade
select public.add_product_to_shopping_list((select id from public.products where name = 'Arroz')) as duplicado;
do $$
begin
  assert (select count(*) from public.shopping_list_items where status = 'pending') = 1, 'sem duplicar';
end $$;
do $$
begin
  begin
    insert into public.shopping_list_items (product_id) select id from public.products where name = 'Arroz';
    raise exception 'deveria falhar';
  exception when unique_violation then null;
  end;
end $$;

-- Regra 6: item manual sem product_id
insert into public.shopping_list_items (custom_name, desired_quantity, priority) values ('Detergente', 2, 'urgent');

-- Regra 3 e marcação manual de "acabando"
select public.set_inventory_quantity((select id from public.inventory_items), 3);
do $$ begin assert (select status from public.inventory_items) = 'available', 'disponível'; end $$;
select public.mark_inventory_low_stock((select id from public.inventory_items));
do $$ begin assert (select status from public.inventory_items) = 'low_stock', 'acabando manual'; end $$;
select public.set_inventory_quantity((select id from public.inventory_items), 0);

-- Finalizar compra: arroz encontrado (R$ 7,50 / 1 kg), detergente 500 ml x 2,
-- um item não encontrado continua pendente (regra 7)
insert into public.shopping_list_items (custom_name) values ('Café');
select public.finalize_purchase(
  '10000000-0000-0000-0000-000000000001',
  '2026-11-02',
  jsonb_build_array(
    jsonb_build_object(
      'shopping_list_item_id', (select id from public.shopping_list_items where product_id is not null and status = 'pending'),
      'brand', 'Tio João', 'unit_price', 7.50, 'package_size', 1, 'package_unit', 'kg', 'packages_count', 2),
    jsonb_build_object(
      'shopping_list_item_id', (select id from public.shopping_list_items where custom_name = 'Detergente'),
      'brand', 'Ypê', 'unit_price', 2.99, 'package_size', 500, 'package_unit', 'ml', 'packages_count', 2,
      -- valor enviado pelo navegador é ignorado (regra 12)
      'total_price', 1)
  )
) as finalizar;

do $$
declare v_purchase public.purchases;
begin
  select * into v_purchase from public.purchases where purchase_date = '2026-11-02';
  assert v_purchase.total_amount = 20.98, 'total calculado no servidor: ' || v_purchase.total_amount;
  assert (select current_quantity from public.inventory_items i join public.products p on p.id = i.product_id where p.name = 'Arroz') = 2, 'estoque do arroz';
  assert (select status from public.inventory_items i join public.products p on p.id = i.product_id where p.name = 'Arroz') = 'available', 'arroz disponível de novo';
  assert exists (select 1 from public.inventory_items i join public.products p on p.id = i.product_id where p.name = 'Detergente'), 'detergente criado no armário';
  assert (select normalized_unit_price from public.purchase_items where brand = 'Ypê') = 5.98, 'R$ 5,98 por litro';
  assert (select count(*) from public.shopping_list_items where status = 'pending') = 1, 'só o café pendente';
  assert (select custom_name from public.shopping_list_items where status = 'pending') = 'Café', 'café não encontrado';
  -- Regra 9: compra anterior preservada
  assert (select count(*) from public.purchase_items) = 3, 'histórico preservado';
  assert (select normalized_unit_price from public.product_last_purchase pl join public.products p on p.id = pl.product_id where p.name = 'Arroz') = 7.5, 'último preço';
  assert (select min_normalized_unit_price from public.product_price_stats ps join public.products p on p.id = ps.product_id where p.name = 'Arroz') = 6.4, 'menor preço';
  assert (select purchases_count from public.store_stats) = 2, 'compras no mercado';
end $$;

-- Compras são imutáveis para o usuário
do $$
begin
  begin
    update public.purchases set total_amount = 0;
    raise exception 'deveria negar update';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.purchase_items;
    raise exception 'deveria negar delete';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.purchases (store_id, purchase_date) values ('10000000-0000-0000-0000-000000000001', current_date);
    raise exception 'deveria negar insert direto';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Repetir compra na lista
select public.repeat_purchase_to_list((select id from public.purchases where purchase_date = '2026-11-02')) as repetir;
do $$ begin assert (select count(*) from public.shopping_list_items where status = 'pending') = 3, 'repetiu 2 produtos'; end $$;

-- Marcar como comprado fora do modo mercado soma ao estoque
select public.mark_shopping_item_purchased((select l.id from public.shopping_list_items l join public.products p on p.id = l.product_id where p.name = 'Arroz' and l.status = 'pending'));
do $$ begin assert (select current_quantity from public.inventory_items i join public.products p on p.id = i.product_id where p.name = 'Arroz') = 4, 'somou ao estoque'; end $$;

-- Configuração desativada: pergunta em vez de incluir
update public.user_settings set automatically_add_out_of_stock = false;
do $$
declare r jsonb;
begin
  r := public.set_inventory_quantity((select i.id from public.inventory_items i join public.products p on p.id = i.product_id where p.name = 'Arroz'), 0);
  assert (r ->> 'ask_to_add')::boolean, 'deve perguntar';
  assert not (r ->> 'added_to_list')::boolean, 'não deve incluir';
end $$;

-- ===================== Usuária B =====================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$
begin
  assert (select count(*) from public.products) = 0, 'B não vê produtos de A';
  assert (select count(*) from public.purchases) = 0, 'B não vê compras de A';
  assert (select count(*) from public.shopping_list_items) = 0, 'B não vê lista de A';
  assert (select count(*) from public.store_stats) = 0, 'B não vê mercados de A';
  assert (select count(*) from public.product_last_purchase) = 0, 'B não vê histórico de A';
  assert (select count(*) from public.categories) = 8, 'B vê só as próprias categorias';
end $$;
do $$
begin
  update public.inventory_items set current_quantity = 99;
  assert not found, 'B não altera estoque de A';
  delete from public.stores;
  assert not found, 'B não exclui mercado de A';
end $$;
-- B não consegue usar mercado de A nem ligar produto a categoria de A
do $$
begin
  begin
    perform public.finalize_purchase('10000000-0000-0000-0000-000000000001', current_date,
      '[{"name":"X","unit_price":1,"packages_count":1}]'::jsonb);
    raise exception 'deveria negar mercado alheio';
  exception when raise_exception then
    if sqlerrm = 'deveria negar mercado alheio' then raise; end if;
  end;
  begin
    insert into public.products (name, category_id)
    values ('Intruso', (select id from public.categories limit 1)); -- própria categoria: permitido
    delete from public.products where name = 'Intruso';
  end;
end $$;
reset role;
do $$
begin
  begin
    -- Chave composta impede vincular a categoria de outro usuário
    insert into public.products (user_id, name, category_id)
    values ('00000000-0000-0000-0000-00000000000b', 'Intruso',
      (select id from public.categories where user_id = '00000000-0000-0000-0000-00000000000a' limit 1));
    raise exception 'deveria violar FK';
  exception when foreign_key_violation then null;
  end;
end $$;

-- Anônimo não lê nada
set role anon;
do $$
begin
  begin
    perform 1 from public.products;
    raise exception 'anon não deveria ler';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- RLS ativo em todas as tabelas públicas
do $$
begin
  assert not exists (
    select 1 from pg_tables where schemaname = 'public' and not rowsecurity
  ), 'existe tabela sem RLS';
end $$;

select 'TODOS OS TESTES SQL PASSARAM' as resultado;
