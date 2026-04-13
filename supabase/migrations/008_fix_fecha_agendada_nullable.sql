-- Fix: fecha_agendada debe ser nullable
-- En el nuevo flujo la fecha se acuerda en el chat, no al crear la solicitud
ALTER TABLE public.solicitudes_trabajo ALTER COLUMN fecha_agendada DROP NOT NULL;
