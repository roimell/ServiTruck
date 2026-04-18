-- ============================================================
-- 015: Paquetes como fuente de verdad del "precio cerrado"
-- ============================================================
-- Objetivo: transparencia total de precios (no más "precio por DM").
-- - servicios.precio_desde_paquete: MIN(precio) de paquetes activos
-- - servicios.tiene_paquetes_fijos: bool para badge "Precio cerrado"
-- - Trigger recalcula automáticamente en insert/update/delete de paquetes
-- - buscar_servicios devuelve ambos campos

-- 1) Columnas derivadas
ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS precio_desde_paquete numeric,
  ADD COLUMN IF NOT EXISTS tiene_paquetes_fijos boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_servicios_tiene_paquetes
  ON servicios(tiene_paquetes_fijos) WHERE activo = true;

-- 2) Función recalculadora
CREATE OR REPLACE FUNCTION recalcular_paquetes_servicio(p_servicio_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_min_precio numeric;
  v_count integer;
BEGIN
  SELECT MIN(precio), COUNT(*)
  INTO v_min_precio, v_count
  FROM paquetes_servicio
  WHERE servicio_id = p_servicio_id
    AND activo = true;

  UPDATE servicios
  SET precio_desde_paquete = v_min_precio,
      tiene_paquetes_fijos = (COALESCE(v_count, 0) > 0)
  WHERE id = p_servicio_id;
END;
$$;

-- 3) Trigger: cualquier cambio en paquetes_servicio refresca su servicio
CREATE OR REPLACE FUNCTION trg_paquete_servicio_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalcular_paquetes_servicio(OLD.servicio_id);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.servicio_id <> NEW.servicio_id THEN
    PERFORM recalcular_paquetes_servicio(OLD.servicio_id);
    PERFORM recalcular_paquetes_servicio(NEW.servicio_id);
    RETURN NEW;
  ELSE
    PERFORM recalcular_paquetes_servicio(NEW.servicio_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS paquete_servicio_cambios ON paquetes_servicio;
CREATE TRIGGER paquete_servicio_cambios
  AFTER INSERT OR UPDATE OR DELETE ON paquetes_servicio
  FOR EACH ROW
  EXECUTE FUNCTION trg_paquete_servicio_change();

-- 4) Backfill de servicios existentes
UPDATE servicios s
SET tiene_paquetes_fijos = EXISTS (
      SELECT 1 FROM paquetes_servicio
      WHERE servicio_id = s.id AND activo = true
    ),
    precio_desde_paquete = (
      SELECT MIN(precio) FROM paquetes_servicio
      WHERE servicio_id = s.id AND activo = true
    );

-- 5) buscar_servicios: devolver precio_desde_paquete + tiene_paquetes_fijos
CREATE OR REPLACE FUNCTION buscar_servicios(
  p_query text,
  p_corregimiento text DEFAULT NULL,
  p_categoria_id integer DEFAULT NULL,
  p_limite integer DEFAULT 20,
  p_solo_precio_cerrado boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  titulo text,
  descripcion text,
  precio_base numeric,
  corregimiento text,
  categoria_nombre text,
  proveedor_nombre text,
  proveedor_avatar text,
  rating_promedio numeric,
  total_resenas integer,
  fotos text[],
  relevancia real,
  precio_desde_paquete numeric,
  tiene_paquetes_fijos boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_query_clean text;
  v_like_pattern text;
  v_tsquery tsquery;
  v_count integer;
BEGIN
  v_query_clean := trim(p_query);
  v_like_pattern := '%' || lower(v_query_clean) || '%';

  BEGIN
    v_tsquery := websearch_to_tsquery('spanish', v_query_clean);
  EXCEPTION WHEN OTHERS THEN
    v_tsquery := NULL;
  END;

  IF v_tsquery IS NOT NULL THEN
    RETURN QUERY
      SELECT
        s.id, s.titulo, s.descripcion, s.precio_base, s.corregimiento,
        c.nombre AS categoria_nombre,
        p.nombre AS proveedor_nombre,
        p.avatar_url AS proveedor_avatar,
        s.rating_promedio, s.total_resenas, s.fotos,
        ts_rank(s.busqueda_tsv, v_tsquery) AS relevancia,
        s.precio_desde_paquete, s.tiene_paquetes_fijos
      FROM servicios s
      JOIN perfiles p ON p.id = s.proveedor_id
      LEFT JOIN categorias c ON c.id = s.categoria_id
      WHERE s.activo = true
        AND s.busqueda_tsv @@ v_tsquery
        AND (p_corregimiento IS NULL OR s.corregimiento ILIKE p_corregimiento)
        AND (p_categoria_id IS NULL OR s.categoria_id = p_categoria_id)
        AND (NOT p_solo_precio_cerrado OR s.tiene_paquetes_fijos = true)
      ORDER BY
        s.tiene_paquetes_fijos DESC, -- boost: servicios con precio cerrado arriba
        ts_rank(s.busqueda_tsv, v_tsquery) DESC
      LIMIT p_limite;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN RETURN; END IF;
  END IF;

  RETURN QUERY
    SELECT
      s.id, s.titulo, s.descripcion, s.precio_base, s.corregimiento,
      c.nombre AS categoria_nombre,
      p.nombre AS proveedor_nombre,
      p.avatar_url AS proveedor_avatar,
      s.rating_promedio, s.total_resenas, s.fotos,
      CASE
        WHEN lower(s.titulo) LIKE v_like_pattern THEN 1.0
        WHEN lower(c.nombre) LIKE v_like_pattern THEN 0.8
        WHEN lower(p.nombre) LIKE v_like_pattern THEN 0.6
        WHEN lower(s.descripcion) LIKE v_like_pattern THEN 0.4
        ELSE 0.2
      END::real AS relevancia,
      s.precio_desde_paquete, s.tiene_paquetes_fijos
    FROM servicios s
    JOIN perfiles p ON p.id = s.proveedor_id
    LEFT JOIN categorias c ON c.id = s.categoria_id
    WHERE s.activo = true
      AND (p_corregimiento IS NULL OR s.corregimiento ILIKE p_corregimiento)
      AND (p_categoria_id IS NULL OR s.categoria_id = p_categoria_id)
      AND (NOT p_solo_precio_cerrado OR s.tiene_paquetes_fijos = true)
      AND (
        lower(s.titulo) LIKE v_like_pattern
        OR lower(s.descripcion) LIKE v_like_pattern
        OR lower(c.nombre) LIKE v_like_pattern
        OR lower(p.nombre) LIKE v_like_pattern
      )
    ORDER BY
      s.tiene_paquetes_fijos DESC,
      relevancia DESC,
      s.rating_promedio DESC NULLS LAST
    LIMIT p_limite;
END;
$$;

COMMENT ON FUNCTION buscar_servicios IS
  'Búsqueda con boost para servicios que tienen paquetes de precio fijo (transparencia). Param p_solo_precio_cerrado filtra solo esos.';
