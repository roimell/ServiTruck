-- ============================================================
-- Chat en tiempo real entre cliente y proveedor
-- Se activa cuando estado = 'pagado_custodia'
-- Se limpia automáticamente después de completar/cancelar
-- ============================================================

create table mensajes_chat (
  id          uuid primary key default gen_random_uuid(),
  trabajo_id  uuid not null references solicitudes_trabajo(id) on delete cascade,
  autor_id    uuid not null references perfiles(id) on delete cascade,
  contenido   text not null check (char_length(contenido) <= 2000),
  leido       boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_chat_trabajo on mensajes_chat(trabajo_id, created_at);
create index idx_chat_autor on mensajes_chat(autor_id);

alter table mensajes_chat enable row level security;

create policy "Partes del trabajo ven mensajes"
  on mensajes_chat for select using (
    exists (
      select 1 from solicitudes_trabajo st
      where st.id = trabajo_id
        and (st.cliente_id = auth.uid() or st.proveedor_id = auth.uid())
    )
  );

create policy "Partes del trabajo envian mensajes"
  on mensajes_chat for insert with check (
    auth.uid() = autor_id
    and exists (
      select 1 from solicitudes_trabajo st
      where st.id = trabajo_id
        and (st.cliente_id = auth.uid() or st.proveedor_id = auth.uid())
        and st.estado in ('pagado_custodia', 'en_progreso', 'terminado', 'disputa')
    )
  );

create policy "Usuarios marcan mensajes como leidos"
  on mensajes_chat for update using (
    autor_id != auth.uid()
    and exists (
      select 1 from solicitudes_trabajo st
      where st.id = trabajo_id
        and (st.cliente_id = auth.uid() or st.proveedor_id = auth.uid())
    )
  );

create or replace function validar_mensaje_chat()
returns trigger as $$
declare
  v_estado estado_trabajo;
begin
  select estado into v_estado
  from solicitudes_trabajo
  where id = new.trabajo_id;

  if v_estado not in ('pagado_custodia', 'en_progreso', 'terminado', 'disputa') then
    raise exception 'El chat solo está disponible cuando el trabajo está activo (estado actual: %)', v_estado;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_validar_mensaje
  before insert on mensajes_chat
  for each row execute function validar_mensaje_chat();

create or replace function limpiar_chats_antiguos(p_dias integer default 30)
returns integer
language plpgsql security definer
as $$
declare
  v_count integer;
begin
  with trabajos_cerrados as (
    select id from solicitudes_trabajo
    where estado in ('completado_fondos_liberados', 'cancelado')
      and updated_at < now() - make_interval(days => p_dias)
  )
  delete from mensajes_chat
  where trabajo_id in (select id from trabajos_cerrados);

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function mensajes_no_leidos(p_trabajo_id uuid)
returns integer
language sql stable security definer
as $$
  select count(*)::integer
  from mensajes_chat
  where trabajo_id = p_trabajo_id
    and autor_id != auth.uid()
    and leido = false;
$$;

alter publication supabase_realtime add table mensajes_chat;
