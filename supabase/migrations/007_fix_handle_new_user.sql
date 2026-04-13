-- Fix: handle_new_user necesita schema-qualify "public.perfiles"
-- El trigger se ejecuta como supabase_auth_admin cuyo search_path
-- no incluye "public", causando "relation perfiles does not exist"
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.perfiles (id, nombre, es_proveedor)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'),
    coalesce((new.raw_user_meta_data->>'es_proveedor')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;
