-- ============================================================
-- ServiTrust Panamá — Mejoras al esquema
-- ============================================================

-- ============================================================
-- MEJORA 1: Categorías normalizadas
-- Evita inconsistencias ("Electricidad" vs "electricidad" vs "Electrico")
-- ============================================================

create table categorias (
  id    serial primary key,
  slug  text not null unique,      -- 'electricidad', 'plomeria'
  nombre text not null,            -- 'Electricidad', 'Plomería'
  icono  text                      -- emoji o nombre de icono
);

insert into categorias (slug, nombre, icono) values
  ('electricidad', 'Electricidad', 'zap'),
  ('plomeria', 'Plomería', 'droplets'),
  ('pintura', 'Pintura', 'paintbrush'),
  ('limpieza', 'Limpieza', 'sparkles'),
  ('jardineria', 'Jardinería', 'trees'),
  ('cerrajeria', 'Cerrajería', 'key-round'),
  ('aire-acondicionado', 'Aire Acondicionado', 'thermometer-snowflake'),
  ('mudanza', 'Mudanza', 'truck'),
  ('fumigacion', 'Fumigación', 'bug-off'),
  ('albanileria', 'Albañilería', 'hammer'),
  ('mecanica', 'Mecánica Automotriz', 'wrench'),
  ('tecnologia', 'Tecnología / Redes', 'wifi'),
  ('carpinteria', 'Carpintería', 'axe'),
  ('soldadura', 'Soldadura', 'flame'),
  ('paneles-solares', 'Paneles Solares', 'sun');

-- Migrar columna categoria de servicios a FK
alter table servicios
  add column categoria_id integer references categorias(id);

-- En un sistema real harías UPDATE servicios SET categoria_id = ...
-- Por ahora, para nuevos registros:
comment on column servicios.categoria is 'DEPRECADO: usar categoria_id';

-- Mismo para eventos_busqueda
alter table eventos_busqueda
  add column categoria_id integer references categorias(id);

-- ============================================================
-- MEJORA 2: Historial de estados (auditoría para disputas/custodia)
-- Sin esto, en una disputa no hay forma de probar quién hizo qué
-- ============================================================

create table historial_estados (
  id          uuid primary key default gen_random_uuid(),
  trabajo_id  uuid not null references solicitudes_trabajo(id) on delete cascade,
  estado_anterior estado_trabajo not null,
  estado_nuevo    estado_trabajo not null,
  cambiado_por    uuid references perfiles(id),
  nota            text,
  created_at      timestamptz not null default now()
);

create index idx_historial_trabajo on historial_estados(trabajo_id);

-- Trigger automático: registrar cada cambio de estado
create or replace function registrar_cambio_estado()
returns trigger as $$
begin
  if old.estado != new.estado then
    insert into historial_estados (trabajo_id, estado_anterior, estado_nuevo, cambiado_por)
    values (new.id, old.estado, new.estado, auth.uid());
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_historial_estado
  after update on solicitudes_trabajo
  for each row execute function registrar_cambio_estado();

-- RLS para historial
alter table historial_estados enable row level security;

create policy "Partes del trabajo ven el historial"
  on historial_estados for select using (
    exists (
      select 1 from solicitudes_trabajo st
      where st.id = trabajo_id
        and (st.cliente_id = auth.uid() or st.proveedor_id = auth.uid())
    )
  );

-- ============================================================
-- MEJORA 3: Comisión de plataforma (modelo de negocio)
-- ============================================================

alter table solicitudes_trabajo
  add column comision_porcentaje numeric(4,2) not null default 10.00
    check (comision_porcentaje between 0 and 50),
  add column comision_monto numeric(10,2) generated always as
    (monto_total * comision_porcentaje / 100) stored,
  add column monto_proveedor numeric(10,2) generated always as
    (monto_total - (monto_total * comision_porcentaje / 100)) stored;

-- ============================================================
-- MEJORA 4: Rating promedio cacheado en servicios
-- Evita N+1 queries al listar servicios
-- ============================================================

alter table servicios
  add column rating_promedio numeric(2,1) default 0,
  add column total_resenas integer default 0;

-- Función que recalcula el rating después de cada reseña
create or replace function actualizar_rating_servicio()
returns trigger as $$
declare
  v_servicio_id uuid;
begin
  select servicio_id into v_servicio_id
  from solicitudes_trabajo
  where id = new.trabajo_id;

  update servicios set
    rating_promedio = (
      select round(avg(r.estrellas)::numeric, 1)
      from resenas r
      join solicitudes_trabajo st on st.id = r.trabajo_id
      where st.servicio_id = v_servicio_id
    ),
    total_resenas = (
      select count(*)
      from resenas r
      join solicitudes_trabajo st on st.id = r.trabajo_id
      where st.servicio_id = v_servicio_id
    )
  where id = v_servicio_id;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_actualizar_rating
  after insert on resenas
  for each row execute function actualizar_rating_servicio();

-- ============================================================
-- MEJORA 5: Fotos del servicio (portafolio del proveedor)
-- ============================================================

alter table servicios
  add column fotos text[] default '{}';

-- ============================================================
-- MEJORA 6: Notificaciones (para Resend / WhatsApp futuro)
-- ============================================================

create type canal_notificacion as enum ('email', 'push', 'whatsapp');
create type tipo_notificacion as enum (
  'nueva_solicitud',
  'pago_confirmado',
  'trabajo_iniciado',
  'trabajo_terminado',
  'fondos_liberados',
  'nueva_resena',
  'recordatorio_cita'
);

create table notificaciones (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references perfiles(id) on delete cascade,
  tipo          tipo_notificacion not null,
  canal         canal_notificacion not null default 'email',
  titulo        text not null,
  cuerpo        text,
  trabajo_id    uuid references solicitudes_trabajo(id) on delete set null,
  leida         boolean not null default false,
  enviada       boolean not null default false,
  enviada_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_notif_usuario on notificaciones(usuario_id, leida);

alter table notificaciones enable row level security;

create policy "Usuarios ven sus notificaciones"
  on notificaciones for select using (auth.uid() = usuario_id);

create policy "Usuarios marcan leídas sus notificaciones"
  on notificaciones for update using (auth.uid() = usuario_id);

-- ============================================================
-- MEJORA 7: Búsqueda full-text en servicios
-- ============================================================

alter table servicios
  add column busqueda_tsv tsvector
  generated always as (
    setweight(to_tsvector('spanish', coalesce(titulo, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(descripcion, '')), 'B')
  ) stored;

create index idx_servicios_fts on servicios using gin(busqueda_tsv);

-- RPC para buscar servicios con full-text search
create or replace function buscar_servicios(
  p_query text,
  p_corregimiento text default null,
  p_categoria_id integer default null,
  p_limite integer default 20
)
returns table (
  id uuid,
  titulo text,
  descripcion text,
  precio_base numeric,
  corregimiento text,
  categoria_nombre text,
  proveedor_nombre text,
  proveedor_avatar text,
  rating_promedio numeric,
  total_resenas integer,
  fotos text[],
  relevancia real
)
language sql stable security definer
as $$
  select
    s.id,
    s.titulo,
    s.descripcion,
    s.precio_base,
    s.corregimiento,
    c.nombre as categoria_nombre,
    p.nombre as proveedor_nombre,
    p.avatar_url as proveedor_avatar,
    s.rating_promedio,
    s.total_resenas,
    s.fotos,
    ts_rank(s.busqueda_tsv, websearch_to_tsquery('spanish', p_query)) as relevancia
  from servicios s
  join perfiles p on p.id = s.proveedor_id
  left join categorias c on c.id = s.categoria_id
  where s.activo = true
    and s.busqueda_tsv @@ websearch_to_tsquery('spanish', p_query)
    and (p_corregimiento is null or s.corregimiento = p_corregimiento)
    and (p_categoria_id is null or s.categoria_id = p_categoria_id)
  order by relevancia desc
  limit p_limite;
$$;

-- ============================================================
-- MEJORA 8: Fix RPC top_busquedas (simplificar lateral join)
-- ============================================================

create or replace function top_busquedas_por_zona(
  p_corregimiento text,
  p_dias integer default 7,
  p_limite integer default 10
)
returns table (
  query_texto       text,
  categoria         text,
  total_busquedas   bigint,
  busquedas_por_hora jsonb
)
language sql stable security definer
as $$
  with filtrado as (
    select
      eb.query_texto,
      coalesce(c.nombre, eb.categoria_buscada) as categoria,
      to_char(eb.created_at, 'HH24') as hora
    from eventos_busqueda eb
    left join categorias c on c.id = eb.categoria_id
    where eb.corregimiento_buscado = p_corregimiento
      and eb.created_at >= now() - make_interval(days => p_dias)
  ),
  por_hora as (
    select query_texto, categoria, hora, count(*) as cnt
    from filtrado
    group by query_texto, categoria, hora
  )
  select
    ph.query_texto,
    ph.categoria,
    sum(ph.cnt)::bigint as total_busquedas,
    jsonb_object_agg(ph.hora, ph.cnt) as busquedas_por_hora
  from por_hora ph
  group by ph.query_texto, ph.categoria
  order by total_busquedas desc
  limit p_limite;
$$;

-- ============================================================
-- RLS: categorías visibles para todos
-- ============================================================

alter table categorias enable row level security;

create policy "Categorías visibles para todos"
  on categorias for select using (true);
