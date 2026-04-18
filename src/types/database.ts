// ============================================================
// ServiTrust Panamá — Tipos TypeScript
// ============================================================

export type EstadoTrabajo =
  | 'solicitud_enviada'
  | 'aceptada'
  | 'negociando'
  | 'cotizacion_enviada'
  | 'pendiente'
  | 'pagado_custodia'
  | 'en_progreso'
  | 'terminado'
  | 'completado_fondos_liberados'
  | 'cancelado'
  | 'disputa'
  | 'rechazada'
  | 'expirada';

export type EstadoCotizacion = 'pendiente' | 'aceptada' | 'rechazada' | 'expirada';

export type CanalNotificacion = 'email' | 'push' | 'whatsapp';

export type TipoNotificacion =
  | 'nueva_solicitud'
  | 'pago_confirmado'
  | 'trabajo_iniciado'
  | 'trabajo_terminado'
  | 'fondos_liberados'
  | 'nueva_resena'
  | 'recordatorio_cita';

// ============================================================
// Tablas principales
// ============================================================

export interface Categoria {
  id: number;
  slug: string;
  nombre: string;
  icono: string | null;
}

export interface Perfil {
  id: string;
  nombre: string;
  telefono: string | null;
  avatar_url: string | null;
  es_proveedor: boolean;
  corregimiento: string | null;
  // migration 009
  telefono_verificado?: boolean;
  fecha_nacimiento?: string | null;
  cedula?: string | null;
  bio?: string | null;
  // migration 014 — admin + verificación
  es_admin?: boolean;
  verificado?: boolean;
  verificado_at?: string | null;
  verificado_por?: string | null;
  nota_verificacion?: string | null;
  activo?: boolean;
  desactivado_at?: string | null;
  desactivado_motivo?: string | null;
  // migration 014 — perfil enriquecido
  nombre_comercial?: string | null;
  whatsapp?: string | null;
  email_contacto?: string | null;
  sitio_web?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  tiktok?: string | null;
  anos_experiencia?: number | null;
  certificaciones?: string[];
  idiomas?: string[];
  ruc?: string | null;
  area_cobertura?: string[];
  horario_atencion?: Record<string, unknown> | null;
  portafolio_urls?: string[];
  documento_identidad_url?: string | null;
  documento_identidad_tipo?: string | null;
  identificacion_verificada?: boolean;
  // aggregated stats
  rating_promedio?: number;
  total_resenas?: number;
  created_at: string;
  updated_at: string;
}

export interface Servicio {
  id: string;
  proveedor_id: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  categoria_id: number | null;
  precio_base: number;
  corregimiento: string;
  activo: boolean;
  rating_promedio: number;
  total_resenas: number;
  fotos: string[];
  created_at: string;
  updated_at: string;
}

export interface PaqueteServicio {
  id: string;
  servicio_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  orden: number;
  activo: boolean;
  created_at: string;
}

export interface SolicitudTrabajo {
  id: string;
  cliente_id: string;
  servicio_id: string;
  proveedor_id: string;
  estado: EstadoTrabajo;
  fecha_agendada: string | null;
  notas_cliente: string | null;
  descripcion_cliente: string | null;
  fotos_cliente: string[];
  paquete_id: string | null;
  monto_total: number | null;
  comision_porcentaje: number;
  comision_monto: number | null;
  monto_proveedor: number | null;
  checkout_session_id: string | null;
  pago_custodia_at: string | null;
  fondos_liberados_at: string | null;
  expirado_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cotizacion {
  id: string;
  trabajo_id: string;
  proveedor_id: string;
  paquete_id: string | null;
  descripcion: string;
  monto: number;
  estado: EstadoCotizacion;
  mensaje_id: string | null;
  aceptada_at: string | null;
  created_at: string;
}

export interface DisponibilidadSemanal {
  id: string;
  proveedor_id: string;
  dia_semana: number; // 0=domingo, 6=sábado
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export interface BloqueoAgenda {
  id: string;
  proveedor_id: string;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  motivo: string | null;
  trabajo_id: string | null;
  created_at: string;
}

export interface Resena {
  id: string;
  trabajo_id: string;
  autor_id: string;
  estrellas: number;
  comentario: string | null;
  created_at: string;
}

export interface MensajeChat {
  id: string;
  trabajo_id: string;
  autor_id: string;
  contenido: string;
  leido: boolean;
  created_at: string;
}

export interface EventoBusqueda {
  id: string;
  query_texto: string;
  categoria_buscada: string | null;
  categoria_id: number | null;
  corregimiento_buscado: string | null;
  usuario_id: string | null;
  created_at: string;
}

export interface HistorialEstado {
  id: string;
  trabajo_id: string;
  estado_anterior: EstadoTrabajo;
  estado_nuevo: EstadoTrabajo;
  cambiado_por: string | null;
  nota: string | null;
  created_at: string;
}

export interface Notificacion {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  canal: CanalNotificacion;
  titulo: string;
  cuerpo: string | null;
  trabajo_id: string | null;
  leida: boolean;
  enviada: boolean;
  enviada_at: string | null;
  created_at: string;
}

export interface VistaPerfil {
  id: string;
  proveedor_id: string;
  visitante_id: string | null;
  servicio_id: string | null;
  fuente: string | null;
  created_at: string;
}

export interface MetricaMensual {
  id: string;
  proveedor_id: string;
  mes: string;
  solicitudes: number;
  completados: number;
  cancelados: number;
  ingresos: number;
  rating_promedio: number;
  total_resenas: number;
  vistas_perfil: number;
}

// ============================================================
// Respuestas de RPCs
// ============================================================

export interface TopBusqueda {
  query_texto: string;
  categoria: string;
  total_busquedas: number;
  busquedas_por_hora: Record<string, number>;
}

export interface ResultadoBusquedaServicio {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio_base: number;
  corregimiento: string;
  categoria_nombre: string;
  proveedor_nombre: string;
  proveedor_avatar: string | null;
  rating_promedio: number;
  total_resenas: number;
  fotos: string[];
  relevancia: number;
  precio_desde_paquete?: number | null;
  tiene_paquetes_fijos?: boolean;
}

export interface MetricasProveedor {
  total_solicitudes: number;
  trabajos_completados: number;
  trabajos_activos: number;
  tasa_conversion: number;
  tasa_aceptacion: number;
  ingresos_totales: number;
  ingresos_este_mes: number;
  ticket_promedio: number;
  rating_promedio: number;
  total_resenas: number;
  vistas_ultimos_30_dias: number;
  solicitudes_este_mes: number;
}

export interface IngresoMensual {
  mes: string;
  ingresos: number;
  trabajos: number;
}

export interface SlotDisponible {
  hora_inicio: string;
  hora_fin: string;
}

// ============================================================
// Flujo de estados
// ============================================================

export const TRANSICIONES_VALIDAS: Record<EstadoTrabajo, EstadoTrabajo[]> = {
  solicitud_enviada: ['aceptada', 'rechazada', 'expirada'],
  aceptada: ['negociando', 'cancelado', 'expirada'],
  negociando: ['cotizacion_enviada', 'cancelado', 'expirada'],
  cotizacion_enviada: ['pagado_custodia', 'negociando', 'cancelado', 'expirada'],
  pendiente: ['pagado_custodia', 'cancelado'],
  pagado_custodia: ['en_progreso', 'cancelado', 'disputa'],
  en_progreso: ['terminado', 'disputa'],
  terminado: ['completado_fondos_liberados', 'disputa'],
  completado_fondos_liberados: [],
  cancelado: [],
  disputa: ['completado_fondos_liberados', 'cancelado'],
  rechazada: [],
  expirada: [],
};

// Estados donde el chat está activo
export const ESTADOS_CHAT_ACTIVO: EstadoTrabajo[] = [
  'aceptada', 'negociando', 'cotizacion_enviada',
  'pagado_custodia', 'en_progreso', 'terminado', 'disputa',
];

// Labels para UI
export const ESTADO_LABELS: Record<EstadoTrabajo, string> = {
  solicitud_enviada: 'Solicitud Enviada',
  aceptada: 'Aceptada',
  negociando: 'Negociando',
  cotizacion_enviada: 'Cotización Enviada',
  pendiente: 'Pendiente',
  pagado_custodia: 'Pago en Custodia',
  en_progreso: 'En Progreso',
  terminado: 'Terminado',
  completado_fondos_liberados: 'Completado',
  cancelado: 'Cancelado',
  disputa: 'En Disputa',
  rechazada: 'Rechazada',
  expirada: 'Expirada',
};

export const ESTADO_COLORES: Record<EstadoTrabajo, string> = {
  solicitud_enviada: 'bg-gray-100 text-gray-800',
  aceptada: 'bg-cyan-100 text-cyan-800',
  negociando: 'bg-amber-100 text-amber-800',
  cotizacion_enviada: 'bg-violet-100 text-violet-800',
  pendiente: 'bg-yellow-100 text-yellow-800',
  pagado_custodia: 'bg-blue-100 text-blue-800',
  en_progreso: 'bg-indigo-100 text-indigo-800',
  terminado: 'bg-purple-100 text-purple-800',
  completado_fondos_liberados: 'bg-green-100 text-green-800',
  cancelado: 'bg-red-100 text-red-800',
  disputa: 'bg-orange-100 text-orange-800',
  rechazada: 'bg-red-50 text-red-600',
  expirada: 'bg-gray-100 text-gray-500',
};

// Días de la semana en español
export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
