-- =====================================================================
-- Meu Armário | Migration 4: dados iniciais de cada conta
-- Ao criar a conta, o usuário recebe perfil, configurações, categorias
-- e locais de armazenamento padrão.
-- =====================================================================

create or replace function private.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  insert into public.categories (user_id, name, icon, color)
  select p_user_id, c.name, c.icon, c.color
  from (values
    ('Alimentos', 'apple', '#059669'),
    ('Bebidas', 'cup-soda', '#0284c7'),
    ('Higiene pessoal', 'bath', '#7c3aed'),
    ('Limpeza', 'spray-can', '#0891b2'),
    ('Medicamentos', 'pill', '#dc2626'),
    ('Cuidados com animais', 'paw-print', '#d97706'),
    ('Papelaria', 'pencil', '#4f46e5'),
    ('Outros', 'package', '#64748b')
  ) as c (name, icon, color)
  where not exists (
    select 1 from public.categories x
    where x.user_id = p_user_id and lower(x.name) = lower(c.name)
  );

  insert into public.storage_locations (user_id, name)
  select p_user_id, l.name
  from (values
    ('Armário'), ('Despensa'), ('Geladeira'), ('Freezer'),
    ('Banheiro'), ('Lavanderia'), ('Outros')
  ) as l (name)
  where not exists (
    select 1 from public.storage_locations x
    where x.user_id = p_user_id and lower(x.name) = lower(l.name)
  );
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;

  perform private.seed_user_defaults(new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Estas funções rodam somente pelo trigger ou pelo seed.sql.
revoke execute on function private.seed_user_defaults(uuid) from public, anon, authenticated;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
