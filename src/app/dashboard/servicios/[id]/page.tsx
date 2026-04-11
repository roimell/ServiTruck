'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import type { Servicio, Categoria, PaqueteServicio } from '@/types/database';

const CORREGIMIENTOS = [
  'Bella Vista', 'Betania', 'Calidonia', 'San Francisco', 'El Cangrejo',
  'Obarrio', 'Punta Pacífica', 'Costa del Este', 'Clayton', 'Ciudad del Saber',
  'Condado del Rey', 'Juan Díaz', 'Parque Lefevre', 'Río Abajo', 'Pueblo Nuevo',
  'Ancón', 'Balboa', 'Curundú', 'El Chorrillo', 'Santa Ana',
  'Arraiján', 'La Chorrera', 'Colón', 'David', 'Santiago',
];

interface PaqueteForm {
  id?: string;
  nombre: string;
  descripcion: string;
  precio: string;
  _delete?: boolean;
}

export default function EditarServicioPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const servicioId = params.id as string;

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [guardado, setGuardado] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [precioBase, setPrecioBase] = useState('');
  const [corregimiento, setCorregimiento] = useState('');
  const [activo, setActivo] = useState(true);

  // Paquetes
  const [paquetes, setPaquetes] = useState<PaqueteForm[]>([]);

  // Stats
  const [stats, setStats] = useState({ rating: 0, resenas: 0, vistas: 0 });

  useEffect(() => {
    async function cargar() {
      const [catRes, servRes, paqRes] = await Promise.all([
        supabase.from('categorias').select('*').order('nombre'),
        supabase.from('servicios').select('*').eq('id', servicioId).single(),
        supabase.from('paquetes_servicio').select('*').eq('servicio_id', servicioId).order('orden'),
      ]);

      if (catRes.data) setCategorias(catRes.data);

      if (servRes.data) {
        const s = servRes.data as Servicio;
        setTitulo(s.titulo);
        setDescripcion(s.descripcion || '');
        setCategoriaId(s.categoria_id);
        setPrecioBase(s.precio_base.toString());
        setCorregimiento(s.corregimiento);
        setActivo(s.activo);
        setStats({ rating: s.rating_promedio, resenas: s.total_resenas, vistas: 0 });
      }

      if (paqRes.data) {
        setPaquetes(paqRes.data.map((p: PaqueteServicio) => ({
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion || '',
          precio: p.precio.toString(),
        })));
      }

      // Vistas últimos 30 días
      const { count } = await supabase
        .from('vistas_perfil')
        .select('*', { count: 'exact', head: true })
        .eq('servicio_id', servicioId)
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString());
      if (count !== null) setStats(prev => ({ ...prev, vistas: count }));

      setLoading(false);
    }
    cargar();
  }, [servicioId]);

  function agregarPaquete() {
    setPaquetes([...paquetes, { nombre: '', descripcion: '', precio: '' }]);
  }

  function actualizarPaquete(idx: number, campo: string, valor: string) {
    setPaquetes(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  }

  function eliminarPaquete(idx: number) {
    setPaquetes(prev => prev.map((p, i) => i === idx ? { ...p, _delete: true } : p));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setGuardado(false);

    if (!titulo.trim() || !categoriaId || !precioBase || !corregimiento) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    setGuardando(true);
    const catSeleccionada = categorias.find(c => c.id === categoriaId);

    // Actualizar servicio
    const { error: errServ } = await supabase
      .from('servicios')
      .update({
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        categoria: catSeleccionada?.nombre || '',
        categoria_id: categoriaId,
        precio_base: Number(precioBase),
        corregimiento,
        activo,
      })
      .eq('id', servicioId);

    if (errServ) {
      setError(errServ.message);
      setGuardando(false);
      return;
    }

    // Paquetes: eliminar marcados
    const paraEliminar = paquetes.filter(p => p._delete && p.id);
    if (paraEliminar.length > 0) {
      await supabase.from('paquetes_servicio').delete().in('id', paraEliminar.map(p => p.id!));
    }

    // Paquetes: actualizar existentes
    const paraActualizar = paquetes.filter(p => !p._delete && p.id && p.nombre.trim() && Number(p.precio) > 0);
    for (const p of paraActualizar) {
      await supabase.from('paquetes_servicio').update({
        nombre: p.nombre.trim(),
        descripcion: p.descripcion.trim() || null,
        precio: Number(p.precio),
      }).eq('id', p.id!);
    }

    // Paquetes: crear nuevos
    const paraCrear = paquetes.filter(p => !p._delete && !p.id && p.nombre.trim() && Number(p.precio) > 0);
    if (paraCrear.length > 0) {
      const maxOrden = paquetes.filter(p => p.id && !p._delete).length;
      await supabase.from('paquetes_servicio').insert(
        paraCrear.map((p, i) => ({
          servicio_id: servicioId,
          nombre: p.nombre.trim(),
          descripcion: p.descripcion.trim() || null,
          precio: Number(p.precio),
          orden: maxOrden + i + 1,
        }))
      );
    }

    setGuardando(false);
    setGuardado(true);
    // Quitar paquetes eliminados del estado
    setPaquetes(prev => prev.filter(p => !p._delete));
    setTimeout(() => setGuardado(false), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded-2xl" />
            <div className="h-48 bg-gray-200 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  const paquetesVisibles = paquetes.filter(p => !p._delete);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al dashboard
          </button>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Editar servicio</h1>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={activo}
                  onChange={(e) => setActivo(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className={`text-sm font-medium ${activo ? 'text-emerald-700' : 'text-gray-400'}`}>
                {activo ? 'Activo' : 'Pausado'}
              </span>
            </div>
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
            <p className="text-lg font-bold text-emerald-700">{stats.rating > 0 ? stats.rating.toFixed(1) : '—'}</p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
            <p className="text-lg font-bold text-gray-900">{stats.resenas}</p>
            <p className="text-xs text-gray-500">Reseñas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
            <p className="text-lg font-bold text-blue-700">{stats.vistas}</p>
            <p className="text-xs text-gray-500">Vistas (30d)</p>
          </div>
        </div>

        <form onSubmit={guardar} className="space-y-6">
          {/* Info básica */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900">Información del servicio</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={120}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                maxLength={1000}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-shadow"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría <span className="text-red-500">*</span></label>
                <select
                  value={categoriaId ?? ''}
                  onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="">Selecciona...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zona <span className="text-red-500">*</span></label>
                <select
                  value={corregimiento}
                  onChange={(e) => setCorregimiento(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="">Selecciona...</option>
                  {CORREGIMIENTOS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio base (USD) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                  min="1"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Paquetes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Paquetes de servicio</h2>
              <span className="text-xs text-gray-400">{paquetesVisibles.length} paquete{paquetesVisibles.length !== 1 ? 's' : ''}</span>
            </div>

            {paquetesVisibles.map((paq, idx) => {
              const realIdx = paquetes.indexOf(paq);
              return (
                <div key={realIdx} className="border border-gray-200 rounded-xl p-4 space-y-3 relative group bg-gray-50/50">
                  <button
                    type="button"
                    onClick={() => eliminarPaquete(realIdx)}
                    className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={paq.nombre}
                        onChange={(e) => actualizarPaquete(realIdx, 'nombre', e.target.value)}
                        placeholder="Nombre del paquete"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={paq.precio}
                        onChange={(e) => actualizarPaquete(realIdx, 'precio', e.target.value)}
                        placeholder="Precio"
                        min="0.01"
                        step="0.01"
                        className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <textarea
                    value={paq.descripcion}
                    onChange={(e) => actualizarPaquete(realIdx, 'descripcion', e.target.value)}
                    rows={2}
                    placeholder="Qué incluye este paquete..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  />
                </div>
              );
            })}

            <button
              type="button"
              onClick={agregarPaquete}
              className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Agregar paquete
            </button>
          </div>

          {/* Error / Éxito */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          {guardado && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Cambios guardados correctamente
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-[2] bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 transition-all text-sm shadow-lg shadow-emerald-200"
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
