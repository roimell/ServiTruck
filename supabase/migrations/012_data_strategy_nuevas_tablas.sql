-- ============================================================
-- Estrategia de datos (recomendación Opus)
-- 3 tablas prioritarias para captura de datos de calidad
-- ============================================================

-- 1. Sesiones de usuario
CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid REFERENCES auth.users ON DELETE SET NULL,
  anon_id       text,
  referrer      text,
  utm           jsonb,
  dispositivo   text,
  corregimiento_inferido text,
  inicio        timestamptz NOT NULL DEFAULT now(),
  ultimo_evento timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sesiones_usuario ON sesiones_usuario(usuario_id, inicio DESC);
CREATE INDEX idx_sesiones_anon    ON sesiones_usuario(anon_id, inicio DESC);

ALTER TABLE sesiones_usuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Propio acceso sesiones" ON sesiones_usuario
  FOR ALL USING (auth.uid() = usuario_id);
CREATE POLICY "Insert sesiones anon" ON sesiones_usuario
  FOR INSERT WITH CHECK (true);

ALTER TABLE eventos_busqueda
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sesiones_usuario(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resultados_mostrados int,
  ADD COLUMN IF NOT EXISTS tuvo_resultados boolean,
  ADD COLUMN IF NOT EXISTS filtros_aplicados jsonb;

ALTER TABLE vistas_perfil
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES sesiones_usuario(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duracion_segundos int,
  ADD COLUMN IF NOT EXISTS origen text CHECK (origen IN ('busqueda','categoria','directo','chat','referido'));

-- 2. Intentos de contacto
CREATE TABLE IF NOT EXISTS intentos_contacto (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              uuid REFERENCES sesiones_usuario(id) ON DELETE SET NULL,
  usuario_id              uuid REFERENCES auth.users ON DELETE SET NULL,
  proveedor_id            uuid NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
  servicio_id             uuid REFERENCES servicios(id) ON DELETE SET NULL,
  duracion_vista_segundos int,
  inicio_chat             boolean NOT NULL DEFAULT false,
  razon_abandono          text,
  dispositivo             text,
  created_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_intentos_proveedor ON intentos_contacto(proveedor_id, created_at DESC);
CREATE INDEX idx_intentos_servicio  ON intentos_contacto(servicio_id, created_at DESC);

ALTER TABLE intentos_contacto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proveedor ve sus intentos" ON intentos_contacto
  FOR SELECT USING (auth.uid() = proveedor_id);
CREATE POLICY "Insert intentos" ON intentos_contacto
  FOR INSERT WITH CHECK (true);

-- 3. Mercado de precios
CREATE TABLE IF NOT EXISTS precios_mercado (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id int REFERENCES categorias(id) ON DELETE SET NULL,
  corregimiento text NOT NULL,
  monto_pab    numeric(10,2) NOT NULL CHECK (monto_pab > 0),
  fuente       text NOT NULL CHECK (fuente IN ('solicitud','encuesta_post','cotizacion_chat')),
  solicitud_id uuid REFERENCES solicitudes_trabajo(id) ON DELETE SET NULL,
  duracion_horas numeric(5,2),
  urgencia     text CHECK (urgencia IN ('hoy','esta_semana','flexible')),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_precios_cat_zona ON precios_mercado(categoria_id, corregimiento, created_at DESC);

ALTER TABLE precios_mercado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura precios" ON precios_mercado FOR SELECT USING (true);
CREATE POLICY "Insert precios service" ON precios_mercado
  FOR INSERT WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- 4. Mejoras solicitudes_trabajo
ALTER TABLE solicitudes_trabajo
  ADD COLUMN IF NOT EXISTS timestamps_estados jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion text CHECK (
    motivo_cancelacion IN ('no_respondio','precio_alto','encontro_otro','emergencia_resuelta','otro')
  ),
  ADD COLUMN IF NOT EXISTS urgencia text CHECK (urgencia IN ('hoy','esta_semana','flexible'));

ALTER TABLE eventos_busqueda
  ADD COLUMN IF NOT EXISTS urgencia text CHECK (urgencia IN ('hoy','esta_semana','flexible'));
