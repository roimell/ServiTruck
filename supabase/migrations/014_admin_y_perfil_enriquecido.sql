-- 014: Admin role, manual verification, enriched profile schema

-- ================================
-- 1. ADMIN ROLE + VERIFIED FIELDS
-- ================================

ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS es_admin            boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificado          boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificado_at       timestamptz,
  ADD COLUMN IF NOT EXISTS verificado_por      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nota_verificacion   text,
  ADD COLUMN IF NOT EXISTS activo              boolean      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS desactivado_at      timestamptz,
  ADD COLUMN IF NOT EXISTS desactivado_motivo  text;

-- ================================
-- 2. ENRICHED PROFILE FIELDS
-- ================================

ALTER TABLE perfiles
  ADD COLUMN IF NOT EXISTS nombre_comercial      text,
  ADD COLUMN IF NOT EXISTS whatsapp              text,
  ADD COLUMN IF NOT EXISTS email_contacto        text,
  ADD COLUMN IF NOT EXISTS sitio_web             text,
  ADD COLUMN IF NOT EXISTS instagram             text,
  ADD COLUMN IF NOT EXISTS facebook              text,
  ADD COLUMN IF NOT EXISTS tiktok                text,
  ADD COLUMN IF NOT EXISTS anos_experiencia      int,
  ADD COLUMN IF NOT EXISTS certificaciones       text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS idiomas               text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ruc                   text,
  ADD COLUMN IF NOT EXISTS area_cobertura        text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS horario_atencion      jsonb,
  ADD COLUMN IF NOT EXISTS portafolio_urls       text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS documento_identidad_url text,
  ADD COLUMN IF NOT EXISTS documento_identidad_tipo text,
  ADD COLUMN IF NOT EXISTS identificacion_verificada boolean NOT NULL DEFAULT false;

-- Index for admin filtering
CREATE INDEX IF NOT EXISTS idx_perfiles_es_admin   ON perfiles(es_admin) WHERE es_admin = true;
CREATE INDEX IF NOT EXISTS idx_perfiles_verificado ON perfiles(verificado) WHERE verificado = true;
CREATE INDEX IF NOT EXISTS idx_perfiles_activo     ON perfiles(activo);

-- ================================
-- 3. ADMIN HELPER FUNCTION
-- ================================

CREATE OR REPLACE FUNCTION es_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT es_admin FROM perfiles WHERE id = p_user_id),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION es_admin(uuid) TO authenticated;

-- ================================
-- 4. RLS — admins bypass
-- ================================

-- Perfiles: admins can update verificado/activo fields for any row
DROP POLICY IF EXISTS "Admin puede actualizar perfiles" ON perfiles;
CREATE POLICY "Admin puede actualizar perfiles" ON perfiles
  FOR UPDATE
  USING (es_admin(auth.uid()))
  WITH CHECK (es_admin(auth.uid()));

-- Servicios: admins can update/delete any service (desactivar / borrar)
DROP POLICY IF EXISTS "Admin puede actualizar servicios" ON servicios;
CREATE POLICY "Admin puede actualizar servicios" ON servicios
  FOR UPDATE
  USING (es_admin(auth.uid()))
  WITH CHECK (es_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin puede eliminar servicios" ON servicios;
CREATE POLICY "Admin puede eliminar servicios" ON servicios
  FOR DELETE
  USING (es_admin(auth.uid()));

-- ================================
-- 5. ADMIN RPCS
-- ================================

-- Verify a provider (admin only)
CREATE OR REPLACE FUNCTION admin_verificar_proveedor(
  p_perfil_id uuid,
  p_nota      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin puede verificar proveedores';
  END IF;

  UPDATE perfiles
  SET verificado        = true,
      verificado_at     = NOW(),
      verificado_por    = auth.uid(),
      nota_verificacion = p_nota,
      updated_at        = NOW()
  WHERE id = p_perfil_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_verificar_proveedor(uuid, text) TO authenticated;

-- Remove verification (admin only)
CREATE OR REPLACE FUNCTION admin_quitar_verificacion(
  p_perfil_id uuid,
  p_motivo    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin puede quitar verificación';
  END IF;

  UPDATE perfiles
  SET verificado        = false,
      verificado_at     = NULL,
      verificado_por    = NULL,
      nota_verificacion = p_motivo,
      updated_at        = NOW()
  WHERE id = p_perfil_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_quitar_verificacion(uuid, text) TO authenticated;

-- Deactivate a profile (admin only)
CREATE OR REPLACE FUNCTION admin_desactivar_perfil(
  p_perfil_id uuid,
  p_motivo    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin puede desactivar perfiles';
  END IF;

  UPDATE perfiles
  SET activo             = false,
      desactivado_at     = NOW(),
      desactivado_motivo = p_motivo,
      updated_at         = NOW()
  WHERE id = p_perfil_id;

  -- Also deactivate all services
  UPDATE servicios SET activo = false WHERE proveedor_id = p_perfil_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_desactivar_perfil(uuid, text) TO authenticated;

-- Reactivate a profile (admin only)
CREATE OR REPLACE FUNCTION admin_reactivar_perfil(p_perfil_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin puede reactivar perfiles';
  END IF;

  UPDATE perfiles
  SET activo             = true,
      desactivado_at     = NULL,
      desactivado_motivo = NULL,
      updated_at         = NOW()
  WHERE id = p_perfil_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reactivar_perfil(uuid) TO authenticated;

-- Delete / deactivate a service (admin only)
CREATE OR REPLACE FUNCTION admin_desactivar_servicio(
  p_servicio_id uuid,
  p_motivo      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin puede desactivar servicios';
  END IF;

  UPDATE servicios SET activo = false WHERE id = p_servicio_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_desactivar_servicio(uuid, text) TO authenticated;

-- Admin list: all providers with verification + activity status
CREATE OR REPLACE FUNCTION admin_listar_proveedores()
RETURNS TABLE (
  id                 uuid,
  nombre             text,
  nombre_comercial   text,
  avatar_url         text,
  telefono           text,
  whatsapp           text,
  corregimiento      text,
  es_proveedor       boolean,
  verificado         boolean,
  verificado_at      timestamptz,
  activo             boolean,
  desactivado_motivo text,
  ruc                text,
  anos_experiencia   int,
  total_servicios    bigint,
  rating_promedio    numeric,
  total_resenas      bigint,
  created_at         timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.nombre::text,
    p.nombre_comercial::text,
    p.avatar_url::text,
    p.telefono::text,
    p.whatsapp::text,
    p.corregimiento::text,
    p.es_proveedor,
    p.verificado,
    p.verificado_at,
    p.activo,
    p.desactivado_motivo::text,
    p.ruc::text,
    p.anos_experiencia,
    (SELECT COUNT(*) FROM servicios s WHERE s.proveedor_id = p.id)::bigint,
    COALESCE(p.rating_promedio, 0)::numeric,
    COALESCE(p.total_resenas, 0)::bigint,
    p.created_at
  FROM perfiles p
  ORDER BY p.verificado ASC, p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_listar_proveedores() TO authenticated;

-- Admin list: services with provider info for moderation
CREATE OR REPLACE FUNCTION admin_listar_servicios(p_solo_activos boolean DEFAULT NULL)
RETURNS TABLE (
  id                uuid,
  titulo            text,
  descripcion       text,
  precio_base       numeric,
  categoria         text,
  corregimiento     text,
  activo            boolean,
  fotos             text[],
  proveedor_id      uuid,
  proveedor_nombre  text,
  proveedor_verificado boolean,
  rating_promedio   numeric,
  total_resenas     bigint,
  created_at        timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.titulo::text,
    s.descripcion::text,
    s.precio_base::numeric,
    s.categoria::text,
    s.corregimiento::text,
    s.activo,
    s.fotos,
    s.proveedor_id,
    p.nombre::text,
    p.verificado,
    COALESCE(s.rating_promedio, 0)::numeric,
    COALESCE(s.total_resenas, 0)::bigint,
    s.created_at
  FROM servicios s
  LEFT JOIN perfiles p ON p.id = s.proveedor_id
  WHERE (p_solo_activos IS NULL OR s.activo = p_solo_activos)
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_listar_servicios(boolean) TO authenticated;
