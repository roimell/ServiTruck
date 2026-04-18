-- 017: Admin dashboard resumen + gestión usuarios general

-- ========================================
-- 1. ADMIN RESUMEN DASHBOARD
-- ========================================
-- KPIs con deltas (esta semana vs semana pasada) + alertas + top categorías + serie 14 días

CREATE OR REPLACE FUNCTION admin_resumen_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_now timestamptz := now();
  v_hace_7 timestamptz := v_now - interval '7 days';
  v_hace_14 timestamptz := v_now - interval '14 days';
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  SELECT jsonb_build_object(
    -- KPIs principales
    'kpis', jsonb_build_object(
      'usuarios_total', (SELECT COUNT(*) FROM perfiles),
      'usuarios_nuevos_7d', (SELECT COUNT(*) FROM perfiles WHERE created_at >= v_hace_7),
      'usuarios_nuevos_prev_7d', (SELECT COUNT(*) FROM perfiles WHERE created_at >= v_hace_14 AND created_at < v_hace_7),
      'proveedores_total', (SELECT COUNT(*) FROM perfiles WHERE es_proveedor = true AND activo = true),
      'proveedores_verificados', (SELECT COUNT(*) FROM perfiles WHERE verificado = true AND activo = true),
      'servicios_activos', (SELECT COUNT(*) FROM servicios WHERE activo = true),
      'servicios_nuevos_7d', (SELECT COUNT(*) FROM servicios WHERE created_at >= v_hace_7),
      'trabajos_total', (SELECT COUNT(*) FROM solicitudes_trabajo),
      'trabajos_nuevos_7d', (SELECT COUNT(*) FROM solicitudes_trabajo WHERE created_at >= v_hace_7),
      'trabajos_nuevos_prev_7d', (SELECT COUNT(*) FROM solicitudes_trabajo WHERE created_at >= v_hace_14 AND created_at < v_hace_7),
      'busquedas_7d', (SELECT COUNT(*) FROM eventos_busqueda WHERE created_at >= v_hace_7),
      'busquedas_prev_7d', (SELECT COUNT(*) FROM eventos_busqueda WHERE created_at >= v_hace_14 AND created_at < v_hace_7)
    ),

    -- Alertas accionables
    'alertas', jsonb_build_object(
      'verificaciones_pendientes', (
        SELECT COUNT(*) FROM perfiles
        WHERE es_proveedor = true AND verificado = false AND activo = true
      ),
      'feedback_pendiente', (
        SELECT COUNT(*) FROM feedback_usuarios WHERE resuelto = false
      ),
      'trabajos_atascados', (
        SELECT COUNT(*) FROM solicitudes_trabajo
        WHERE estado IN ('pendiente', 'pagado_custodia', 'en_progreso', 'terminado')
          AND updated_at < v_now - interval '48 hours'
      ),
      'servicios_sin_paquetes', (
        SELECT COUNT(*) FROM servicios
        WHERE activo = true AND tiene_paquetes_fijos = false
      )
    ),

    -- Top 5 categorías por cantidad de servicios activos
    'top_categorias', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.total DESC), '[]'::jsonb)
      FROM (
        SELECT c.nombre, c.icono, COUNT(s.id) AS total
        FROM categorias c
        LEFT JOIN servicios s ON s.categoria_id = c.id AND s.activo = true
        GROUP BY c.id, c.nombre, c.icono
        HAVING COUNT(s.id) > 0
        ORDER BY total DESC
        LIMIT 5
      ) x
    ),

    -- Top 5 corregimientos por cantidad de servicios
    'top_corregimientos', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.total DESC), '[]'::jsonb)
      FROM (
        SELECT corregimiento, COUNT(*) AS total
        FROM servicios
        WHERE activo = true AND corregimiento IS NOT NULL
        GROUP BY corregimiento
        ORDER BY total DESC
        LIMIT 5
      ) x
    ),

    -- Serie de últimos 14 días (signups + búsquedas por día)
    'serie_14d', (
      SELECT COALESCE(jsonb_agg(d ORDER BY d.fecha), '[]'::jsonb)
      FROM (
        SELECT
          to_char(gs.dia::date, 'YYYY-MM-DD') AS fecha,
          (SELECT COUNT(*) FROM perfiles p
            WHERE p.created_at::date = gs.dia::date) AS usuarios,
          (SELECT COUNT(*) FROM eventos_busqueda e
            WHERE e.created_at::date = gs.dia::date) AS busquedas,
          (SELECT COUNT(*) FROM solicitudes_trabajo t
            WHERE t.created_at::date = gs.dia::date) AS trabajos
        FROM generate_series(
          (v_now - interval '13 days')::date,
          v_now::date,
          '1 day'::interval
        ) gs(dia)
      ) d
    ),

    -- Top 5 proveedores por rating con trabajos
    'top_proveedores', (
      SELECT COALESCE(jsonb_agg(x ORDER BY x.rating DESC, x.total_trabajos DESC), '[]'::jsonb)
      FROM (
        SELECT
          p.id,
          p.nombre,
          p.avatar_url,
          p.rating_promedio AS rating,
          p.total_resenas,
          (SELECT COUNT(*) FROM solicitudes_trabajo t WHERE t.proveedor_id = p.id) AS total_trabajos
        FROM perfiles p
        WHERE p.es_proveedor = true AND p.verificado = true AND p.activo = true
          AND p.total_resenas > 0
        ORDER BY p.rating_promedio DESC, p.total_resenas DESC
        LIMIT 5
      ) x
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_resumen_dashboard() TO authenticated;

-- ========================================
-- 2. ADMIN LISTAR USUARIOS (todos)
-- ========================================

CREATE OR REPLACE FUNCTION admin_listar_usuarios(
  p_tipo text DEFAULT NULL,  -- 'todos' | 'clientes' | 'proveedores' | 'admins' | 'desactivados'
  p_busqueda text DEFAULT NULL,
  p_limite int DEFAULT 200
)
RETURNS TABLE (
  id               uuid,
  nombre           text,
  email            text,
  telefono         text,
  avatar_url       text,
  corregimiento    text,
  es_proveedor     boolean,
  es_admin         boolean,
  verificado       boolean,
  activo           boolean,
  desactivado_motivo text,
  total_servicios  bigint,
  total_trabajos_como_cliente   bigint,
  total_trabajos_como_proveedor bigint,
  rating_promedio  numeric,
  total_resenas    bigint,
  last_sign_in_at  timestamptz,
  created_at       timestamptz
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
    u.email::text,
    p.telefono::text,
    p.avatar_url::text,
    p.corregimiento::text,
    p.es_proveedor,
    p.es_admin,
    p.verificado,
    p.activo,
    p.desactivado_motivo::text,
    (SELECT COUNT(*) FROM servicios s WHERE s.proveedor_id = p.id)::bigint,
    (SELECT COUNT(*) FROM solicitudes_trabajo t WHERE t.cliente_id = p.id)::bigint,
    (SELECT COUNT(*) FROM solicitudes_trabajo t WHERE t.proveedor_id = p.id)::bigint,
    COALESCE(p.rating_promedio, 0)::numeric,
    COALESCE(p.total_resenas, 0)::bigint,
    u.last_sign_in_at,
    p.created_at
  FROM perfiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE
    CASE
      WHEN p_tipo = 'clientes' THEN p.es_proveedor = false
      WHEN p_tipo = 'proveedores' THEN p.es_proveedor = true
      WHEN p_tipo = 'admins' THEN p.es_admin = true
      WHEN p_tipo = 'desactivados' THEN p.activo = false
      ELSE true
    END
    AND (
      p_busqueda IS NULL OR p_busqueda = ''
      OR p.nombre ILIKE '%' || p_busqueda || '%'
      OR u.email ILIKE '%' || p_busqueda || '%'
      OR p.telefono ILIKE '%' || p_busqueda || '%'
      OR p.corregimiento ILIKE '%' || p_busqueda || '%'
    )
  ORDER BY p.created_at DESC
  LIMIT p_limite;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_listar_usuarios(text, text, int) TO authenticated;

-- ========================================
-- 3. ADMIN PROMOVER/DEGRADAR ADMIN
-- ========================================

CREATE OR REPLACE FUNCTION admin_toggle_admin(p_perfil_id uuid, p_hacer_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo admin';
  END IF;

  -- Protección: no degradarte a ti mismo (evita perder acceso)
  IF p_perfil_id = auth.uid() AND p_hacer_admin = false THEN
    RAISE EXCEPTION 'No puedes quitarte admin a ti mismo';
  END IF;

  UPDATE perfiles SET es_admin = p_hacer_admin WHERE id = p_perfil_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_toggle_admin(uuid, boolean) TO authenticated;
