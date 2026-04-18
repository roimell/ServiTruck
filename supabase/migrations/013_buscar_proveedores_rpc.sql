-- RPC: buscar_proveedores
-- Returns providers matching a query, with aggregated stats
CREATE OR REPLACE FUNCTION buscar_proveedores(
  p_query      text    DEFAULT '',
  p_categoria_id uuid  DEFAULT NULL,
  p_limite     int     DEFAULT 20
)
RETURNS TABLE (
  id                uuid,
  nombre            text,
  avatar_url        text,
  corregimiento     text,
  bio               text,
  rating_promedio   numeric,
  total_resenas     bigint,
  total_servicios   bigint,
  precio_desde      numeric,
  categorias_nombres text[]
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_query text := lower(trim(p_query));
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nombre::text,
    p.avatar_url::text,
    p.corregimiento::text,
    p.bio::text,
    COALESCE(p.rating_promedio, 0)::numeric,
    COALESCE(p.total_resenas, 0)::bigint,
    COUNT(DISTINCT s.id)::bigint                    AS total_servicios,
    MIN(s.precio)::numeric                          AS precio_desde,
    ARRAY_AGG(DISTINCT c.nombre)
      FILTER (WHERE c.nombre IS NOT NULL)           AS categorias_nombres
  FROM perfiles p
  JOIN servicios s ON s.proveedor_id = p.id AND s.activo = true
  LEFT JOIN categorias c ON c.id = s.categoria_id
  WHERE
    p.es_proveedor = true
    AND (
      v_query = ''
      OR lower(p.nombre)        ILIKE '%' || v_query || '%'
      OR lower(COALESCE(p.bio, ''))         ILIKE '%' || v_query || '%'
      OR lower(COALESCE(p.corregimiento,'')) ILIKE '%' || v_query || '%'
      OR lower(COALESCE(c.nombre,''))       ILIKE '%' || v_query || '%'
      OR lower(s.titulo)                    ILIKE '%' || v_query || '%'
    )
    AND (
      p_categoria_id IS NULL
      OR s.categoria_id = p_categoria_id
    )
  GROUP BY p.id, p.nombre, p.avatar_url, p.corregimiento, p.bio,
           p.rating_promedio, p.total_resenas
  ORDER BY
    COALESCE(p.rating_promedio, 0) DESC,
    COUNT(DISTINCT s.id) DESC
  LIMIT p_limite;
END;
$$;

GRANT EXECUTE ON FUNCTION buscar_proveedores(text, uuid, int) TO anon, authenticated;

-- RPC: top_queries_busqueda
-- Returns most frequent non-empty search queries
CREATE OR REPLACE FUNCTION top_queries_busqueda(p_limite int DEFAULT 10)
RETURNS TABLE (query text, total bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT
    lower(trim(termino)) AS query,
    COUNT(*)             AS total
  FROM eventos_busqueda
  WHERE termino IS NOT NULL
    AND trim(termino) <> ''
    AND length(trim(termino)) > 2
  GROUP BY lower(trim(termino))
  ORDER BY total DESC
  LIMIT p_limite;
$$;

GRANT EXECUTE ON FUNCTION top_queries_busqueda(int) TO anon, authenticated;
