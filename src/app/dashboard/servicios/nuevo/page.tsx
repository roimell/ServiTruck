'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import ImageUpload from '@/components/image-upload';
import type { Categoria } from '@/types/database';

const CORREGIMIENTOS = [
  'Bella Vista', 'Betania', 'Calidonia', 'San Francisco', 'El Cangrejo',
  'Obarrio', 'Punta Pacífica', 'Costa del Este', 'Clayton', 'Ciudad del Saber',
  'Condado del Rey', 'Juan Díaz', 'Parque Lefevre', 'Río Abajo', 'Pueblo Nuevo',
  'Ancón', 'Balboa', 'Curundú', 'El Chorrillo', 'Santa Ana',
  'Arraiján', 'La Chorrera', 'Colón', 'David', 'Santiago',
];

export default function NuevoServicioPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string>('');

  // Form state
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [precioBase, setPrecioBase] = useState('');
  const [corregimiento, setCorregimiento] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);

  // Paquetes inline
  const [paquetes, setPaquetes] = useState<{ nombre: string; descripcion: string; precio: string }[]>([]);

  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  function agregarPaquete() {
    setPaquetes([...paquetes, { nombre: '', descripcion: '', precio: '' }]);
  }

  function actualizarPaquete(idx: number, campo: string, valor: string) {
    setPaquetes(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p));
  }

  function eliminarPaquete(idx: number) {
    setPaquetes(prev => prev.filter((_, i) => i !== idx));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!titulo.trim() || !categoriaId || !precioBase || !corregimiento) {
      setError('Completa todos los campos obligatorios.');
      return;
    }

    setGuardando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Debes iniciar sesión.'); setGuardando(false); return; }

    const catSeleccionada = categorias.find(c => c.id === categoriaId);

    // Crear servicio
    const { data: servicio, error: errServicio } = await supabase
      .from('servicios')
      .insert({
        proveedor_id: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        categoria: catSeleccionada?.nombre || '',
        categoria_id: categoriaId,
        precio_base: Number(precioBase),
        corregimiento,
        fotos,
      })
      .select()
      .single();

    if (errServicio || !servicio) {
      setError(errServicio?.message || 'Error al crear el servicio.');
      setGuardando(false);
      return;
    }

    // Crear paquetes si hay
    const paquetesValidos = paquetes.filter(p => p.nombre.trim() && p.precio && Number(p.precio) > 0);
    if (paquetesValidos.length > 0) {
      await supabase.from('paquetes_servicio').insert(
        paquetesValidos.map((p, i) => ({
          servicio_id: servicio.id,
          nombre: p.nombre.trim(),
          descripcion: p.descripcion.trim() || null,
          precio: Number(p.precio),
          orden: i + 1,
        }))
      );
    }

    router.push(`/dashboard/servicios/${servicio.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Publicar nuevo servicio</h1>
          <p className="text-gray-500 mt-1">Completa la información para que los clientes te encuentren.</p>
        </div>

        <form onSubmit={guardar} className="space-y-6">
          {/* Info básica */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center justify-center">1</span>
              Información del servicio
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título del servicio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Reparación de aires acondicionados"
                maxLength={120}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
              />
              <p className="text-xs text-gray-400 mt-1">{titulo.length}/120 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={4}
                placeholder="Describe qué incluye tu servicio, tu experiencia, herramientas que usas..."
                maxLength={1000}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-shadow"
              />
              <p className="text-xs text-gray-400 mt-1">{descripcion.length}/1000 caracteres</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoriaId ?? ''}
                  onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-shadow"
                >
                  <option value="">Selecciona...</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zona <span className="text-red-500">*</span>
                </label>
                <select
                  value={corregimiento}
                  onChange={(e) => setCorregimiento(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-shadow"
                >
                  <option value="">Selecciona...</option>
                  {CORREGIMIENTOS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio base (USD) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <input
                  type="number"
                  value={precioBase}
                  onChange={(e) => setPrecioBase(e.target.value)}
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-300 pl-8 pr-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Precio de referencia. Los clientes verán esto al buscar.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Fotos del servicio</label>
              {userId && (
                <ImageUpload
                  bucket="servicios"
                  userId={userId}
                  value={fotos}
                  onChange={setFotos}
                  maxImages={5}
                  maxSizeMB={5}
                  publicBucket={true}
                />
              )}
            </div>
          </div>

          {/* Paquetes */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center justify-center">2</span>
                Paquetes de servicio
              </h2>
              <span className="text-xs text-gray-400">Opcional</span>
            </div>

            <p className="text-sm text-gray-500">
              Los paquetes permiten ofrecer distintos niveles de servicio. Los clientes podrán elegir uno al solicitar.
            </p>

            {paquetes.map((paq, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3 relative group bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => eliminarPaquete(idx)}
                  className="absolute top-3 right-3 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Paquete {idx + 1}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <input
                      type="text"
                      value={paq.nombre}
                      onChange={(e) => actualizarPaquete(idx, 'nombre', e.target.value)}
                      placeholder="Nombre (Ej: Básico, Estándar, Premium)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      value={paq.precio}
                      onChange={(e) => actualizarPaquete(idx, 'precio', e.target.value)}
                      placeholder="Precio"
                      min="0.01"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <textarea
                  value={paq.descripcion}
                  onChange={(e) => actualizarPaquete(idx, 'descripcion', e.target.value)}
                  rows={2}
                  placeholder="Qué incluye este paquete..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                />
              </div>
            ))}

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

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-[2] bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 transition-all text-sm shadow-lg shadow-emerald-200"
            >
              {guardando ? 'Publicando...' : 'Publicar servicio'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
