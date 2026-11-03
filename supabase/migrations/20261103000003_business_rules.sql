-- =====================================================================
-- Meu Armário | Migration 3: regras de negócio
-- Estado do estoque, lista "Tem que comprar", cadastro com compra e
-- finalização de compra. Cada função é executada em uma única transação,
-- portanto uma falha desfaz todas as operações (sem registros incompletos).
--
-- Mensagens de erro usam errcode P0001 e texto em português, exibido
-- diretamente na interface.
-- =====================================================================

grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Regras 1, 2 e 3: estado do estoque a partir da quantidade
-- (mesma lógica de src/lib/calculations/stock-status.ts)
-- ---------------------------------------------------------------------
create or replace function private.compute_stock_status(p_quantity numeric, p_minimum numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_quantity <= 0 then 'out_of_stock'
    when p_quantity <= p_minimum then 'low_stock'
    else 'available'
  end;
$$;

create or replace function private.inventory_apply_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT'
     or new.current_quantity is distinct from old.current_quantity
     or new.minimum_quantity is distinct from old.minimum_quantity then
    new.status := private.compute_stock_status(new.current_quantity, new.minimum_quantity);
  elsif new.status is distinct from old.status then
    -- Alteração manual do estado: somente "acabando" com quantidade positiva
    -- é aceita. Qualquer outro caso volta ao estado calculado.
    if not (new.status = 'low_stock' and new.current_quantity > 0) then
      new.status := private.compute_stock_status(new.current_quantity, new.minimum_quantity);
    end if;
  end if;
  return new;
end;
$$;

create trigger inventory_items_apply_status
  before insert or update on public.inventory_items
  for each row execute function private.inventory_apply_status();

-- ---------------------------------------------------------------------
-- Normalização de embalagem: preço por kg, litro ou unidade
-- (mesma lógica de src/lib/calculations/units.ts)
-- ---------------------------------------------------------------------
create or replace function private.normalize_purchase_values(
  p_unit_price numeric,
  p_package_size numeric,
  p_package_unit text,
  p_units_per_package integer,
  p_packages_count integer
)
returns table (
  total_price numeric,
  normalized_quantity numeric,
  normalized_unit text,
  normalized_unit_price numeric
)
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_factor numeric;
  v_unit text;
begin
  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'Informe um preço válido.' using errcode = 'P0001';
  end if;
  if p_packages_count is null or p_packages_count < 1 then
    raise exception 'A quantidade de embalagens deve ser maior que zero.' using errcode = 'P0001';
  end if;

  case p_package_unit
    when 'g' then v_factor := p_package_size / 1000; v_unit := 'kg';
    when 'kg' then v_factor := p_package_size; v_unit := 'kg';
    when 'ml' then v_factor := p_package_size / 1000; v_unit := 'L';
    when 'L' then v_factor := p_package_size; v_unit := 'L';
    when 'unidade' then v_factor := p_package_size; v_unit := 'unidade';
    else v_factor := 1; v_unit := 'unidade';
  end case;

  if v_factor is null or v_factor <= 0 then
    raise exception 'Informe um peso ou volume válido.' using errcode = 'P0001';
  end if;

  total_price := round(p_unit_price * p_packages_count, 2);
  normalized_quantity := round(v_factor * coalesce(p_units_per_package, 1) * p_packages_count, 4);
  normalized_unit := v_unit;
  normalized_unit_price := round(total_price / normalized_quantity, 4);
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- Inclusão na lista sem duplicar pendências (regra 5)
-- ---------------------------------------------------------------------
create or replace function private.add_product_to_list(
  p_user_id uuid,
  p_product_id uuid,
  p_quantity numeric,
  p_unit text,
  p_reason text,
  p_priority text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.shopping_list_items (user_id, product_id, desired_quantity, unit, reason, priority)
  values (p_user_id, p_product_id, greatest(coalesce(p_quantity, 1), 0.001), coalesce(p_unit, 'unidade'),
          coalesce(p_reason, 'manual'), coalesce(p_priority, 'normal'))
  on conflict (user_id, product_id) where status = 'pending' and product_id is not null
  do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id
    from public.shopping_list_items
    where user_id = p_user_id and product_id = p_product_id and status = 'pending';
    return jsonb_build_object('item_id', v_id, 'created', false);
  end if;

  return jsonb_build_object('item_id', v_id, 'created', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Regra 4: após mudança de estoque, consulta as configurações do usuário
-- ---------------------------------------------------------------------
create or replace function private.after_inventory_change(
  p_item public.inventory_items,
  p_previous_status text
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_auto_out boolean;
  v_auto_low boolean;
  v_in_list boolean;
  v_added boolean := false;
  v_ask boolean := false;
  v_result jsonb;
  v_quantity numeric := greatest(p_item.minimum_quantity - p_item.current_quantity, 1);
begin
  select coalesce(s.automatically_add_out_of_stock, true), coalesce(s.automatically_add_low_stock, false)
  into v_auto_out, v_auto_low
  from public.user_settings s
  where s.user_id = p_item.user_id;

  v_auto_out := coalesce(v_auto_out, true);
  v_auto_low := coalesce(v_auto_low, false);

  select exists (
    select 1 from public.shopping_list_items l
    where l.user_id = p_item.user_id and l.product_id = p_item.product_id and l.status = 'pending'
  ) into v_in_list;

  if p_item.status = 'out_of_stock' and p_previous_status is distinct from 'out_of_stock' then
    if v_auto_out then
      v_result := private.add_product_to_list(
        p_item.user_id, p_item.product_id, v_quantity, p_item.control_unit, 'out_of_stock', 'high');
      v_added := (v_result ->> 'created')::boolean;
    else
      v_ask := not v_in_list;
    end if;
  elsif p_item.status = 'low_stock' and p_previous_status = 'available' and v_auto_low then
    v_result := private.add_product_to_list(
      p_item.user_id, p_item.product_id, v_quantity, p_item.control_unit, 'low_stock', 'normal');
    v_added := (v_result ->> 'created')::boolean;
  end if;

  return jsonb_build_object(
    'inventory_item_id', p_item.id,
    'status', p_item.status,
    'previous_status', p_previous_status,
    'current_quantity', p_item.current_quantity,
    'added_to_list', v_added,
    'already_in_list', v_in_list,
    'ask_to_add', v_ask
  );
end;
$$;

-- ---------------------------------------------------------------------
-- API: definir quantidade do item do armário
-- ---------------------------------------------------------------------
create or replace function public.set_inventory_quantity(p_item_id uuid, p_quantity numeric)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous text;
  v_item public.inventory_items;
begin
  if p_quantity is null or p_quantity < 0 then
    raise exception 'A quantidade não pode ser negativa.' using errcode = 'P0001';
  end if;

  select status into v_previous
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Produto não encontrado no armário.' using errcode = 'P0001';
  end if;

  update public.inventory_items
  set current_quantity = p_quantity
  where id = p_item_id
  returning * into v_item;

  return private.after_inventory_change(v_item, v_previous);
end;
$$;

-- API: aumentar ou diminuir a quantidade (nunca abaixo de zero)
create or replace function public.adjust_inventory_quantity(p_item_id uuid, p_delta numeric)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current numeric;
begin
  select current_quantity into v_current
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Produto não encontrado no armário.' using errcode = 'P0001';
  end if;

  return public.set_inventory_quantity(p_item_id, greatest(v_current + coalesce(p_delta, 0), 0));
end;
$$;

-- API: marcar como "acabando" sem alterar a quantidade
create or replace function public.mark_inventory_low_stock(p_item_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_previous text;
  v_item public.inventory_items;
begin
  select status into v_previous
  from public.inventory_items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Produto não encontrado no armário.' using errcode = 'P0001';
  end if;

  if v_previous = 'out_of_stock' then
    raise exception 'O produto já acabou. Atualize a quantidade para marcá-lo como acabando.'
      using errcode = 'P0001';
  end if;

  update public.inventory_items
  set status = 'low_stock'
  where id = p_item_id
  returning * into v_item;

  return private.after_inventory_change(v_item, v_previous);
end;
$$;

-- ---------------------------------------------------------------------
-- API: adicionar produto do catálogo à lista
-- ---------------------------------------------------------------------
create or replace function public.add_product_to_shopping_list(
  p_product_id uuid,
  p_quantity numeric default null,
  p_priority text default 'normal',
  p_reason text default 'manual'
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_unit text;
  v_min numeric;
  v_current numeric;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = 'P0001';
  end if;

  perform 1 from public.products where id = p_product_id;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0001';
  end if;

  select control_unit, minimum_quantity, current_quantity
  into v_unit, v_min, v_current
  from public.inventory_items
  where product_id = p_product_id;

  return private.add_product_to_list(
    v_uid,
    p_product_id,
    coalesce(p_quantity, greatest(coalesce(v_min, 1) - coalesce(v_current, 0), 1)),
    v_unit,
    p_reason,
    p_priority
  );
end;
$$;

-- API: marcar item da lista como comprado fora do modo mercado.
-- Se estiver ligado a um produto, soma a quantidade desejada ao armário.
create or replace function public.mark_shopping_item_purchased(p_item_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item public.shopping_list_items;
  v_inventory_id uuid;
begin
  update public.shopping_list_items
  set status = 'purchased', purchased_at = now()
  where id = p_item_id and status = 'pending'
  returning * into v_item;

  if not found then
    raise exception 'Item não encontrado ou já comprado.' using errcode = 'P0001';
  end if;

  if v_item.product_id is not null then
    update public.inventory_items
    set current_quantity = current_quantity + v_item.desired_quantity
    where product_id = v_item.product_id
    returning id into v_inventory_id;

    if v_inventory_id is null then
      insert into public.inventory_items (product_id, current_quantity, control_unit)
      values (v_item.product_id, v_item.desired_quantity, v_item.unit)
      returning id into v_inventory_id;
    end if;
  end if;

  return jsonb_build_object('item_id', v_item.id, 'inventory_item_id', v_inventory_id);
end;
$$;

-- API: repetir os produtos de uma compra em uma nova lista
create or replace function public.repeat_purchase_to_list(p_purchase_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  r record;
  v_result jsonb;
  v_added integer := 0;
  v_skipped integer := 0;
begin
  perform 1 from public.purchases where id = p_purchase_id;
  if not found then
    raise exception 'Compra não encontrada.' using errcode = 'P0001';
  end if;

  for r in
    select pi.product_id, sum(pi.quantity) as quantity, max(inv.control_unit) as unit
    from public.purchase_items pi
    left join public.inventory_items inv on inv.product_id = pi.product_id
    where pi.purchase_id = p_purchase_id
    group by pi.product_id
  loop
    v_result := private.add_product_to_list(v_uid, r.product_id, r.quantity, r.unit, 'manual', 'normal');
    if (v_result ->> 'created')::boolean then
      v_added := v_added + 1;
    else
      v_skipped := v_skipped + 1;
    end if;
  end loop;

  return jsonb_build_object('added', v_added, 'skipped', v_skipped);
end;
$$;

-- ---------------------------------------------------------------------
-- API: cadastrar produto, item do armário e, opcionalmente, a compra.
-- SECURITY DEFINER porque o usuário não grava compras diretamente
-- (regra 12). Toda consulta filtra explicitamente pelo auth.uid().
-- ---------------------------------------------------------------------
create or replace function public.create_product_with_inventory(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := nullif(btrim(p_payload ->> 'name'), '');
  v_brand text := nullif(btrim(p_payload ->> 'brand'), '');
  v_category_id uuid := nullif(p_payload ->> 'category_id', '')::uuid;
  v_location_id uuid := nullif(p_payload ->> 'storage_location_id', '')::uuid;
  v_package_size numeric := nullif(p_payload ->> 'package_size', '')::numeric;
  v_package_unit text := nullif(p_payload ->> 'package_unit', '');
  v_units_per_package integer := coalesce(nullif(p_payload ->> 'units_per_package', '')::integer, 1);
  v_purchase jsonb := p_payload -> 'purchase';
  v_store_id uuid;
  v_product_id uuid;
  v_item public.inventory_items;
  v_purchase_id uuid;
  v_norm record;
  v_change jsonb;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = 'P0001';
  end if;
  if v_name is null then
    raise exception 'Informe o nome do produto.' using errcode = 'P0001';
  end if;

  if v_category_id is not null and not exists (
    select 1 from public.categories where id = v_category_id and user_id = v_uid
  ) then
    raise exception 'Categoria inválida.' using errcode = 'P0001';
  end if;

  if v_location_id is not null and not exists (
    select 1 from public.storage_locations where id = v_location_id and user_id = v_uid
  ) then
    raise exception 'Local de armazenamento inválido.' using errcode = 'P0001';
  end if;

  -- 1. Localizar ou cadastrar o produto
  select id into v_product_id
  from public.products
  where user_id = v_uid
    and lower(name) = lower(v_name)
    and lower(coalesce(brand, '')) = lower(coalesce(v_brand, ''));

  if v_product_id is null then
    insert into public.products (user_id, name, brand, description, barcode, image_url, category_id)
    values (
      v_uid,
      v_name,
      v_brand,
      nullif(btrim(p_payload ->> 'description'), ''),
      nullif(btrim(p_payload ->> 'barcode'), ''),
      nullif(btrim(p_payload ->> 'image_url'), ''),
      v_category_id
    )
    returning id into v_product_id;
  elsif exists (
    select 1 from public.inventory_items where user_id = v_uid and product_id = v_product_id
  ) then
    raise exception 'Este produto já está no seu armário. Edite o item existente.' using errcode = 'P0001';
  end if;

  -- 2. Criar o item no armário (o estado é definido pelo trigger)
  insert into public.inventory_items (
    user_id, product_id, storage_location_id, current_quantity, minimum_quantity, control_unit,
    package_size, package_unit, units_per_package, expiration_date, notes
  )
  values (
    v_uid,
    v_product_id,
    v_location_id,
    coalesce(nullif(p_payload ->> 'current_quantity', '')::numeric, 0),
    coalesce(nullif(p_payload ->> 'minimum_quantity', '')::numeric, 1),
    coalesce(nullif(p_payload ->> 'control_unit', ''), 'unidade'),
    v_package_size,
    case when v_package_size is null then null else v_package_unit end,
    v_units_per_package,
    nullif(p_payload ->> 'expiration_date', '')::date,
    nullif(btrim(p_payload ->> 'notes'), '')
  )
  returning * into v_item;

  -- 3 a 5. Registrar a compra, o item da compra e, com isso, o histórico de preço
  if v_purchase is not null and jsonb_typeof(v_purchase) = 'object' then
    v_store_id := nullif(v_purchase ->> 'store_id', '')::uuid;

    if v_store_id is null or not exists (
      select 1 from public.stores where id = v_store_id and user_id = v_uid
    ) then
      raise exception 'Selecione um mercado válido para registrar a compra.' using errcode = 'P0001';
    end if;

    select * into v_norm
    from private.normalize_purchase_values(
      (v_purchase ->> 'unit_price')::numeric,
      v_package_size,
      case when v_package_size is null then null else v_package_unit end,
      v_units_per_package,
      coalesce(nullif(v_purchase ->> 'packages_count', '')::integer, 1)
    );

    insert into public.purchases (user_id, store_id, purchase_date, total_amount)
    values (
      v_uid,
      v_store_id,
      coalesce(nullif(v_purchase ->> 'purchase_date', '')::date, current_date),
      v_norm.total_price
    )
    returning id into v_purchase_id;

    insert into public.purchase_items (
      user_id, purchase_id, product_id, brand, quantity, unit_price, total_price,
      package_size, package_unit, units_per_package, packages_count,
      normalized_quantity, normalized_unit, normalized_unit_price
    )
    values (
      v_uid,
      v_purchase_id,
      v_product_id,
      v_brand,
      coalesce(nullif(v_purchase ->> 'packages_count', '')::integer, 1),
      (v_purchase ->> 'unit_price')::numeric,
      v_norm.total_price,
      v_package_size,
      case when v_package_size is null then null else v_package_unit end,
      v_units_per_package,
      coalesce(nullif(v_purchase ->> 'packages_count', '')::integer, 1),
      v_norm.normalized_quantity,
      v_norm.normalized_unit,
      v_norm.normalized_unit_price
    );
  end if;

  -- Produto cadastrado já acabado ou acabando segue as configurações do usuário
  v_change := private.after_inventory_change(v_item, 'available');

  return v_change || jsonb_build_object('product_id', v_product_id, 'purchase_id', v_purchase_id);
end;
$$;

-- ---------------------------------------------------------------------
-- API: finalizar compra do modo mercado (regras 7, 8, 9 e 12)
-- p_items: lista de objetos com os campos
--   shopping_list_item_id (opcional), product_id (opcional), name (opcional),
--   brand, unit_price, package_size, package_unit, units_per_package,
--   packages_count
-- Itens não encontrados não são enviados e continuam pendentes na lista.
-- ---------------------------------------------------------------------
create or replace function public.finalize_purchase(
  p_store_id uuid,
  p_purchase_date date,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_purchase_id uuid;
  v_total numeric;
  v_entry jsonb;
  v_list public.shopping_list_items;
  v_product_id uuid;
  v_product_name text;
  v_name text;
  v_brand text;
  v_package_size numeric;
  v_package_unit text;
  v_units_per_package integer;
  v_packages integer;
  v_unit_price numeric;
  v_norm record;
  v_prev record;
  v_inventory_id uuid;
  v_summary jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Sessão expirada. Entre novamente.' using errcode = 'P0001';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione pelo menos um produto ao carrinho.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_items) > 200 then
    raise exception 'Uma compra pode ter no máximo 200 itens.' using errcode = 'P0001';
  end if;

  if p_purchase_date is null then
    raise exception 'Informe a data da compra.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.stores where id = p_store_id and user_id = v_uid) then
    raise exception 'Mercado inválido.' using errcode = 'P0001';
  end if;

  insert into public.purchases (user_id, store_id, purchase_date, total_amount)
  values (v_uid, p_store_id, p_purchase_date, 0)
  returning id into v_purchase_id;

  for v_entry in select * from jsonb_array_elements(p_items)
  loop
    v_list := null;
    v_product_id := nullif(v_entry ->> 'product_id', '')::uuid;

    if nullif(v_entry ->> 'shopping_list_item_id', '') is not null then
      select * into v_list
      from public.shopping_list_items
      where id = (v_entry ->> 'shopping_list_item_id')::uuid
        and user_id = v_uid
      for update;

      if v_list.id is null then
        raise exception 'Um item da lista não foi encontrado. Atualize a página.' using errcode = 'P0001';
      end if;
      if v_list.status <> 'pending' then
        raise exception 'Um item da lista já foi comprado. Atualize a página.' using errcode = 'P0001';
      end if;
      v_product_id := coalesce(v_product_id, v_list.product_id);
    end if;

    if v_product_id is not null then
      select name into v_product_name
      from public.products
      where id = v_product_id and user_id = v_uid;
      if v_product_name is null then
        raise exception 'Produto inválido.' using errcode = 'P0001';
      end if;
    else
      -- Item manual da lista: localiza ou cadastra o produto pelo nome
      v_name := nullif(btrim(coalesce(v_entry ->> 'name', v_list.custom_name)), '');
      if v_name is null then
        raise exception 'Produto sem nome no carrinho.' using errcode = 'P0001';
      end if;

      select id, name into v_product_id, v_product_name
      from public.products
      where user_id = v_uid and lower(name) = lower(v_name) and brand is null;

      if v_product_id is null then
        insert into public.products (user_id, name)
        values (v_uid, v_name)
        returning id, name into v_product_id, v_product_name;
      end if;
    end if;

    v_brand := nullif(btrim(v_entry ->> 'brand'), '');
    v_package_size := nullif(v_entry ->> 'package_size', '')::numeric;
    v_package_unit := case when v_package_size is null then null else nullif(v_entry ->> 'package_unit', '') end;
    v_units_per_package := coalesce(nullif(v_entry ->> 'units_per_package', '')::integer, 1);
    v_packages := coalesce(nullif(v_entry ->> 'packages_count', '')::integer, 0);
    v_unit_price := nullif(v_entry ->> 'unit_price', '')::numeric;

    if v_unit_price is null or v_unit_price < 0 or v_unit_price > 99999 then
      raise exception 'Preço inválido para %.', v_product_name using errcode = 'P0001';
    end if;
    if v_packages < 1 or v_packages > 999 then
      raise exception 'Quantidade inválida para %.', v_product_name using errcode = 'P0001';
    end if;

    select * into v_norm
    from private.normalize_purchase_values(
      v_unit_price, v_package_size, v_package_unit, v_units_per_package, v_packages);

    -- Preço anterior do mesmo produto, na mesma unidade de referência
    select pi.normalized_unit_price, pi.unit_price
    into v_prev
    from public.purchase_items pi
    join public.purchases p on p.id = pi.purchase_id
    where pi.user_id = v_uid
      and pi.product_id = v_product_id
      and pi.normalized_unit = v_norm.normalized_unit
      and pi.purchase_id <> v_purchase_id
      and p.purchase_date <= p_purchase_date
    order by p.purchase_date desc, pi.created_at desc
    limit 1;

    -- Regra 9: sempre um novo registro, nunca sobrescreve compras anteriores
    insert into public.purchase_items (
      user_id, purchase_id, product_id, brand, quantity, unit_price, total_price,
      package_size, package_unit, units_per_package, packages_count,
      normalized_quantity, normalized_unit, normalized_unit_price
    )
    values (
      v_uid, v_purchase_id, v_product_id, v_brand, v_packages, v_unit_price, v_norm.total_price,
      v_package_size, v_package_unit, v_units_per_package, v_packages,
      v_norm.normalized_quantity, v_norm.normalized_unit, v_norm.normalized_unit_price
    );

    -- Regra 8: o estoque só é atualizado aqui, na finalização
    v_inventory_id := null;
    update public.inventory_items
    set current_quantity = current_quantity + v_packages,
        package_size = coalesce(package_size, v_package_size),
        package_unit = case when package_size is null then v_package_unit else package_unit end
    where user_id = v_uid and product_id = v_product_id
    returning id into v_inventory_id;

    if v_inventory_id is null then
      insert into public.inventory_items (
        user_id, product_id, current_quantity, control_unit, package_size, package_unit, units_per_package)
      values (
        v_uid, v_product_id, v_packages, coalesce(v_list.unit, 'unidade'),
        v_package_size, v_package_unit, v_units_per_package)
      returning id into v_inventory_id;
    end if;

    -- Remove da lista o item comprado e qualquer pendência do mesmo produto
    update public.shopping_list_items
    set status = 'purchased', purchased_at = now(), product_id = v_product_id
    where user_id = v_uid
      and status = 'pending'
      and (id = v_list.id or product_id = v_product_id);

    v_summary := v_summary || jsonb_build_array(jsonb_build_object(
      'product_id', v_product_id,
      'name', v_product_name,
      'brand', v_brand,
      'packages_count', v_packages,
      'total_price', v_norm.total_price,
      'normalized_unit', v_norm.normalized_unit,
      'normalized_unit_price', v_norm.normalized_unit_price,
      'previous_normalized_unit_price', v_prev.normalized_unit_price,
      'price_change', case
        when v_prev.normalized_unit_price is null then null
        when v_norm.normalized_unit_price > v_prev.normalized_unit_price then 'higher'
        when v_norm.normalized_unit_price < v_prev.normalized_unit_price then 'lower'
        else 'equal'
      end
    ));
  end loop;

  -- Regra 12: total calculado a partir dos itens gravados
  select coalesce(sum(total_price), 0) into v_total
  from public.purchase_items
  where purchase_id = v_purchase_id;

  update public.purchases set total_amount = v_total where id = v_purchase_id;

  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'total_amount', v_total,
    'items_count', jsonb_array_length(p_items),
    'items', v_summary
  );
end;
$$;

-- ---------------------------------------------------------------------
-- Visões de apoio ao histórico de preços (respeitam o RLS do usuário)
-- ---------------------------------------------------------------------
create view public.product_last_purchase
with (security_invoker = true) as
select distinct on (pi.product_id)
  pi.product_id,
  pi.user_id,
  pi.purchase_id,
  pi.brand,
  pi.unit_price,
  pi.normalized_unit,
  pi.normalized_unit_price,
  p.purchase_date,
  p.store_id,
  s.name as store_name
from public.purchase_items pi
join public.purchases p on p.id = pi.purchase_id
join public.stores s on s.id = p.store_id
order by pi.product_id, p.purchase_date desc, pi.created_at desc;

create view public.product_price_stats
with (security_invoker = true) as
select
  pi.product_id,
  pi.user_id,
  pi.normalized_unit,
  min(pi.normalized_unit_price) as min_normalized_unit_price,
  min(pi.unit_price) as min_unit_price,
  count(*)::integer as purchases_count
from public.purchase_items pi
group by pi.product_id, pi.user_id, pi.normalized_unit;

create view public.store_stats
with (security_invoker = true) as
select
  s.id as store_id,
  s.user_id,
  count(p.id)::integer as purchases_count,
  coalesce(sum(p.total_amount), 0)::numeric(12, 2) as total_spent,
  case when count(p.id) = 0 then 0
       else round(sum(p.total_amount) / count(p.id), 2) end::numeric(12, 2) as average_ticket,
  max(p.purchase_date) as last_purchase_date
from public.stores s
left join public.purchases p on p.store_id = s.id
group by s.id, s.user_id;

create view public.store_product_prices
with (security_invoker = true) as
select
  p.store_id,
  pi.user_id,
  pi.product_id,
  pr.name as product_name,
  pr.brand as product_brand,
  pi.normalized_unit,
  round(avg(pi.unit_price), 2)::numeric(12, 2) as average_unit_price,
  round(avg(pi.normalized_unit_price), 4)::numeric(14, 4) as average_normalized_unit_price,
  count(*)::integer as purchases_count,
  max(p.purchase_date) as last_purchase_date
from public.purchase_items pi
join public.purchases p on p.id = pi.purchase_id
join public.products pr on pr.id = pi.product_id
group by p.store_id, pi.user_id, pi.product_id, pr.name, pr.brand, pi.normalized_unit;

revoke all on public.product_last_purchase, public.product_price_stats,
  public.store_stats, public.store_product_prices from anon;
grant select on public.product_last_purchase, public.product_price_stats,
  public.store_stats, public.store_product_prices to authenticated;

-- ---------------------------------------------------------------------
-- Permissões de execução: somente usuários autenticados
-- ---------------------------------------------------------------------
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

revoke execute on function
  public.set_inventory_quantity(uuid, numeric),
  public.adjust_inventory_quantity(uuid, numeric),
  public.mark_inventory_low_stock(uuid),
  public.add_product_to_shopping_list(uuid, numeric, text, text),
  public.mark_shopping_item_purchased(uuid),
  public.repeat_purchase_to_list(uuid),
  public.create_product_with_inventory(jsonb),
  public.finalize_purchase(uuid, date, jsonb)
from public, anon;

grant execute on function
  public.set_inventory_quantity(uuid, numeric),
  public.adjust_inventory_quantity(uuid, numeric),
  public.mark_inventory_low_stock(uuid),
  public.add_product_to_shopping_list(uuid, numeric, text, text),
  public.mark_shopping_item_purchased(uuid),
  public.repeat_purchase_to_list(uuid),
  public.create_product_with_inventory(jsonb),
  public.finalize_purchase(uuid, date, jsonb)
to authenticated;
