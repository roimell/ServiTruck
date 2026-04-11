-- Paso 1: Agregar nuevos valores al enum (debe ser transacción separada)
alter type estado_trabajo add value if not exists 'solicitud_enviada' before 'pendiente';
alter type estado_trabajo add value if not exists 'aceptada' after 'solicitud_enviada';
alter type estado_trabajo add value if not exists 'negociando' after 'aceptada';
alter type estado_trabajo add value if not exists 'cotizacion_enviada' after 'negociando';
alter type estado_trabajo add value if not exists 'rechazada' after 'disputa';
alter type estado_trabajo add value if not exists 'expirada' after 'rechazada';
