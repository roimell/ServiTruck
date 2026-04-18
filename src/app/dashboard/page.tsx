'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import EstadoBadge from '@/components/estado-badge';
import ChatTrabajo from '@/components/chat-trabajo';
import type {
  SolicitudTrabajo, Perfil, Servicio, TopBusqueda, EstadoTrabajo,
  MetricasProveedor, IngresoMensual, PaqueteServicio,
} from '@/types/database';
import { ESTADOS_CHAT_ACTIVO } from '@/types/database';

interface SolicitudProveedor extends SolicitudTrabajo {
  servicio: Pick<Servicio, 'titulo'>;
  cliente: Pick<Perfil, 'nombre' | 'telefono'>;
  paquete: Pick<PaqueteServicio, 'nombre' | 'precio'> | null;
}

interface TendenciaData { categoria: string; hora: string; total: number; }

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50"><Navbar /><div className="max-w-6xl mx-auto px-4 py-20 text-center text-stone-400">Cargando...</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [solicitudes, setSolicitudes] = useState<SolicitudProveedor[]>([]);
  const [tendencias, setTendencias] = useState<TendenciaData[]>([]);
  const [topBusquedas, setTopBusquedas] = useState<TopBusqueda[]>([]);
  const [metricas, setMetricas] = useState<MetricasProveedor | null>(null);
  const [ingresosMes, setIngresosMes] = useState<IngresoMensual[]>([]);
  const [misServicios, setMisServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'solicitudes' | 'servicios' | 'metricas' | 'tendencias'>('solicitudes');
  const [chatTrabajoId, setChatTrabajoId] = useState<string | null>(searchParams.get('chat'));
  const chatSolicitud = solicitudes.find((s) => s.id === chatTrabajoId);

  useEffect(() => { cargarDashboard(); }, []);

  async function cargarDashboard() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [perfilRes, solicitudesRes, serviciosRes, tendenciasRes, metricasRes, ingresosRes] = await Promise.all([
      supabase.from('perfiles').select('*').eq('id', user.id).single(),
      supabase
        .from('solicitudes_trabajo')
        .select('*, servicio:servicios(titulo), cliente:perfiles!cliente_id(nombre, telefono), paquete:paquetes_servicio(nombre, precio)')
        .eq('proveedor_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('servicios').select('*').eq('proveedor_id', user.id).order('created_at', { ascending: false }),
      supabase.rpc('tendencias_busqueda', { p_dias: 7 }),
      supabase.rpc('mis_metricas_proveedor'),
      supabase.rpc('mis_ingresos_por_mes', { p_meses: 6 }),
    ]);

    const perfilData = perfilRes.data as Perfil;
    setPerfil(perfilData);
    setSolicitudes((solicitudesRes.data as SolicitudProveedor[]) || []);
    setMisServicios((serviciosRes.data as Servicio[]) || []);
    setTendencias((tendenciasRes.data as TendenciaData[]) || []);
    setIngresosMes((ingresosRes.data as IngresoMensual[]) || []);

    if (metricasRes.data && Array.isArray(metricasRes.data) && metricasRes.data.length > 0) {
      setMetricas(metricasRes.data[0] as MetricasProveedor);
    } else if (metricasRes.data && !Array.isArray(metricasRes.data)) {
      setMetricas(metricasRes.data as MetricasProveedor);
    }

    if (perfilData?.corregimiento) {
      const { data: topData } = await supabase.rpc('top_busquedas_por_zona', {
        p_corregimiento: perfilData.corregimiento, p_dias: 7, p_limite: 10,
      });
      setTopBusquedas((topData as TopBusqueda[]) || []);
    }

    setLoading(false);
  }

  async function cambiarEstado(solicitudId: string, nuevoEstado: EstadoTrabajo) {
    const { error } = await supabase
      .from('solicitudes_trabajo')
      .update({ estado: nuevoEstado })
      .eq('id', solicitudId);
    if (error) { alert(error.message); return; }
    cargarDashboard();
  }

  const solicitudesNuevas = solicitudes.filter((s) => s.estado === 'solicitud_enviada');
  const solicitudesActivas = solicitudes.filter((s) =>
    ['aceptada', 'negociando', 'cotizacion_enviada', 'pagado_custodia', 'en_progreso', 'terminado'].includes(s.estado)
  );

  const categoriasAgrupadas = tendencias.reduce<Record<string, number>>((acc, t) => {
    acc[t.categoria] = (acc[t.categoria] || 0) + Number(t.total);
    return acc;
  }, {});
  const maxBusquedas = Math.max(...Object.values(categoriasAgrupadas), 1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl" />)}</div>
            <div className="h-64 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Dashboard</h1>
            <p className="text-sm text-gray-500">Hola, {perfil?.nombre}</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/servicios/nuevo"
              className="bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo servicio
            </Link>
            <Link
              href="/dashboard/disponibilidad"
              className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Disponibilidad
            </Link>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Solicitudes" value={metricas?.total_solicitudes ?? 0} />
          <StatCard label="Activas" value={metricas?.trabajos_activos ?? 0} color="blue" />
          <StatCard label="Completadas" value={metricas?.trabajos_completados ?? 0} color="emerald" />
          <StatCard label="Ingresos totales" value={`$${(metricas?.ingresos_totales ?? 0).toFixed(2)}`} color="emerald" />
        </div>

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <MiniStat label="Tasa conversión" value={`${metricas?.tasa_conversion ?? 0}%`} />
          <MiniStat label="Tasa aceptación" value={`${metricas?.tasa_aceptacion ?? 0}%`} />
          <MiniStat label="Ticket promedio" value={`$${(metricas?.ticket_promedio ?? 0).toFixed(2)}`} />
          <MiniStat label="Vistas (30 días)" value={metricas?.vistas_ultimos_30_dias ?? 0} />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
          {([
            { key: 'solicitudes', label: `Solicitudes${solicitudesNuevas.length > 0 ? ` (${solicitudesNuevas.length} nueva${solicitudesNuevas.length > 1 ? 's' : ''})` : ''}` },
            { key: 'servicios', label: `Mis Servicios (${misServicios.length})` },
            { key: 'metricas', label: 'Métricas' },
            { key: 'tendencias', label: 'Tendencias' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Solicitudes */}
        {tab === 'solicitudes' && (
          <div className="space-y-4">
            {/* Solicitudes nuevas (requieren acción) */}
            {solicitudesNuevas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  Nuevas solicitudes
                </h3>
                <div className="space-y-3">
                  {solicitudesNuevas.map((s) => (
                    <div key={s.id} className="bg-white rounded-xl border-2 border-amber-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900">{s.servicio?.titulo}</h3>
                          <p className="text-sm text-gray-500">Cliente: {s.cliente?.nombre}</p>
                        </div>
                        <EstadoBadge estado={s.estado} />
                      </div>

                      {s.descripcion_cliente && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-2 text-sm text-gray-700">
                          <p className="text-xs text-gray-400 mb-1">Lo que necesita:</p>
                          {s.descripcion_cliente}
                        </div>
                      )}

                      {s.paquete && (
                        <p className="text-sm text-violet-600 mt-2">Paquete: {s.paquete.nombre} (${s.paquete.precio.toFixed(2)})</p>
                      )}

                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => cambiarEstado(s.id, 'aceptada')}
                          className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          Aceptar
                        </button>
                        <button
                          onClick={() => cambiarEstado(s.id, 'rechazada')}
                          className="text-sm text-red-600 py-2 px-4 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Solicitudes activas */}
            {solicitudesActivas.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Trabajos activos</h3>
                <div className="space-y-3">
                  {solicitudesActivas.map((s) => (
                    <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{s.servicio?.titulo}</h3>
                          <p className="text-sm text-gray-500">{s.cliente?.nombre}{s.cliente?.telefono && ` · ${s.cliente.telefono}`}</p>
                        </div>
                        <EstadoBadge estado={s.estado} />
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {s.fecha_agendada && (
                          <span>{new Date(s.fecha_agendada).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                        {s.monto_proveedor && <span className="font-semibold text-gray-700">Recibirás: ${s.monto_proveedor.toFixed(2)}</span>}
                      </div>

                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        {s.estado === 'aceptada' && (
                          <button onClick={() => cambiarEstado(s.id, 'negociando')} className="bg-amber-500 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-amber-600 transition-colors">
                            Iniciar negociación
                          </button>
                        )}
                        {s.estado === 'pagado_custodia' && (
                          <button onClick={() => cambiarEstado(s.id, 'en_progreso')} className="bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                            Iniciar trabajo
                          </button>
                        )}
                        {s.estado === 'en_progreso' && (
                          <button onClick={() => cambiarEstado(s.id, 'terminado')} className="bg-emerald-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors">
                            Marcar como terminado
                          </button>
                        )}
                        {ESTADOS_CHAT_ACTIVO.includes(s.estado) && (
                          <button
                            onClick={() => setChatTrabajoId(s.id)}
                            className="text-sm text-blue-600 py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Chat
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {solicitudesNuevas.length === 0 && solicitudesActivas.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <p className="text-gray-500">No tienes solicitudes activas</p>
              </div>
            )}
          </div>
        )}

        {/* Tab: Mis Servicios */}
        {tab === 'servicios' && (
          <div className="space-y-3">
            {misServicios.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-500 mb-3">No tienes servicios publicados</p>
                <Link
                  href="/dashboard/servicios/nuevo"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Publicar primer servicio
                </Link>
              </div>
            ) : (
              misServicios.map((s) => (
                <Link
                  key={s.id}
                  href={`/dashboard/servicios/${s.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-emerald-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-700 transition-colors">
                          {s.titulo}
                        </h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${s.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {s.activo ? 'Activo' : 'Pausado'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{s.categoria} · {s.corregimiento}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-emerald-700">${s.precio_base.toFixed(2)}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        {s.rating_promedio > 0 && (
                          <>
                            <span className="text-amber-500">★</span>
                            <span>{s.rating_promedio.toFixed(1)}</span>
                            <span>({s.total_resenas})</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        )}

        {/* Tab: Métricas */}
        {tab === 'metricas' && (
          <div className="space-y-4">
            {/* Ingresos por mes (gráfica de barras simple) */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Ingresos por mes</h3>
              <p className="text-xs text-gray-400 mb-4">Últimos 6 meses</p>

              {ingresosMes.length === 0 ? (
                <p className="text-gray-400 text-sm">Sin datos de ingresos aún</p>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    const maxIngreso = Math.max(...ingresosMes.map((m) => m.ingresos), 1);
                    return ingresosMes.map((m) => (
                      <div key={m.mes} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-16 shrink-0">{m.mes}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 relative">
                          <div
                            className="bg-emerald-500 h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max((m.ingresos / maxIngreso) * 100, 8)}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">${m.ingresos.toFixed(0)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400 w-12 text-right">{m.trabajos} trab.</span>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* KPIs detallados */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Ingresos este mes</p>
                <p className="text-xl font-bold text-emerald-700">${(metricas?.ingresos_este_mes ?? 0).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Solicitudes este mes</p>
                <p className="text-xl font-bold text-blue-600">{metricas?.solicitudes_este_mes ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Rating promedio</p>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xl font-bold text-amber-500">{(metricas?.rating_promedio ?? 0).toFixed(1)}</p>
                  <svg className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-xs text-gray-400">({metricas?.total_resenas ?? 0})</span>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Vistas a tu perfil</p>
                <p className="text-xl font-bold text-indigo-600">{metricas?.vistas_ultimos_30_dias ?? 0}</p>
                <p className="text-xs text-gray-400">últimos 30 días</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Tendencias */}
        {tab === 'tendencias' && (
          <div className="space-y-4">
            {topBusquedas.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Top búsquedas en {perfil?.corregimiento}</h3>
                <p className="text-xs text-gray-400 mb-4">Últimos 7 días — Oportunidades de negocio</p>
                <div className="space-y-3">
                  {topBusquedas.map((b, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate">{b.query_texto}</span>
                          <span className="text-xs text-gray-500 shrink-0 ml-2">{b.total_busquedas} búsquedas</span>
                        </div>
                        {b.categoria && <span className="text-xs text-emerald-600">{b.categoria}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Categorías más buscadas</h3>
              <p className="text-xs text-gray-400 mb-4">Últimos 7 días</p>
              {Object.keys(categoriasAgrupadas).length === 0 ? (
                <p className="text-gray-400 text-sm">Sin datos aún</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(categoriasAgrupadas).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([cat, total]) => (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-700">{cat}</span>
                        <span className="text-gray-500">{total}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(total / maxBusquedas) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Heatmap por hora */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Actividad por hora</h3>
              <p className="text-xs text-gray-400 mb-4">Cuándo buscan los clientes</p>
              <div className="grid grid-cols-12 gap-1">
                {Array.from({ length: 24 }, (_, h) => {
                  const horaStr = h.toString().padStart(2, '0');
                  const total = tendencias.filter((t) => t.hora === horaStr).reduce((sum, t) => sum + Number(t.total), 0);
                  const maxHora = Math.max(...Array.from({ length: 24 }, (_, i) =>
                    tendencias.filter((t) => t.hora === i.toString().padStart(2, '0')).reduce((sum, t) => sum + Number(t.total), 0)
                  ), 1);
                  const intensity = total / maxHora;
                  return (
                    <div key={h} className="text-center">
                      <div className="aspect-square rounded-sm mx-auto mb-1"
                        style={{ backgroundColor: total > 0 ? `rgba(16, 185, 129, ${0.15 + intensity * 0.85})` : '#f3f4f6' }}
                        title={`${horaStr}:00 - ${total} búsquedas`}
                      />
                      {h % 3 === 0 && <span className="text-[10px] text-gray-400">{horaStr}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {chatTrabajoId && chatSolicitud && (
        <ChatTrabajo trabajoId={chatTrabajoId} estadoTrabajo={chatSolicitud.estado} onEstadoCambiado={cargarDashboard} />
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'gray' }: { label: string; value: string | number; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'text-gray-900', blue: 'text-blue-600', emerald: 'text-emerald-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
