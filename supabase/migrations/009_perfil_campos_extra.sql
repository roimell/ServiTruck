-- Campos adicionales para perfiles más completos
ALTER TABLE public.perfiles
  ADD COLUMN IF NOT EXISTS telefono_verificado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fecha_nacimiento date,
  ADD COLUMN IF NOT EXISTS cedula text,
  ADD COLUMN IF NOT EXISTS bio text;
