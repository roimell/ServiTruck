'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { createClient } from '@/lib/supabase';

interface ProveedorAdmin {
  id: string;
  nombre: string;
  nombre_comercial: string | null;
  avatar_url: string | null;
  telefono: string | null;
  whatsapp: string | null;
  corregimiento: string | null;
  es_proveedor: boolean;
  verificado: boolean;
  verificado_at: string | null;
  activo: boolean;
  desactivado_motivo: string | null;
  ruc: string | null;
  anos_experiencia: number | null;
  total_servicios: number;
  rating_promedio: number;
  total_resenas: number;
  created_at: string;
}

interface ServicioAdmin {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio_base: number;
  categoria: string;
  corregimiento: string;
  activo: boolean;
  fotos: string[] | null;
  proveedor_id: string;
  proveedor_nombre: string;
  proveedor_verificado: boolean;
  rating_promedio: number;
  total_resenas: number;
  created_at: string;
}

interface FeedbackAdmin {
  id: string;
  tipo: string;
  mensaje: string;
  email: string | null;
  nombre: string | null;
  nps: number | null;
  usuario_id: string | null;
  dispositivo: string | null;
  resuelto: boolean;
  nota_admin: string | null;
  created_at: string;
}

interface UsuarioAdmin {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  avatar_url: string | null;
  corregimiento: string | null;
  es_proveedor: boolean;
  es_admin: boolean;
  verificado: boolean;
  activo: boolean;
  desactivado_motivo: string | null;
  total_servicios: number;
  total_trabajos_como_cliente: number;
  total_trabajos_como_proveedor: number;
  rating_promedio: number;
  total_resenas: number;
  last_sign_in_at: string | null;
  created_at: string;
}

interface ResumenData {
  kpis: {
    usuarios_total: number;
    usuarios_nuevos_7d: number;
    usuarios_nuevos_prev_7d: number;
    proveedores_total: number;
    proveedores_verificados: number;
    servicios_activos: number;
    servicios_nuevos_7d: number;
    trabajos_total: number;
    trabajos_nuevos_7d: number;
    trabajos_nuevos_prev_7d: number;
    busquedas_7d: number;
    busquedas_prev_7d: number;
  };
  alertas: {
    verificaciones_pendientes: number;
    feedback_pendiente: number;
    trabajos_atascados: number;
    servicios_sin_paquetes: number;
  };
  top_categorias: { nombre: string; icono: string | null; total: number }[];
  top_corregimientos: { corregimiento: string; total: number }[];
  serie_14d: { fecha: string; usuarios: number; busquedas: number; trabajos: number }[];
  top_proveedores: { id: string; nombre: string; avatar_url: string | null; rating: number; total_resenas: number; total_trabajos: number }[];
}

type Tab = 'resumen' | 'usuarios' | 'proveedores' | 'servicios' | 'feedback';
type FiltroProv = 'todos' | 'pendientes' | 'verificados' | 'desactivados';
type FiltroServ = 'todos' | 'activos' | 'inactivos';
type FiltroUsr = 'todos' | 'clientes' | 'proveedores' | 'admins' | 'desactivados';

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [esAdmin, setEsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>('resumen');
  const [proveedores, setProveedores] = useState<ProveedorAdmin[]>([]);
  const [servicios, setServicios] = useState<ServicioAdmin[]>([]);
  const [feedback, setFeedback] = useState<FeedbackAdmin[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [miId, setMiId] = useState<string | null>(null);
  const [filtroFb, setFiltroFb] = useState<'pendientes' | 'resueltos' | 'todos'>('pendientes');
  const [filtroProv, setFiltroProv] = useState<FiltroProv>('pendientes');
  const [filtroServ, setFiltroServ] = useState<FiltroServ>('todos');
  const [filtroUsr, setFiltroUsr] = useState<FiltroUsr>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal] = useState<{ tipo: string; data: any } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data: perfil } = await supabase.from('perfiles').select('es_admin').eq('id', user.id).single();
      if (!perfil?.es_admin) { router.push('/'); return; }

      setMiId(user.id);
      setEsAdmin(true);
      await Promise.all([cargarProveedores(), cargarServicios(), cargarFeedback(), cargarUsuarios(), cargarResumen()]);
      setCargando(false);
    })();
  }, []);

  async function cargarProveedores() {
    const { data } = await supabase.rpc('admin_listar_proveedores');
    if (data) setProveedores(data);
  }

  async function cargarServicios() {
    const { data } = await supabase.rpc('admin_listar_servicios', { p_solo_activos: null });
    if (data) setServicios(data);
  }

  async function cargarFeedback() {
    const { data } = await supabase.rpc('admin_listar_feedback', { p_tipo: null, p_solo_pendientes: false, p_limite: 200 });
    if (data) setFeedback(data);
  }

  async function marcarResuelto(id: string, resuelto: boolean, nota?: string) {
    const { error } = await supabase
      .from('feedback_usuarios')
      .update({ resuelto, nota_admin: nota || null })
      .eq('id', id);
    if (error) { alert('Error: ' + error.message); return; }
    await cargarFeedback();
  }

  async function cargarResumen() {
    const { data } = await supabase.rpc('admin_resumen_dashboard');
    if (data) setResumen(data as ResumenData);
  }

  async function cargarUsuarios() {
    const { data } = await supabase.rpc('admin_listar_usuarios', { p_tipo: null, p_busqueda: null, p_limite: 500 });
    if (data) setUsuarios(data);
  }

  async function toggleAdmin(id: string, hacerAdmin: boolean) {
    const msg = hacerAdmin ? '¿Promover a este usuario como admin? Podrá acceder a este panel.' : '¿Quitar privilegios de admin?';
    if (!confirm(msg)) return;
    const { error } = await supabase.rpc('admin_toggle_admin', { p_perfil_id: id, p_hacer_admin: hacerAdmin });
    if (error) { alert('Error: ' + error.message); return; }
    await cargarUsuarios();
  }

  async function verificar(id: string, nota?: string) {
    const { error } = await supabase.rpc('admin_verificar_proveedor', { p_perfil_id: id, p_nota: nota || null });
    if (error) { alert('Error: ' + error.message); return; }
    await cargarProveedores();
    setModal(null);
  }

  async function quitarVerificacion(id: string, motivo: string) {
    const { error } = await supabase.rpc('admin_quitar_verificacion', { p_perfil_id: id, p_motivo: motivo });
    if (error) { alert('Error: ' + error.message); return; }
    await cargarProveedores();
    setModal(null);
  }

  async function desactivarPerfil(id: string, motivo: string) {
    const { error } = await supabase.rpc('admin_desactivar_perfil', { p_perfil_id: id, p_motivo: motivo });
    if (error) { alert('Error: ' + error.message); return; }
    await Promise.all([cargarProveedores(), cargarServicios(), cargarUsuarios()]);
    setModal(null);
  }

  async function reactivarPerfil(id: string) {
    if (!confirm('¿Reactivar este perfil?')) return;
    const { error } = await supabase.rpc('admin_reactivar_perfil', { p_perfil_id: id });
    if (error) { alert('Error: ' + error.message); return; }
    await Promise.all([cargarProveedores(), cargarUsuarios()]);
  }

  async function desactivarServicio(id: string, motivo: string) {
    const { error } = await supabase.rpc('admin_desactivar_servicio', { p_servicio_id: id, p_motivo: motivo });
    if (error) { alert('Error: ' + error.message); return; }
    await cargarServicios();
    setModal(null);
  }

  const proveedoresFiltrados = proveedores.filter((p) => {
    if (!p.es_proveedor) return false;
    if (filtroProv === 'pendientes' && (p.verificado || !p.activo)) return false;
    if (filtroProv === 'verificados' && !p.verificado) return false;
    if (filtroProv === 'desactivados' && p.activo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (
        p.nombre.toLowerCase().includes(q) ||
        (p.nombre_comercial?.toLowerCase() || '').includes(q) ||
        (p.corregimiento?.toLowerCase() || '').includes(q) ||
        (p.ruc?.toLowerCase() || '').includes(q)
      );
    }
    return true;
  });

  const serviciosFiltrados = servicios.filter((s) => {
    if (filtroServ === 'activos' && !s.activo) return false;
    if (filtroServ === 'inactivos' && s.activo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return s.titulo.toLowerCase().includes(q) || s.proveedor_nombre.toLowerCase().includes(q) || s.categoria.toLowerCase().includes(q);
    }
    return true;
  });

  if (cargando) {
    return (
      <div className="min-h-screen bg-[var(--color-warm-bg)]">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-20 text-center text-stone-400">Verificando permisos...</div>
      </div>
    );
  }

  if (!esAdmin) return null;

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full mb-2">
              🛡️ PANEL DE ADMINISTRACIÓN
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900">Moderación y verificación</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-stone-200 overflow-x-auto scrollbar-hide">
          {([
            { id: 'resumen', label: '📊 Resumen' },
            { id: 'usuarios', label: `Usuarios (${usuarios.length})` },
            { id: 'proveedores', label: `Proveedores (${proveedores.filter((p) => p.es_proveedor).length})` },
            { id: 'servicios', label: `Servicios (${servicios.length})` },
            { id: 'feedback', label: `Feedback (${feedback.filter((f) => !f.resuelto).length})` },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                tab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-stone-500 hover:text-stone-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        {tab !== 'resumen' && tab !== 'feedback' && (
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, RUC, categoría..."
            className="input md:max-w-md"
          />
          {tab === 'proveedores' && (
            <div className="flex gap-2 flex-wrap">
              {(['pendientes', 'verificados', 'desactivados', 'todos'] as FiltroProv[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroProv(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                    filtroProv === f ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {tab === 'servicios' && (
            <div className="flex gap-2">
              {(['todos', 'activos', 'inactivos'] as FiltroServ[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroServ(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                    filtroServ === f ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          {tab === 'usuarios' && (
            <div className="flex gap-2 flex-wrap">
              {(['todos', 'clientes', 'proveedores', 'admins', 'desactivados'] as FiltroUsr[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroUsr(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                    filtroUsr === f ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
        </div>
        )}

        {/* RESUMEN TAB */}
        {tab === 'resumen' && resumen && (
          <ResumenDashboard data={resumen} onGoToTab={setTab} />
        )}

        {/* USUARIOS TAB */}
        {tab === 'usuarios' && (
          <UsuariosTable
            usuarios={usuarios}
            filtroUsr={filtroUsr}
            busqueda={busqueda}
            miId={miId}
            onDesactivar={(u) => setModal({ tipo: 'desactivar_perfil', data: u })}
            onReactivar={reactivarPerfil}
            onToggleAdmin={toggleAdmin}
          />
        )}

        {/* PROVEEDORES TABLE */}
        {tab === 'proveedores' && (
          <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Contacto</th>
                    <th className="px-4 py-3">Datos</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {proveedoresFiltrados.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                            {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.nombre[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-stone-900 truncate">{p.nombre}</p>
                            {p.nombre_comercial && <p className="text-xs text-stone-400 truncate">{p.nombre_comercial}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        {p.telefono && <div>📞 {p.telefono}</div>}
                        {p.whatsapp && <div>💬 {p.whatsapp}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        {p.corregimiento && <div>📍 {p.corregimiento}</div>}
                        {p.ruc && <div>RUC: {p.ruc}</div>}
                        {p.anos_experiencia != null && <div>{p.anos_experiencia} años exp.</div>}
                        <div>{p.total_servicios} servicios · ★ {p.rating_promedio?.toFixed(1) || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {p.verificado ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full w-fit">✓ VERIFICADO</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full w-fit">⏳ PENDIENTE</span>
                          )}
                          {!p.activo && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full w-fit">🚫 DESACTIVADO</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          {!p.verificado ? (
                            <button
                              onClick={() => setModal({ tipo: 'verificar', data: p })}
                              className="text-xs bg-teal-600 text-white px-2.5 py-1 rounded-lg hover:bg-teal-700"
                            >
                              Verificar
                            </button>
                          ) : (
                            <button
                              onClick={() => setModal({ tipo: 'quitar_verif', data: p })}
                              className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-200"
                            >
                              Quitar verif.
                            </button>
                          )}
                          {p.activo ? (
                            <button
                              onClick={() => setModal({ tipo: 'desactivar_perfil', data: p })}
                              className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-200"
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivarPerfil(p.id)}
                              className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg hover:bg-stone-200"
                            >
                              Reactivar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {proveedoresFiltrados.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-sm">Sin proveedores que mostrar.</div>
              )}
            </div>
          </div>
        )}

        {/* SERVICIOS TABLE */}
        {tab === 'servicios' && (
          <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-stone-50 border-b border-stone-200 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Proveedor</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Stats</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {serviciosFiltrados.map((s) => (
                    <tr key={s.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {s.fotos && s.fotos.length > 0 ? (
                            <img src={s.fotos[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">🛠️</div>
                          )}
                          <div className="min-w-0">
                            <Link href={`/servicio/${s.id}`} target="_blank" className="text-sm font-medium text-stone-900 truncate hover:text-teal-600">
                              {s.titulo}
                            </Link>
                            <p className="text-xs text-stone-400">{s.categoria} · {s.corregimiento}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        <span className="flex items-center gap-1">
                          {s.proveedor_nombre}
                          {s.proveedor_verificado && <span className="text-teal-600 text-[10px]">✓</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-800 font-medium">${Number(s.precio_base).toFixed(2)}</td>
                      <td className="px-4 py-3 text-xs text-stone-600">
                        ★ {s.rating_promedio?.toFixed(1) || '—'} ({s.total_resenas})
                      </td>
                      <td className="px-4 py-3">
                        {s.activo ? (
                          <span className="inline-block text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">ACTIVO</span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">INACTIVO</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.activo && (
                          <button
                            onClick={() => setModal({ tipo: 'desactivar_servicio', data: s })}
                            className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-200"
                          >
                            Desactivar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {serviciosFiltrados.length === 0 && (
                <div className="py-12 text-center text-stone-400 text-sm">Sin servicios que mostrar.</div>
              )}
            </div>
          </div>
        )}
        {/* FEEDBACK TABLE */}
        {tab === 'feedback' && (
          <>
            <div className="flex gap-2 mb-4 flex-wrap">
              {(['pendientes', 'resueltos', 'todos'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFiltroFb(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                    filtroFb === f ? 'bg-purple-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
              <div className="divide-y divide-stone-100">
                {feedback
                  .filter((f) => {
                    if (filtroFb === 'pendientes' && f.resuelto) return false;
                    if (filtroFb === 'resueltos' && !f.resuelto) return false;
                    if (busqueda) {
                      const q = busqueda.toLowerCase();
                      return (
                        f.mensaje.toLowerCase().includes(q) ||
                        (f.email?.toLowerCase() || '').includes(q) ||
                        (f.nombre?.toLowerCase() || '').includes(q) ||
                        f.tipo.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((f) => (
                    <div key={f.id} className="p-4 md:p-5 hover:bg-stone-50/50">
                      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-wide bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">
                            {f.tipo}
                          </span>
                          {f.nps != null && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              f.nps >= 9 ? 'bg-emerald-100 text-emerald-700' :
                              f.nps >= 7 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              NPS {f.nps}
                            </span>
                          )}
                          {f.dispositivo && (
                            <span className="text-[10px] text-stone-500">📱 {f.dispositivo}</span>
                          )}
                          <span className="text-[10px] text-stone-400">
                            {new Date(f.created_at).toLocaleString('es-PA', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        {f.resuelto ? (
                          <button
                            onClick={() => marcarResuelto(f.id, false)}
                            className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg hover:bg-stone-200"
                          >
                            Reabrir
                          </button>
                        ) : (
                          <button
                            onClick={() => marcarResuelto(f.id, true)}
                            className="text-xs bg-emerald-600 text-white px-2.5 py-1 rounded-lg hover:bg-emerald-700"
                          >
                            ✓ Marcar resuelto
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap mb-2">{f.mensaje}</p>
                      {(f.nombre || f.email) && (
                        <p className="text-xs text-stone-500">
                          {f.nombre && <span>👤 {f.nombre}</span>}
                          {f.nombre && f.email && <span> · </span>}
                          {f.email && (
                            <a href={`mailto:${f.email}`} className="text-teal-700 hover:underline">
                              ✉️ {f.email}
                            </a>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
              {feedback.filter((f) => filtroFb === 'todos' || (filtroFb === 'pendientes' ? !f.resuelto : f.resuelto)).length === 0 && (
                <div className="py-12 text-center text-stone-400 text-sm">Sin feedback que mostrar.</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <ModalContent
              tipo={modal.tipo}
              data={modal.data}
              onConfirm={(nota) => {
                if (modal.tipo === 'verificar') verificar(modal.data.id, nota);
                if (modal.tipo === 'quitar_verif') quitarVerificacion(modal.data.id, nota);
                if (modal.tipo === 'desactivar_perfil') desactivarPerfil(modal.data.id, nota);
                if (modal.tipo === 'desactivar_servicio') desactivarServicio(modal.data.id, nota);
              }}
              onCancel={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}


function ModalContent({ tipo, data, onConfirm, onCancel }: { tipo: string; data: any; onConfirm: (nota: string) => void; onCancel: () => void }) {
  const [nota, setNota] = useState('');

  const titulos: Record<string, string> = {
    verificar: `✓ Verificar a ${data.nombre}`,
    quitar_verif: `Quitar verificación de ${data.nombre}`,
    desactivar_perfil: `🚫 Desactivar perfil de ${data.nombre}`,
    desactivar_servicio: `Desactivar servicio "${data.titulo}"`,
  };

  const descripciones: Record<string, string> = {
    verificar: 'Este proveedor aparecerá con el badge de verificación. Confirma que has revisado sus datos.',
    quitar_verif: 'El proveedor perderá el badge de verificado.',
    desactivar_perfil: 'El perfil quedará oculto y todos sus servicios desactivados. Esto puede revertirse.',
    desactivar_servicio: 'El servicio dejará de aparecer en búsquedas.',
  };

  const placeholders: Record<string, string> = {
    verificar: 'Nota interna opcional (ej: verificado por RUC + foto cédula)',
    quitar_verif: 'Motivo (opcional)',
    desactivar_perfil: 'Motivo (obligatorio, será visible al usuario)',
    desactivar_servicio: 'Motivo (opcional)',
  };

  const esDesactivar = tipo === 'desactivar_perfil';

  return (
    <>
      <h3 className="font-display text-lg font-bold text-stone-900 mb-2">{titulos[tipo]}</h3>
      <p className="text-sm text-stone-500 mb-4">{descripciones[tipo]}</p>

      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder={placeholders[tipo]}
        rows={3}
        className="input resize-none"
      />

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-stone-600 hover:text-stone-800">Cancelar</button>
        <button
          onClick={() => onConfirm(nota)}
          disabled={esDesactivar && !nota.trim()}
          className={`px-4 py-2 rounded-xl text-sm font-semibold text-white ${
            tipo === 'verificar' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-600 hover:bg-red-700'
          } disabled:opacity-40`}
        >
          Confirmar
        </button>
      </div>
    </>
  );
}

// =================================================
// RESUMEN DASHBOARD
// =================================================

function ResumenDashboard({ data, onGoToTab }: { data: ResumenData; onGoToTab: (t: Tab) => void }) {
  const { kpis, alertas, top_categorias, top_corregimientos, serie_14d, top_proveedores } = data;

  const maxUsuarios = Math.max(1, ...serie_14d.map((d) => d.usuarios));
  const maxBusquedas = Math.max(1, ...serie_14d.map((d) => d.busquedas));

  const totalAlertas = alertas.verificaciones_pendientes + alertas.feedback_pendiente + alertas.trabajos_atascados;

  return (
    <div className="space-y-6">
      {/* Alertas accionables */}
      {totalAlertas > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="font-display text-base font-bold text-amber-900 mb-3 flex items-center gap-2">
            🚨 Requiere tu atención
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {alertas.verificaciones_pendientes > 0 && (
              <button onClick={() => onGoToTab('proveedores')}
                className="bg-white border border-amber-200 rounded-xl p-3 text-left hover:border-amber-400 hover:shadow-sm transition-all">
                <div className="text-2xl font-display font-bold text-amber-700">{alertas.verificaciones_pendientes}</div>
                <div className="text-xs text-amber-900 font-medium">⏳ Verificaciones pendientes</div>
              </button>
            )}
            {alertas.feedback_pendiente > 0 && (
              <button onClick={() => onGoToTab('feedback')}
                className="bg-white border border-purple-200 rounded-xl p-3 text-left hover:border-purple-400 hover:shadow-sm transition-all">
                <div className="text-2xl font-display font-bold text-purple-700">{alertas.feedback_pendiente}</div>
                <div className="text-xs text-purple-900 font-medium">💬 Feedback sin resolver</div>
              </button>
            )}
            {alertas.trabajos_atascados > 0 && (
              <div className="bg-white border border-red-200 rounded-xl p-3">
                <div className="text-2xl font-display font-bold text-red-700">{alertas.trabajos_atascados}</div>
                <div className="text-xs text-red-900 font-medium">⚠️ Trabajos atascados &gt;48h</div>
              </div>
            )}
            {alertas.servicios_sin_paquetes > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl p-3">
                <div className="text-2xl font-display font-bold text-stone-700">{alertas.servicios_sin_paquetes}</div>
                <div className="text-xs text-stone-700 font-medium">📦 Servicios sin paquete cerrado</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPIs con deltas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Usuarios totales" value={kpis.usuarios_total}
          sub={`${kpis.usuarios_nuevos_7d} nuevos en 7d`}
          delta={deltaPct(kpis.usuarios_nuevos_7d, kpis.usuarios_nuevos_prev_7d)} icon="👥" />
        <KpiCard label="Proveedores activos" value={kpis.proveedores_total}
          sub={`${kpis.proveedores_verificados} verificados`} icon="💼" color="teal" />
        <KpiCard label="Servicios activos" value={kpis.servicios_activos}
          sub={`${kpis.servicios_nuevos_7d} nuevos en 7d`} icon="🛠️" />
        <KpiCard label="Trabajos" value={kpis.trabajos_total}
          sub={`${kpis.trabajos_nuevos_7d} en 7d`}
          delta={deltaPct(kpis.trabajos_nuevos_7d, kpis.trabajos_nuevos_prev_7d)} icon="📋" color="amber" />
      </div>

      {/* Búsquedas 7d */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Actividad 7 días</h3>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-3xl font-bold text-stone-900">{kpis.busquedas_7d.toLocaleString()}</div>
              <div className="text-xs text-stone-500">búsquedas esta semana</div>
            </div>
            <DeltaBadge delta={deltaPct(kpis.busquedas_7d, kpis.busquedas_prev_7d)} />
          </div>
          {/* Mini chart búsquedas */}
          <div className="mt-4 flex items-end gap-0.5 h-20">
            {serie_14d.map((d) => (
              <div key={d.fecha} className="flex-1 flex flex-col items-center group relative">
                <div
                  className="w-full bg-teal-400 rounded-t hover:bg-teal-600 transition-all min-h-[2px]"
                  style={{ height: `${(d.busquedas / maxBusquedas) * 100}%` }}
                  title={`${d.fecha}: ${d.busquedas} búsquedas`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-stone-400 mt-1">
            <span>{serie_14d[0]?.fecha.slice(5)}</span>
            <span>{serie_14d[serie_14d.length - 1]?.fecha.slice(5)}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-5">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Nuevos usuarios · 14 días</h3>
          <div className="font-display text-3xl font-bold text-stone-900">
            {serie_14d.reduce((a, d) => a + d.usuarios, 0).toLocaleString()}
          </div>
          <div className="text-xs text-stone-500">registros acumulados</div>
          <div className="mt-4 flex items-end gap-0.5 h-20">
            {serie_14d.map((d) => (
              <div key={d.fecha} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-purple-400 rounded-t hover:bg-purple-600 transition-all min-h-[2px]"
                  style={{ height: `${(d.usuarios / maxUsuarios) * 100}%` }}
                  title={`${d.fecha}: ${d.usuarios} usuarios nuevos`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-stone-400 mt-1">
            <span>{serie_14d[0]?.fecha.slice(5)}</span>
            <span>{serie_14d[serie_14d.length - 1]?.fecha.slice(5)}</span>
          </div>
        </div>
      </div>

      {/* Tops */}
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5">
          <h3 className="font-display font-bold text-stone-900 mb-3">🏆 Top categorías</h3>
          {top_categorias.length === 0 ? (
            <p className="text-sm text-stone-400">Sin datos aún.</p>
          ) : (
            <ul className="space-y-2">
              {top_categorias.map((c, i) => {
                const max = top_categorias[0]?.total || 1;
                return (
                  <li key={c.nombre} className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                    <span className="text-lg">{c.icono || '🛠️'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-700 truncate">{c.nombre}</span>
                        <span className="text-xs font-semibold text-stone-900">{c.total}</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(c.total / max) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-5">
          <h3 className="font-display font-bold text-stone-900 mb-3">📍 Top corregimientos</h3>
          {top_corregimientos.length === 0 ? (
            <p className="text-sm text-stone-400">Sin datos aún.</p>
          ) : (
            <ul className="space-y-2">
              {top_corregimientos.map((c, i) => {
                const max = top_corregimientos[0]?.total || 1;
                return (
                  <li key={c.corregimiento} className="flex items-center gap-3">
                    <span className="text-xs text-stone-400 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-stone-700 truncate">{c.corregimiento}</span>
                        <span className="text-xs font-semibold text-stone-900">{c.total}</span>
                      </div>
                      <div className="h-1 bg-stone-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(c.total / max) * 100}%` }} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Top proveedores */}
      {top_proveedores.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-5">
          <h3 className="font-display font-bold text-stone-900 mb-3">⭐ Top proveedores</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {top_proveedores.map((p) => (
              <Link key={p.id} href={`/proveedor/${p.id}`} target="_blank"
                className="bg-stone-50 hover:bg-stone-100 rounded-xl p-3 flex items-center gap-2 transition-colors">
                <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                  {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : p.nombre[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-stone-900 truncate">{p.nombre}</p>
                  <p className="text-[11px] text-stone-500">★ {Number(p.rating).toFixed(1)} · {p.total_trabajos} trabajos</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function deltaPct(actual: number, prev: number): number {
  if (prev === 0) return actual > 0 ? 100 : 0;
  return Math.round(((actual - prev) / prev) * 100);
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-stone-400">—</span>;
  const pos = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
      pos ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
    }`}>
      {pos ? '↑' : '↓'} {Math.abs(delta)}%
    </span>
  );
}

function KpiCard({ label, value, sub, delta, icon, color }: {
  label: string; value: number; sub?: string; delta?: number; icon: string; color?: 'teal' | 'amber';
}) {
  const colorMap = {
    teal: 'text-teal-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="bg-white rounded-xl border border-stone-200/80 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-stone-500 font-medium flex items-center gap-1">{icon} {label}</div>
        {delta != null && <DeltaBadge delta={delta} />}
      </div>
      <div className={`font-display text-2xl md:text-3xl font-bold mt-1 ${color ? colorMap[color] : 'text-stone-900'}`}>
        {value.toLocaleString()}
      </div>
      {sub && <div className="text-xs text-stone-500 mt-0.5">{sub}</div>}
    </div>
  );
}

// =================================================
// USUARIOS TABLE
// =================================================

function UsuariosTable({
  usuarios, filtroUsr, busqueda, miId, onDesactivar, onReactivar, onToggleAdmin,
}: {
  usuarios: UsuarioAdmin[];
  filtroUsr: FiltroUsr;
  busqueda: string;
  miId: string | null;
  onDesactivar: (u: UsuarioAdmin) => void;
  onReactivar: (id: string) => void;
  onToggleAdmin: (id: string, hacerAdmin: boolean) => void;
}) {
  const filtrados = usuarios.filter((u) => {
    if (filtroUsr === 'clientes' && u.es_proveedor) return false;
    if (filtroUsr === 'proveedores' && !u.es_proveedor) return false;
    if (filtroUsr === 'admins' && !u.es_admin) return false;
    if (filtroUsr === 'desactivados' && u.activo) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return (
        u.nombre.toLowerCase().includes(q) ||
        (u.email?.toLowerCase() || '').includes(q) ||
        (u.telefono || '').toLowerCase().includes(q) ||
        (u.corregimiento?.toLowerCase() || '').includes(q)
      );
    }
    return true;
  });

  const fmtFecha = (f: string | null) => {
    if (!f) return 'Nunca';
    const d = new Date(f);
    const diffD = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diffD === 0) return 'Hoy';
    if (diffD === 1) return 'Ayer';
    if (diffD < 30) return `Hace ${diffD}d`;
    return d.toLocaleDateString('es-PA', { month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200 text-left text-xs font-medium text-stone-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3">Usuario</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3">Actividad</th>
              <th className="px-4 py-3">Último acceso</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {filtrados.map((u) => (
              <tr key={u.id} className={`hover:bg-stone-50/50 ${!u.activo ? 'opacity-60' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-stone-400 to-stone-500 flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                      {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" /> : u.nombre[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">
                        {u.nombre}
                        {u.id === miId && <span className="ml-1.5 text-[10px] text-purple-600 font-normal">(tú)</span>}
                      </p>
                      {u.corregimiento && <p className="text-xs text-stone-400 truncate">📍 {u.corregimiento}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-stone-600">
                  {u.email && <div className="truncate max-w-[180px]">{u.email}</div>}
                  {u.telefono && <div>📞 {u.telefono}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {u.es_admin && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full w-fit">🛡️ ADMIN</span>
                    )}
                    {u.es_proveedor ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full w-fit">💼 Proveedor</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full w-fit">👤 Cliente</span>
                    )}
                    {u.verificado && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full w-fit">✓ Verif.</span>
                    )}
                    {!u.activo && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full w-fit">🚫 Desactivado</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-stone-600">
                  {u.es_proveedor && <div>{u.total_servicios} servicios</div>}
                  <div>
                    {u.total_trabajos_como_cliente + u.total_trabajos_como_proveedor} trabajos
                  </div>
                  {u.total_resenas > 0 && <div>★ {Number(u.rating_promedio).toFixed(1)} ({u.total_resenas})</div>}
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">{fmtFecha(u.last_sign_in_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 justify-end flex-wrap">
                    {u.es_proveedor && (
                      <Link href={`/proveedor/${u.id}`} target="_blank"
                        className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg hover:bg-stone-200">
                        Ver perfil
                      </Link>
                    )}
                    {u.id !== miId && (
                      u.es_admin ? (
                        <button onClick={() => onToggleAdmin(u.id, false)}
                          className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg hover:bg-purple-200">
                          Quitar admin
                        </button>
                      ) : (
                        <button onClick={() => onToggleAdmin(u.id, true)}
                          className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-lg hover:bg-purple-100 hover:text-purple-700">
                          Hacer admin
                        </button>
                      )
                    )}
                    {u.id !== miId && (
                      u.activo ? (
                        <button onClick={() => onDesactivar(u)}
                          className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-200">
                          Desactivar
                        </button>
                      ) : (
                        <button onClick={() => onReactivar(u.id)}
                          className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-200">
                          Reactivar
                        </button>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <div className="py-12 text-center text-stone-400 text-sm">Sin usuarios que mostrar.</div>
        )}
      </div>
    </div>
  );
}
