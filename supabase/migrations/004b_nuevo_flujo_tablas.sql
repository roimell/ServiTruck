-- Ajustes a solicitudes_trabajo
alter table solicitudes_trabajo alter column estado set default 'solicitud_enviada';
alter table solicitudes_trabajo alter column monto_total drop not null;
alter table solicitudes_trabajo drop constraint if exists solicitudes_trabajo_monto_total_check;
alter table solicitudes_trabajo add constraint solicitudes_trabajo_monto_total_check
  check (monto_total is null or monto_total > 0);

alter table solicitudes_trabajo
  add column if not exists descripcion_cliente text,
  add column if not exists fotos_cliente text[] default '{}',
  add column if not exists paquete_id uuid,
  add column if not exists expirado_at timestamptz;

-- Paquetes de servicio
create table paquetes_servicio (
  id            uuid primary key default gen_random_uuid(),
  servicio_id   uuid not null references servicios(id) on delete cascade,
  nombre        text not null,
  descripcion   text,
  precio        numeric(10,2) not null check (precio > 0),
  orden         smallint not null default 0,
  activo        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index idx_paquetes_servicio on paquetes_servicio(servicio_id);
alter table paquetes_servicio enable row level security;
create policy "Paquetes visibles" on paquetes_servicio for select using (true);
create policy "Proveedores crean paquetes" on paquetes_servicio for insert with check (exists (select 1 from servicios where id = servicio_id and proveedor_id = auth.uid()));
create policy "Proveedores editan paquetes" on paquetes_servicio for update using (exists (select 1 from servicios where id = servicio_id and proveedor_id = auth.uid()));
create policy "Proveedores eliminan paquetes" on paquetes_servicio for delete using (exists (select 1 from servicios where id = servicio_id and proveedor_id = auth.uid()));
alter table solicitudes_trabajo add constraint fk_solicitud_paquete foreign key (paquete_id) references paquetes_servicio(id) on delete set null;

-- Disponibilidad semanal
create table disponibilidad_semanal (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references perfiles(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null, hora_fin time not null,
  activo boolean not null default true,
  constraint chk_horario_valido check (hora_fin > hora_inicio),
  constraint uq_disponibilidad unique (proveedor_id, dia_semana, hora_inicio)
);
create index idx_disponibilidad_proveedor on disponibilidad_semanal(proveedor_id);
alter table disponibilidad_semanal enable row level security;
create policy "Disponibilidad visible" on disponibilidad_semanal for select using (true);
create policy "Proveedores gestionan" on disponibilidad_semanal for all using (auth.uid() = proveedor_id);

-- Bloqueos de agenda
create table bloqueos_agenda (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references perfiles(id) on delete cascade,
  fecha date not null, hora_inicio time, hora_fin time,
  motivo text, trabajo_id uuid references solicitudes_trabajo(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index idx_bloqueos_proveedor_fecha on bloqueos_agenda(proveedor_id, fecha);
alter table bloqueos_agenda enable row level security;
create policy "Bloqueos visibles" on bloqueos_agenda for select using (true);
create policy "Proveedores gestionan bloqueos" on bloqueos_agenda for all using (auth.uid() = proveedor_id);

-- Cotizaciones
create table cotizaciones (
  id uuid primary key default gen_random_uuid(),
  trabajo_id uuid not null references solicitudes_trabajo(id) on delete cascade,
  proveedor_id uuid not null references perfiles(id) on delete cascade,
  paquete_id uuid references paquetes_servicio(id),
  descripcion text not null,
  monto numeric(10,2) not null check (monto > 0),
  estado text not null default 'pendiente' check (estado in ('pendiente','aceptada','rechazada','expirada')),
  mensaje_id uuid references mensajes_chat(id),
  aceptada_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_cotizaciones_trabajo on cotizaciones(trabajo_id);
alter table cotizaciones enable row level security;
create policy "Partes ven cotizaciones" on cotizaciones for select using (exists (select 1 from solicitudes_trabajo st where st.id = trabajo_id and (st.cliente_id = auth.uid() or st.proveedor_id = auth.uid())));
create policy "Proveedores crean cotizaciones" on cotizaciones for insert with check (auth.uid() = proveedor_id);
create policy "Partes actualizan cotizaciones" on cotizaciones for update using (exists (select 1 from solicitudes_trabajo st where st.id = trabajo_id and (st.cliente_id = auth.uid() or st.proveedor_id = auth.uid())));

-- Vistas de perfil
create table vistas_perfil (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references perfiles(id) on delete cascade,
  visitante_id uuid references perfiles(id) on delete set null,
  servicio_id uuid references servicios(id) on delete set null,
  fuente text, created_at timestamptz not null default now()
);
create index idx_vistas_proveedor on vistas_perfil(proveedor_id, created_at);
alter table vistas_perfil enable row level security;
create policy "Cualquiera registra vistas" on vistas_perfil for insert with check (true);
create policy "Proveedores ven vistas" on vistas_perfil for select using (auth.uid() = proveedor_id);

-- Métricas mensuales
create table metricas_mensuales (
  id uuid primary key default gen_random_uuid(),
  proveedor_id uuid not null references perfiles(id) on delete cascade,
  mes date not null, solicitudes integer default 0, completados integer default 0,
  cancelados integer default 0, ingresos numeric(10,2) default 0,
  rating_promedio numeric(2,1) default 0, total_resenas integer default 0,
  vistas_perfil integer default 0,
  constraint uq_metrica_mensual unique (proveedor_id, mes)
);
create index idx_metricas_mensuales on metricas_mensuales(proveedor_id, mes);
alter table metricas_mensuales enable row level security;
create policy "Proveedores ven metricas" on metricas_mensuales for select using (auth.uid() = proveedor_id);
