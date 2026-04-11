-- Migración 006: Cron de expiración de solicitudes inactivas
-- Ejecuta expirar_solicitudes_inactivas() todos los días a las 03:00 UTC (~22:00 Panamá)

-- Enable pg_cron para tareas programadas
create extension if not exists pg_cron;

-- Desprogramar job anterior si existe (idempotente)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'expirar-solicitudes-diario') then
    perform cron.unschedule('expirar-solicitudes-diario');
  end if;
end $$;

-- Programar expiración diaria a las 03:00 UTC (~22:00 Panamá)
select cron.schedule(
  'expirar-solicitudes-diario',
  '0 3 * * *',
  $$select public.expirar_solicitudes_inactivas();$$
);
