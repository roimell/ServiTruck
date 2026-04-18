'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import EstadoBadge from '@/components/estado-badge';
import ChatTrabajo from '@/components/chat-trabajo';
import ResenaForm from '@/components/resena-form';
import type { SolicitudTrabajo, EstadoTrabajo, Servicio, Perfil } from '@/types/database';
import { ESTADOS_CHAT_ACTIVO } from '@/types/database';

interface SolicitudConDetalle extends SolicitudTrabajo {
  servicio: Pick<Servicio, 'titulo' | 'categoria'>;
  proveedor: Pick<Perfil, 'nombre' | 'avatar_url'>;
}

export default function MisSolicitudesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"><Navbar /><div className="max-w-2xl mx-auto px-4 py-20 text-center text-stone-400">Cargando...</div></div>}>
      <MisSolicitudesContent />
    </Suspense>
  );
}

function MisSolicitudesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [solicitudes, setSolicitudes] = useState<SolicitudConDetalle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todas' | 'activas' | 'completadas'>('activas');
  const [chatTrabajoId, setChatTrabajoId] = useState<string | null>(searchParams.get('chat'));
  const [resenaTrabajoId, setResenaTrabajoId] = useState<string | null>(null);
  const [resenasYaHechas, setResenasYaHechas] = useState<Set<string>>(new Set());
  const chatSolicitud = solicitudes.find((s) => s.id === chatTrabajoId);
  const resenaSolicitud = solicitudes.find((s) => s.id === resenaTrabajoId);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  async function cargarSolicitudes() {
    const { data } = await supabase
      .from('solicitudes_trabajo')
      .select(`
        *,
        servicio:servicios(titulo, categoria),
        proveedor:perfiles!proveedor_id(nombre, avatar_url)
      `)
      .order('created_at', { ascending: false });

    setSolicitudes((data as SolicitudConDetalle[]) || []);

    // Cargar qué trabajos ya tienen reseña
    const trabajoIds = (data || []).map((s) => s.id);
    if (trabajoIds.length > 0) {
      const { data: resenasData } = await supabase
        .from('resenas')
        .select('trabajo_id')
        .in('trabajo_id', trabajoIds);
      if (resenasData) {
        setResenasYaHechas(new Set(resenasData.map((r) => r.trabajo_id)));
      }
    }

    setLoading(false);
  }

  async function cambiarEstado(solicitudId: string, nuevoEstado: EstadoTrabajo, motivoCancelacion?: string) {
    const { error } = await supabase
      .from('solicitudes_trabajo')
      .update({
        estado: nuevoEstado,
        ...(motivoCancelacion ? { motivo_cancelacion: motivoCancelacion } : {}),
      })
      .eq('id', solicitudId);

    if (error) { alert(error.message); return; }

    // Auto-insert precio_mercado when work completes (data asset)
    if (nuevoEstado === 'completado_fondos_liberados') {
      const s = solicitudes.find((x) => x.id === solicitudId);
      if (s?.monto_total && s.servicio) {
        supabase.from('precios_mercado').insert({
          solicitud_id: solicitudId,
          monto_pab: s.monto_total,
          fuente: 'solicitud',
          corregimiento: 'Panama', // TODO: get from proveedor profile
        });
      }
    }

    cargarSolicitudes();
  }

  const estadosFinales: EstadoTrabajo[] = ['completado_fondos_liberados', 'cancelado', 'rechazada', 'expirada'];

  const solicitudesFiltradas = solicitudes.filter((s) => {
    if (filtro === 'activas') return !estadosFinales.includes(s.estado);
    if (filtro === 'completadas') return estadosFinales.includes(s.estado);
    return true;
  });

  function renderAcciones(s: SolicitudConDetalle) {
    const acciones: React.ReactNode[] = [];

    // Solicitud enviada: el cliente solo espera
    if (s.estado === 'solicitud_enviada') {
      acciones.push(
        <span key="espera" className="text-sm text-gray-400 flex items-center gap-1">
          <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Esperando respuesta del proveedor
        </span>,
        <button
          key="cancelar"
          onClick={() => cambiarEstado(s.id, 'cancelado')}
          className="text-sm text-red-600 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancelar
        </button>
      );
    }

    // Aceptada/Negociando: abrir chat para negociar
    if (['aceptada', 'negociando'].includes(s.estado)) {
      acciones.push(
        <button
          key="chat-negociar"
          onClick={() => setChatTrabajoId(s.id)}
          className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {s.estado === 'aceptada' ? 'Iniciar negociación' : 'Continuar negociación'}
        </button>,
        <button
          key="cancelar"
          onClick={() => cambiarEstado(s.id, 'cancelado')}
          className="text-sm text-red-600 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancelar
        </button>
      );
    }

    // Cotización enviada: ver cotización en chat, pagar
    if (s.estado === 'cotizacion_enviada') {
      acciones.push(
        <button
          key="ver-cotizacion"
          onClick={() => setChatTrabajoId(s.id)}
          className="flex-1 bg-violet-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-violet-700 transition-colors flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Ver cotización
        </button>,
        <button
          key="cancelar"
          onClick={() => cambiarEstado(s.id, 'cancelado')}
          className="text-sm text-red-600 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancelar
        </button>
      );
    }

    // Pendiente (flujo viejo): pagar
    if (s.estado === 'pendiente') {
      acciones.push(
        <button
          key="pagar"
          onClick={() => alert('Integración con pasarela de pago pendiente')}
          className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Pagar ahora
        </button>,
        <button
          key="cancelar"
          onClick={() => cambiarEstado(s.id, 'cancelado')}
          className="text-sm text-red-600 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
        >
          Cancelar
        </button>
      );
    }

    // Terminado: confirmar y liberar fondos
    if (s.estado === 'terminado') {
      acciones.push(
        <button
          key="liberar"
          onClick={() => cambiarEstado(s.id, 'completado_fondos_liberados')}
          className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Confirmar y liberar fondos
        </button>
      );
    }

    // Completado: dejar reseña
    if (s.estado === 'completado_fondos_liberados') {
      if (resenasYaHechas.has(s.id)) {
        acciones.push(
          <span key="resena-hecha" className="text-sm text-gray-400 flex items-center gap-1 py-2 px-3">
            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Reseña publicada
          </span>
        );
      } else {
        acciones.push(
          <button
            key="resena"
            onClick={() => setResenaTrabajoId(s.id)}
            className="flex-1 bg-amber-500 text-white text-sm font-medium py-2 px-3 rounded-lg hover:bg-amber-600 transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Dejar reseña
          </button>
        );
      }
    }

    // Chat para estados activos de ejecución
    if (['pagado_custodia', 'en_progreso', 'terminado', 'disputa'].includes(s.estado)) {
      acciones.push(
        <button
          key="chat"
          onClick={() => setChatTrabajoId(s.id)}
          className="text-sm text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
        </button>
      );
    }

    // Reportar problema en estados de ejecución
    if (['pagado_custodia', 'en_progreso', 'terminado'].includes(s.estado)) {
      acciones.push(
        <button
          key="disputa"
          onClick={() => cambiarEstado(s.id, 'disputa')}
          className="text-sm text-orange-600 py-2 px-3 rounded-lg hover:bg-orange-50 transition-colors"
        >
          Reportar problema
        </button>
      );
    }

    return acciones;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Mis Solicitudes</h1>

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {(['activas', 'todas', 'completadas'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filtro === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'activas' ? 'Activas' : f === 'todas' ? 'Todas' : 'Completadas'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : solicitudesFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-500">No tienes solicitudes {filtro !== 'todas' ? filtro : ''}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudesFiltradas.map((s) => (
              <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {s.servicio?.titulo}
                    </h3>
                    <p className="text-sm text-gray-500">{s.proveedor?.nombre}</p>
                  </div>
                  <EstadoBadge estado={s.estado} />
                </div>

                {/* Descripción del cliente (nuevo flujo) */}
                {s.descripcion_cliente && (
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{s.descripcion_cliente}</p>
                )}

                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  {s.fecha_agendada && (
                    <span>
                      {new Date(s.fecha_agendada).toLocaleDateString('es-PA', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                  {s.monto_total && (
                    <span className="font-semibold text-emerald-700">${s.monto_total.toFixed(2)}</span>
                  )}
                  {!s.monto_total && ['solicitud_enviada', 'aceptada', 'negociando'].includes(s.estado) && (
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Por cotizar</span>
                  )}
                </div>

                {/* Acciones según estado */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                  {renderAcciones(s)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Chat flotante */}
      {chatTrabajoId && chatSolicitud && (
        <ChatTrabajo
          trabajoId={chatTrabajoId}
          estadoTrabajo={chatSolicitud.estado}
          onEstadoCambiado={cargarSolicitudes}
        />
      )}

      {/* Modal de reseña */}
      {resenaTrabajoId && resenaSolicitud && (
        <ResenaForm
          trabajoId={resenaTrabajoId}
          proveedorNombre={resenaSolicitud.proveedor?.nombre ?? 'el proveedor'}
          onEnviada={() => {
            setResenasYaHechas((prev) => new Set([...prev, resenaTrabajoId]));
            setResenaTrabajoId(null);
          }}
          onCancelar={() => setResenaTrabajoId(null)}
        />
      )}
    </div>
  );
}
