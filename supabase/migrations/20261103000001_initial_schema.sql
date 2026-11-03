-- =====================================================================
-- Meu Armário | Migration 1: esquema inicial
-- Tabelas, restrições, índices e trigger de updated_at.
-- Valores de domínio são armazenados em inglês (ex.: 'out_of_stock') e
-- traduzidos na interface. As restrições CHECK documentam os valores aceitos.
-- =====================================================================

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Função utilitária: atualiza updated_at
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- user_settings
-- ---------------------------------------------------------------------
create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  automatically_add_out_of_stock boolean not null default true,
  automatically_add_low_stock boolean not null default false,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  icon text check (icon is null or char_length(icon) <= 40),
  color text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Permite chaves estrangeiras compostas (id, user_id), impedindo que um
  -- registro aponte para dados de outro usuário.
  unique (id, user_id)
);
create unique index categories_user_name_key on public.categories (user_id, lower(name));

-- ---------------------------------------------------------------------
-- storage_locations
-- ---------------------------------------------------------------------
create table public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index storage_locations_user_name_key on public.storage_locations (user_id, lower(name));

-- ---------------------------------------------------------------------
-- products (catálogo do usuário)
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  brand text check (brand is null or char_length(brand) <= 80),
  description text check (description is null or char_length(description) <= 500),
  barcode text check (barcode is null or barcode ~ '^[0-9]{8,14}$'),
  image_url text check (image_url is null or char_length(image_url) <= 500),
  category_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id)
    references public.categories (id, user_id)
    on delete set null (category_id)
);
create index products_user_id_idx on public.products (user_id);
create index products_category_id_idx on public.products (category_id);
-- Mesmo nome + marca identifica o mesmo produto para o usuário.
create unique index products_user_name_brand_key
  on public.products (user_id, lower(name), lower(coalesce(brand, '')));

-- ---------------------------------------------------------------------
-- inventory_items (o que existe em casa)
-- ---------------------------------------------------------------------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null,
  storage_location_id uuid,
  current_quantity numeric(12, 3) not null default 0 check (current_quantity >= 0 and current_quantity <= 99999),
  minimum_quantity numeric(12, 3) not null default 1 check (minimum_quantity >= 0 and minimum_quantity <= 99999),
  control_unit text not null default 'unidade'
    check (control_unit in ('unidade', 'pacote', 'caixa', 'garrafa', 'lata', 'frasco')),
  package_size numeric(12, 3) check (package_size is null or package_size > 0),
  package_unit text check (package_unit is null or package_unit in ('g', 'kg', 'ml', 'L', 'unidade')),
  units_per_package integer not null default 1 check (units_per_package between 1 and 1000),
  expiration_date date,
  status text not null default 'out_of_stock'
    check (status in ('available', 'low_stock', 'out_of_stock')),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Regra 1: quantidade zero <=> acabou
  constraint inventory_status_matches_quantity
    check ((current_quantity = 0) = (status = 'out_of_stock')),
  constraint inventory_package_size_requires_unit
    check ((package_size is null) = (package_unit is null)),
  -- Nesta versão, cada produto possui um único registro no armário.
  unique (user_id, product_id),
  foreign key (product_id, user_id)
    references public.products (id, user_id) on delete cascade,
  foreign key (storage_location_id, user_id)
    references public.storage_locations (id, user_id)
    on delete set null (storage_location_id)
);
create index inventory_items_user_status_idx on public.inventory_items (user_id, status);
create index inventory_items_product_id_idx on public.inventory_items (product_id);
create index inventory_items_storage_location_id_idx on public.inventory_items (storage_location_id);

-- ---------------------------------------------------------------------
-- stores (mercados)
-- ---------------------------------------------------------------------
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  address text check (address is null or char_length(address) <= 200),
  neighborhood text check (neighborhood is null or char_length(neighborhood) <= 80),
  city text check (city is null or char_length(city) <= 80),
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);
create unique index stores_user_name_key on public.stores (user_id, lower(name));

-- ---------------------------------------------------------------------
-- shopping_list_items (lista "Tem que comprar")
-- ---------------------------------------------------------------------
create table public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid,
  custom_name text check (custom_name is null or char_length(btrim(custom_name)) between 1 and 120),
  preferred_brand text check (preferred_brand is null or char_length(preferred_brand) <= 80),
  desired_quantity numeric(12, 3) not null default 1 check (desired_quantity > 0 and desired_quantity <= 9999),
  unit text not null default 'unidade'
    check (unit in ('unidade', 'pacote', 'caixa', 'garrafa', 'lata', 'frasco')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  reason text not null default 'manual' check (reason in ('out_of_stock', 'low_stock', 'manual')),
  notes text check (notes is null or char_length(notes) <= 300),
  status text not null default 'pending' check (status in ('pending', 'purchased')),
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Regra 6: item manual pode existir sem product_id, desde que tenha nome.
  constraint shopping_item_has_identity check (product_id is not null or custom_name is not null),
  foreign key (product_id, user_id)
    references public.products (id, user_id) on delete cascade
);
-- Regra 5: o mesmo produto não pode estar pendente duas vezes.
create unique index shopping_list_unique_pending_product
  on public.shopping_list_items (user_id, product_id)
  where status = 'pending' and product_id is not null;
create unique index shopping_list_unique_pending_custom
  on public.shopping_list_items (user_id, lower(custom_name))
  where status = 'pending' and product_id is null;
create index shopping_list_items_user_status_idx on public.shopping_list_items (user_id, status);
create index shopping_list_items_product_id_idx on public.shopping_list_items (product_id);

-- ---------------------------------------------------------------------
-- purchases (compras finalizadas, imutáveis nesta versão)
-- ---------------------------------------------------------------------
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  store_id uuid not null,
  purchase_date date not null,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  status text not null default 'completed' check (status in ('completed')),
  created_at timestamptz not null default now(),
  unique (id, user_id),
  -- Um mercado com compras não pode ser excluído.
  foreign key (store_id, user_id)
    references public.stores (id, user_id) on delete restrict
);
create index purchases_user_date_idx on public.purchases (user_id, purchase_date desc, created_at desc);
create index purchases_store_id_idx on public.purchases (store_id);

-- ---------------------------------------------------------------------
-- purchase_items (fonte do histórico de preços; nunca sobrescritos)
-- ---------------------------------------------------------------------
create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  purchase_id uuid not null,
  product_id uuid not null,
  brand text check (brand is null or char_length(brand) <= 80),
  quantity numeric(12, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  package_size numeric(12, 3) check (package_size is null or package_size > 0),
  package_unit text check (package_unit is null or package_unit in ('g', 'kg', 'ml', 'L', 'unidade')),
  units_per_package integer not null default 1 check (units_per_package between 1 and 1000),
  packages_count integer not null check (packages_count between 1 and 999),
  normalized_quantity numeric(14, 4) not null check (normalized_quantity > 0),
  normalized_unit text not null check (normalized_unit in ('kg', 'L', 'unidade')),
  normalized_unit_price numeric(14, 4) not null check (normalized_unit_price >= 0),
  created_at timestamptz not null default now(),
  foreign key (purchase_id, user_id)
    references public.purchases (id, user_id) on delete cascade,
  -- Produto com histórico de compra não pode ser excluído do catálogo.
  foreign key (product_id, user_id)
    references public.products (id, user_id) on delete restrict
);
create index purchase_items_purchase_id_idx on public.purchase_items (purchase_id);
create index purchase_items_product_idx on public.purchase_items (user_id, product_id, created_at desc);

-- ---------------------------------------------------------------------
-- Triggers de updated_at
-- ---------------------------------------------------------------------
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function private.set_updated_at();
create trigger categories_set_updated_at before update on public.categories
  for each row execute function private.set_updated_at();
create trigger storage_locations_set_updated_at before update on public.storage_locations
  for each row execute function private.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger inventory_items_set_updated_at before update on public.inventory_items
  for each row execute function private.set_updated_at();
create trigger stores_set_updated_at before update on public.stores
  for each row execute function private.set_updated_at();
create trigger shopping_list_items_set_updated_at before update on public.shopping_list_items
  for each row execute function private.set_updated_at();
