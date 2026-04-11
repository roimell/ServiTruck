-- ============================================================
-- Triggers y RPCs para el nuevo flujo de negociación
-- (aplicado previamente vía MCP, guardado localmente)
-- ============================================================

-- Actualizar trigger de transiciones para nuevos estados
create or replace function validar_transicion_estado()
returns trigger as $$
declare
  transiciones_validas text[];
begin
  if OLD.estado = NEW.estado then return NEW; end if;

  transiciones_validas := case OLD.estado
    when 'solicitud_enviada' then array['aceptada','rechazada','expirada']
    when 'aceptada'          then array['negociando','cancelado','expirada']
    when 'negociando'        then array['cotizacion_enviada','cancelado','expirada']
    when 'cotizacion_enviada' then array['pagado_custodia','negociando','cancelado','expirada']
    when 'pendiente'         then array['pagado_custodia','cancelado']
    when 'pagado_custodia'   then array['en_progreso','cancelado','disputa']
    when 'en_progreso'       then array['terminado','disputa']
    when 'terminado'         then array['completado_fondos_liberados','disputa']
    when 'disputa'           then array['completado_fondos_liberados','cancelado']
    else array[]::text[]
  end;

  if NEW.estado = any(transiciones_validas) then
    -- Timestamps automáticos
    if NEW.estado = 'pagado_custodia' then
      NEW.pago_custodia_at := now();
    elsif NEW.estado = 'completado_fondos_liberados' then
      NEW.fondos_liberados_at := now();
    elsif NEW.estado = 'expirada' then
      NEW.expirado_at := now();
    end if;

    -- Registrar en historial
    insert into historial_estados (trabajo_id, estado_anterior, estado_nuevo, cambiado_por)
    values (NEW.id, OLD.estado, NEW.estado, auth.uid());

    return NEW;
  end if;

  raise exception 'Transición no permitida: % → %', OLD.estado, NEW.estado;
end;
$$ language plpgsql security definer;

-- Actualizar validación de mensajes para nuevos estados de chat activo
create or replace function validar_mensaje_chat()
returns trigger as $$
declare
  v_estado text;
  v_cliente_id uuid;
  v_proveedor_id uuid;
begin
  select estado, cliente_id, proveedor_id
  into v_estado, v_cliente_id, v_proveedor_id
  from solicitudes_trabajo where id = NEW.trabajo_id;

  if v_estado is null then
    raise exception 'Trabajo no encontrado';
  end if;

  if v_estado not in ('aceptada','negociando','cotizacion_enviada','pagado_custodia','en_progreso','terminado','disputa') then
    raise exception 'Chat no disponible en estado: %', v_estado;
  end if;

  if NEW.autor_id not in (v_cliente_id, v_proveedor_id) then
    raise exception 'No eres parte de este trabajo';
  end if;

  return NEW;
end;
$$ language plpgsql security definer;

-- Bloquear agenda automáticamente tras pago
create or replace function bloquear_agenda_tras_pago()
returns trigger as $$
begin
  if NEW.estado = 'pagado_custodia' and OLD.estado != 'pagado_custodia' and NEW.fecha_agendada is not null then
    insert into bloqueos_agenda (proveedor_id, fecha, hora_inicio, hora_fin, trabajo_id)
    values (
      NEW.proveedor_id,
      NEW.fecha_agendada::date,
      NEW.fecha_agendada::time,
      (NEW.fecha_agendada + interval '2 hours')::time,
      NEW.id
    )
    on conflict do nothing;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_bloquear_agenda on solicitudes_trabajo;
create trigger trg_bloquear_agenda
  after update on solicitudes_trabajo
  for each row execute function bloquear_agenda_tras_pago();

-- RPC: Expirar solicitudes inactivas (>15 días sin actividad)
create or replace function expirar_solicitudes_inactivas()
returns integer as $$
declare
  cantidad integer;
begin
  with expiradas as (
    update solicitudes_trabajo
    set estado = 'expirada', expirado_at = now()
    where estado in ('solicitud_enviada','aceptada','negociando','cotizacion_enviada')
      and updated_at < now() - interval '15 days'
    returning id
  )
  select count(*) into cantidad from expiradas;
  return cantidad;
end;
$$ language plpgsql security definer;

-- RPC: Métricas del proveedor (12 KPIs)
create or replace function mis_metricas_proveedor()
returns json as $$
declare
  v_uid uuid := auth.uid();
  resultado json;
begin
  select json_build_object(
    'total_solicitudes', (select count(*) from solicitudes_trabajo where proveedor_id = v_uid),
    'trabajos_completados', (select count(*) from solicitudes_trabajo where proveedor_id = v_uid and estado = 'completado_fondos_liberados'),
    'trabajos_activos', (select count(*) from solicitudes_trabajo where proveedor_id = v_uid and estado in ('aceptada','negociando','cotizacion_enviada','pagado_custodia','en_progreso')),
    'tasa_conversion', (
      select case when count(*) = 0 then 0
        else round(count(*) filter (where estado = 'completado_fondos_liberados')::numeric / count(*)::numeric * 100, 1)
      end from solicitudes_trabajo where proveedor_id = v_uid
    ),
    'tasa_aceptacion', (
      select case when count(*) = 0 then 0
        else round(count(*) filter (where estado not in ('rechazada','expirada'))::numeric / count(*)::numeric * 100, 1)
      end from solicitudes_trabajo where proveedor_id = v_uid
    ),
    'ingresos_totales', coalesce((select sum(monto_proveedor) from solicitudes_trabajo where proveedor_id = v_uid and estado = 'completado_fondos_liberados'), 0),
    'ingresos_este_mes', coalesce((select sum(monto_proveedor) from solicitudes_trabajo where proveedor_id = v_uid and estado = 'completado_fondos_liberados' and fondos_liberados_at >= date_trunc('month', now())), 0),
    'ticket_promedio', coalesce((select round(avg(monto_total)::numeric, 2) from solicitudes_trabajo where proveedor_id = v_uid and estado = 'completado_fondos_liberados'), 0),
    'rating_promedio', coalesce((select round(avg(rating_promedio)::numeric, 1) from servicios where proveedor_id = v_uid), 0),
    'total_resenas', coalesce((select sum(total_resenas) from servicios where proveedor_id = v_uid), 0),
    'vistas_ultimos_30_dias', (select count(*) from vistas_perfil where proveedor_id = v_uid and created_at >= now() - interval '30 days'),
    'solicitudes_este_mes', (select count(*) from solicitudes_trabajo where proveedor_id = v_uid and created_at >= date_trunc('month', now()))
  ) into resultado;

  return resultado;
end;
$$ language plpgsql security definer;

-- RPC: Ingresos por mes (últimos 6 meses)
create or replace function mis_ingresos_por_mes()
returns json as $$
declare
  v_uid uuid := auth.uid();
begin
  return (
    select json_agg(row_to_json(t)) from (
      select
        to_char(date_trunc('month', fondos_liberados_at), 'YYYY-MM') as mes,
        sum(monto_proveedor)::numeric as ingresos,
        count(*)::integer as trabajos
      from solicitudes_trabajo
      where proveedor_id = v_uid
        and estado = 'completado_fondos_liberados'
        and fondos_liberados_at >= date_trunc('month', now()) - interval '5 months'
      group by date_trunc('month', fondos_liberados_at)
      order by mes
    ) t
  );
end;
$$ language plpgsql security definer;

-- Actualizar RLS de solicitudes_trabajo para nuevos estados
drop policy if exists "Clientes ven solicitudes" on solicitudes_trabajo;
create policy "Clientes ven solicitudes" on solicitudes_trabajo
  for select using (auth.uid() = cliente_id or auth.uid() = proveedor_id);

drop policy if exists "Clientes crean solicitudes" on solicitudes_trabajo;
create policy "Clientes crean solicitudes" on solicitudes_trabajo
  for insert with check (auth.uid() = cliente_id);

drop policy if exists "Partes actualizan solicitudes" on solicitudes_trabajo;
create policy "Partes actualizan solicitudes" on solicitudes_trabajo
  for update using (auth.uid() = cliente_id or auth.uid() = proveedor_id);
