-- Tabla de feedback público (NPS + opiniones)
CREATE TABLE IF NOT EXISTS feedback_usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('idea', 'bug', 'pregunta', 'queja', 'elogio', 'otro')),
  mensaje text NOT NULL CHECK (char_length(mensaje) >= 5 AND char_length(mensaje) <= 2000),
  email text,
  nombre text,
  nps integer CHECK (nps >= 0 AND nps <= 10),
  usuario_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dispositivo text,
  user_agent text,
  resuelto boolean NOT NULL DEFAULT false,
  nota_admin text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_tipo ON feedback_usuarios(tipo);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_usuarios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_resuelto ON feedback_usuarios(resuelto) WHERE resuelto = false;

ALTER TABLE feedback_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_insert_feedback" ON feedback_usuarios
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admin_select_feedback" ON feedback_usuarios
  FOR SELECT TO authenticated
  USING (es_admin(auth.uid()));

CREATE POLICY "admin_update_feedback" ON feedback_usuarios
  FOR UPDATE TO authenticated
  USING (es_admin(auth.uid()))
  WITH CHECK (es_admin(auth.uid()));

CREATE OR REPLACE FUNCTION admin_listar_feedback(
  p_tipo text DEFAULT NULL,
  p_solo_pendientes boolean DEFAULT false,
  p_limite integer DEFAULT 100
)
RETURNS SETOF feedback_usuarios
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
    SELECT *
    FROM feedback_usuarios
    WHERE (p_tipo IS NULL OR tipo = p_tipo)
      AND (NOT p_solo_pendientes OR resuelto = false)
    ORDER BY created_at DESC
    LIMIT p_limite;
END;
$$;
