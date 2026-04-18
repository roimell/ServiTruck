-- Fix: la política RLS de INSERT en mensajes_chat solo permitía estados post-pago.
-- Ahora incluye los estados de negociación donde el chat también está activo.

DROP POLICY IF EXISTS "Partes del trabajo envian mensajes" ON mensajes_chat;

CREATE POLICY "Partes del trabajo envian mensajes"
  ON mensajes_chat FOR INSERT WITH CHECK (
    auth.uid() = autor_id
    AND EXISTS (
      SELECT 1 FROM solicitudes_trabajo st
      WHERE st.id = trabajo_id
        AND (st.cliente_id = auth.uid() OR st.proveedor_id = auth.uid())
        AND st.estado IN ('aceptada','negociando','cotizacion_enviada','pagado_custodia','en_progreso','terminado','disputa')
    )
  );
