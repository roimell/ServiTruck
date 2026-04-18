-- Búsqueda mejorada: FTS + ILIKE fallback + búsqueda en categoría y proveedor
CREATE OR REPLACE FUNCTION buscar_servicios(
  p_query text,
  p_corregimiento text DEFAULT NULL,
  p_categoria_id integer DEFAULT NULL,
  p_limite integer DEFAULT 20
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
  relevancia real
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

  -- 1) Intentar FTS primero (más preciso)
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
        ts_rank(s.busqueda_tsv, v_tsquery) AS relevancia
      FROM servicios s
      JOIN perfiles p ON p.id = s.proveedor_id
      LEFT JOIN categorias c ON c.id = s.categoria_id
      WHERE s.activo = true
        AND s.busqueda_tsv @@ v_tsquery
        AND (p_corregimiento IS NULL OR s.corregimiento ILIKE p_corregimiento)
        AND (p_categoria_id IS NULL OR s.categoria_id = p_categoria_id)
      ORDER BY relevancia DESC
      LIMIT p_limite;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN RETURN; END IF;
  END IF;

  -- 2) Fallback: ILIKE en título, descripción, categoría, proveedor
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
      END::real AS relevancia
    FROM servicios s
    JOIN perfiles p ON p.id = s.proveedor_id
    LEFT JOIN categorias c ON c.id = s.categoria_id
    WHERE s.activo = true
      AND (p_corregimiento IS NULL OR s.corregimiento ILIKE p_corregimiento)
      AND (p_categoria_id IS NULL OR s.categoria_id = p_categoria_id)
      AND (
        lower(s.titulo) LIKE v_like_pattern
        OR lower(s.descripcion) LIKE v_like_pattern
        OR lower(c.nombre) LIKE v_like_pattern
        OR lower(p.nombre) LIKE v_like_pattern
      )
    ORDER BY relevancia DESC, s.rating_promedio DESC NULLS LAST
    LIMIT p_limite;
END;
$$;
