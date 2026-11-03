-- =====================================================================
-- Meu Armário | Migration 5: fotos de produtos (Supabase Storage)
-- Cada usuário grava somente na pasta com o próprio id: <user_id>/<arquivo>.
-- O bucket é público para leitura das imagens pela URL, que contém um
-- identificador aleatório. Não armazene fotos com dados pessoais.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "product_images_select_own"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "product_images_insert_own"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "product_images_update_own"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "product_images_delete_own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
