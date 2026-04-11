-- ============================================================
-- Storage Buckets para ServiTrust
-- ============================================================

-- Bucket para fotos de servicios (público para visualización)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'servicios',
  'servicios',
  true,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Bucket para avatares (público)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatares',
  'avatares',
  true,
  2097152, -- 2MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Bucket para fotos de solicitudes del cliente (privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'solicitudes',
  'solicitudes',
  false,
  5242880, -- 5MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ============================================================
-- Políticas RLS para storage.objects
-- ============================================================

-- SERVICIOS: lectura pública, escritura solo del proveedor dueño
drop policy if exists "servicios_select_public" on storage.objects;
create policy "servicios_select_public" on storage.objects
  for select using (bucket_id = 'servicios');

drop policy if exists "servicios_insert_owner" on storage.objects;
create policy "servicios_insert_owner" on storage.objects
  for insert with check (
    bucket_id = 'servicios'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "servicios_update_owner" on storage.objects;
create policy "servicios_update_owner" on storage.objects
  for update using (
    bucket_id = 'servicios'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "servicios_delete_owner" on storage.objects;
create policy "servicios_delete_owner" on storage.objects
  for delete using (
    bucket_id = 'servicios'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- AVATARES: lectura pública, escritura solo del usuario dueño
drop policy if exists "avatares_select_public" on storage.objects;
create policy "avatares_select_public" on storage.objects
  for select using (bucket_id = 'avatares');

drop policy if exists "avatares_insert_owner" on storage.objects;
create policy "avatares_insert_owner" on storage.objects
  for insert with check (
    bucket_id = 'avatares'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatares_update_owner" on storage.objects;
create policy "avatares_update_owner" on storage.objects
  for update using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatares_delete_owner" on storage.objects;
create policy "avatares_delete_owner" on storage.objects
  for delete using (
    bucket_id = 'avatares'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- SOLICITUDES: lectura solo por partes del trabajo, escritura solo cliente dueño
drop policy if exists "solicitudes_select_parties" on storage.objects;
create policy "solicitudes_select_parties" on storage.objects
  for select using (
    bucket_id = 'solicitudes'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "solicitudes_insert_owner" on storage.objects;
create policy "solicitudes_insert_owner" on storage.objects
  for insert with check (
    bucket_id = 'solicitudes'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "solicitudes_delete_owner" on storage.objects;
create policy "solicitudes_delete_owner" on storage.objects
  for delete using (
    bucket_id = 'solicitudes'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );
