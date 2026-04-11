-- ============================================================
-- ServiTrust Panamá — Esquema Inicial
-- MVP: Marketplace de servicios con pagos en custodia y analytics
-- ============================================================

-- 0. Extensiones
create extension if not exists "pgcrypto";

-- 1. Enum para estados del trabajo
create type estado_trabajo as enum (
  'pendiente',
  'pagado_custodia',
  'en_progreso',
  'terminado',
  'completado_fondos_liberados',
  'cancelado',
  'disputa'
);

-- ============================================================
-- 2. TABLAS
-- ============================================================

-- 2a. Perfiles (extiende auth.users)
create table perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  telefono    text,
  avatar_url  text,
  es_proveedor boolean not null default false,
  corregimiento text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2b. Servicios ofrecidos por proveedores
create table servicios (
  id            uuid primary key default gen_random_uuid(),
  proveedor_id  uuid not null references perfiles(id) on delete cascade,
  titulo        text not null,
  descripcion   text,
  categoria     text not null,
  precio_base   numeric(10,2) not null check (precio_base > 0),
  corregimiento text not null,
  activo        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_servicios_categoria on servicios(categoria);
create index idx_servicios_corregimiento on servicios(corregimiento);
create index idx_servicios_proveedor on servicios(proveedor_id);

-- 2c. Solicitudes de trabajo (con flujo de estados y custodia)
create table solicitudes_trabajo (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null references perfiles(id) on delete cascade,
  servicio_id          uuid not null references servicios(id) on delete cascade,
  proveedor_id         uuid not null references perfiles(id) on delete cascade,
  estado               estado_trabajo not null default 'pendiente',
  fecha_agendada       timestamptz not null,
  notas_cliente        text,
  monto_total          numeric(10,2) not null check (monto_total > 0),
  checkout_session_id  text,          -- ID de pasarela de pago (Stripe, etc.)
  pago_custodia_at     timestamptz,   -- Cuándo se confirmó el pago en custodia
  fondos_liberados_at  timestamptz,   -- Cuándo se liberaron los fondos
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index idx_solicitudes_cliente on solicitudes_trabajo(cliente_id);
create index idx_solicitudes_proveedor on solicitudes_trabajo(proveedor_id);
create index idx_solicitudes_estado on solicitudes_trabajo(estado);

-- 2d. Reseñas (solo 1 por trabajo, solo si completado)
create table resenas (
  id          uuid primary key default gen_random_uuid(),
  trabajo_id  uuid not null unique references solicitudes_trabajo(id) on delete cascade,
  autor_id    uuid not null references perfiles(id) on delete cascade,
  estrellas   smallint not null check (estrellas between 1 and 5),
  comentario  text,
  created_at  timestamptz not null default now()
);

-- 2e. Eventos de búsqueda (analytics)
create table eventos_busqueda (
  id                    uuid primary key default gen_random_uuid(),
  query_texto           text not null,
  categoria_buscada     text,
  corregimiento_buscado text,
  usuario_id            uuid references perfiles(id) on delete set null,
  created_at            timestamptz not null default now()
);

create index idx_busqueda_corregimiento on eventos_busqueda(corregimiento_buscado);
create index idx_busqueda_created on eventos_busqueda(created_at);
create index idx_busqueda_categoria on eventos_busqueda(categoria_buscada);

-- ============================================================
-- 3. FUNCIONES DE VALIDACIÓN
-- ============================================================

-- 3a. Trigger: solo permitir reseña si el trabajo está completado
--     y el autor es el cliente del trabajo
create or replace function validar_resena()
returns trigger as $$
declare
  v_estado estado_trabajo;
  v_cliente_id uuid;
begin
  select estado, cliente_id
  into v_estado, v_cliente_id
  from solicitudes_trabajo
  where id = new.trabajo_id;

  if v_estado != 'completado_fondos_liberados' then
    raise exception 'Solo se puede dejar reseña en trabajos completados (estado actual: %)', v_estado;
  end if;

  if v_cliente_id != new.autor_id then
    raise exception 'Solo el cliente que pagó puede dejar reseña';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_validar_resena
  before insert on resenas
  for each row execute function validar_resena();

-- 3b. Trigger: validar transiciones de estado válidas
create or replace function validar_transicion_estado()
returns trigger as $$
begin
  -- Solo validar si el estado cambió
  if old.estado = new.estado then
    return new;
  end if;

  -- Transiciones permitidas
  case old.estado
    when 'pendiente' then
      if new.estado not in ('pagado_custodia', 'cancelado') then
        raise exception 'Desde pendiente solo se puede ir a pagado_custodia o cancelado';
      end if;
    when 'pagado_custodia' then
      if new.estado not in ('en_progreso', 'cancelado', 'disputa') then
        raise exception 'Desde pagado_custodia solo se puede ir a en_progreso, cancelado o disputa';
      end if;
    when 'en_progreso' then
      if new.estado not in ('terminado', 'disputa') then
        raise exception 'Desde en_progreso solo se puede ir a terminado o disputa';
      end if;
    when 'terminado' then
      if new.estado not in ('completado_fondos_liberados', 'disputa') then
        raise exception 'Desde terminado solo se puede ir a completado_fondos_liberados o disputa';
      end if;
    when 'completado_fondos_liberados' then
      raise exception 'Estado completado es final, no se puede cambiar';
    when 'cancelado' then
      raise exception 'Estado cancelado es final, no se puede cambiar';
    when 'disputa' then
      if new.estado not in ('completado_fondos_liberados', 'cancelado') then
        raise exception 'Desde disputa solo se puede ir a completado o cancelado';
      end if;
  end case;

  -- Registrar timestamps automáticamente
  if new.estado = 'pagado_custodia' then
    new.pago_custodia_at = now();
  elsif new.estado = 'completado_fondos_liberados' then
    new.fondos_liberados_at = now();
  end if;

  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_validar_transicion
  before update on solicitudes_trabajo
  for each row execute function validar_transicion_estado();

-- ============================================================
-- 4. RPC: Top búsquedas por zona (para dashboard proveedor)
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
language plpgsql security definer
as $$
begin
  return query
  select
    eb.query_texto,
    eb.categoria_buscada as categoria,
    count(*)::bigint as total_busquedas,
    jsonb_object_agg(
      to_char(eb.created_at, 'HH24'),
      hora_count
    ) as busquedas_por_hora
  from eventos_busqueda eb
  inner join lateral (
    select
      to_char(eb2.created_at, 'HH24') as hora,
      count(*) as hora_count
    from eventos_busqueda eb2
    where eb2.query_texto = eb.query_texto
      and eb2.corregimiento_buscado = p_corregimiento
      and eb2.created_at >= now() - make_interval(days => p_dias)
    group by to_char(eb2.created_at, 'HH24')
  ) horas on true
  where eb.corregimiento_buscado = p_corregimiento
    and eb.created_at >= now() - make_interval(days => p_dias)
  group by eb.query_texto, eb.categoria_buscada
  order by total_busquedas desc
  limit p_limite;
end;
$$;

-- 4b. RPC: Tendencias por categoría y hora (dashboard proveedor)
create or replace function tendencias_busqueda(
  p_corregimiento text default null,
  p_dias integer default 7
)
returns table (
  categoria   text,
  hora        text,
  total       bigint
)
language sql stable security definer
as $$
  select
    categoria_buscada as categoria,
    to_char(created_at, 'HH24') as hora,
    count(*) as total
  from eventos_busqueda
  where created_at >= now() - make_interval(days => p_dias)
    and (p_corregimiento is null or corregimiento_buscado = p_corregimiento)
  group by categoria_buscada, to_char(created_at, 'HH24')
  order by total desc;
$$;

-- ============================================================
-- 5. POLÍTICAS RLS (Row Level Security)
-- ============================================================

-- Activar RLS en todas las tablas
alter table perfiles enable row level security;
alter table servicios enable row level security;
alter table solicitudes_trabajo enable row level security;
alter table resenas enable row level security;
alter table eventos_busqueda enable row level security;

-- 5a. Perfiles
create policy "Perfiles visibles para todos"
  on perfiles for select using (true);

create policy "Usuarios editan su propio perfil"
  on perfiles for update using (auth.uid() = id);

create policy "Usuarios crean su propio perfil"
  on perfiles for insert with check (auth.uid() = id);

-- 5b. Servicios
create policy "Servicios activos visibles para todos"
  on servicios for select using (activo = true);

create policy "Proveedores ven todos sus servicios"
  on servicios for select using (auth.uid() = proveedor_id);

create policy "Proveedores crean sus servicios"
  on servicios for insert with check (
    auth.uid() = proveedor_id
    and exists (select 1 from perfiles where id = auth.uid() and es_proveedor = true)
  );

create policy "Proveedores editan sus servicios"
  on servicios for update using (auth.uid() = proveedor_id);

create policy "Proveedores eliminan sus servicios"
  on servicios for delete using (auth.uid() = proveedor_id);

-- 5c. Solicitudes de trabajo
create policy "Clientes ven sus solicitudes"
  on solicitudes_trabajo for select using (auth.uid() = cliente_id);

create policy "Proveedores ven solicitudes de sus servicios"
  on solicitudes_trabajo for select using (auth.uid() = proveedor_id);

create policy "Clientes crean solicitudes"
  on solicitudes_trabajo for insert with check (auth.uid() = cliente_id);

create policy "Clientes actualizan sus solicitudes pendientes"
  on solicitudes_trabajo for update using (
    auth.uid() = cliente_id
    and estado in ('pendiente', 'terminado')
  );

create policy "Proveedores actualizan estado del trabajo"
  on solicitudes_trabajo for update using (
    auth.uid() = proveedor_id
    and estado in ('pagado_custodia', 'en_progreso')
  );

-- 5d. Reseñas
create policy "Reseñas visibles para todos"
  on resenas for select using (true);

create policy "Clientes crean reseñas de sus trabajos"
  on resenas for insert with check (auth.uid() = autor_id);

-- 5e. Eventos de búsqueda
create policy "Cualquiera puede registrar búsquedas"
  on eventos_busqueda for insert with check (true);

create policy "Proveedores ven analytics de su zona"
  on eventos_busqueda for select using (
    exists (
      select 1 from perfiles
      where id = auth.uid() and es_proveedor = true
    )
  );

-- ============================================================
-- 6. FUNCIONES AUXILIARES
-- ============================================================

-- Auto-crear perfil al registrarse
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', 'Usuario'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Updated_at automático
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_perfiles_updated
  before update on perfiles
  for each row execute function set_updated_at();

create trigger trg_servicios_updated
  before update on servicios
  for each row execute function set_updated_at();
