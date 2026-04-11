'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import type { Categoria, ResultadoBusquedaServicio } from '@/types/database';

export default function BuscarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [categoriaId, setCategoriaId] = useState<number | null>(
    searchParams.get('cat') ? Number(searchParams.get('cat')) : null
  );
  const [corregimiento, setCorregimiento] = useState(searchParams.get('zona') || '');
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [resultados, setResultados] = useState<ResultadoBusquedaServicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // Cargar categorías
  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });
  }, []);

  const buscar = useCallback(async () => {
    if (!query.trim() && !categoriaId) return;
    setLoading(true);
    setBuscado(true);

    // Registrar evento de búsqueda (analytics)
    const { data: { user } } = await supabase.auth.getUser();
    supabase.from('eventos_busqueda').insert({
      query_texto: query.trim(),
      categoria_id: categoriaId,
      corregimiento_buscado: corregimiento || null,
      usuario_id: user?.id || null,
    });

    if (query.trim()) {
      // Full-text search via RPC
      const { data } = await supabase.rpc('buscar_servicios', {
        p_query: query.trim(),
        p_corregimiento: corregimiento || null,
        p_categoria_id: categoriaId,
        p_limite: 20,
      });
      setResultados((data as ResultadoBusquedaServicio[]) || []);
    } else {
      // Filtro por categoría sin texto
      let q = supabase
        .from('servicios')
        .select(`
          id, titulo, descripcion, precio_base, corregimiento,
          rating_promedio, total_resenas, fotos,
          categoria:categorias(nombre),
          proveedor:perfiles!proveedor_id(nombre, avatar_url)
        `)
        .eq('activo', true)
        .limit(20);

      if (categoriaId) q = q.eq('categoria_id', categoriaId);
      if (corregimiento) q = q.eq('corregimiento', corregimiento);

      const { data } = await q;
      setResultados(
        (data || []).map((s: any) => ({
          id: s.id,
          titulo: s.titulo,
          descripcion: s.descripcion,
          precio_base: s.precio_base,
          corregimiento: s.corregimiento,
          categoria_nombre: s.categoria?.nombre || '',
          proveedor_nombre: s.proveedor?.nombre || '',
          proveedor_avatar: s.proveedor?.avatar_url,
          rating_promedio: s.rating_promedio,
          total_resenas: s.total_resenas,
          fotos: s.fotos || [],
          relevancia: 0,
        }))
      );
    }

    setLoading(false);
  }, [query, categoriaId, corregimiento]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    buscar();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿Qué servicio necesitas? (ej: electricista, plomero...)"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              type="submit"
              className="bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <select
              value={categoriaId ?? ''}
              onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white shrink-0"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>

            <input
              type="text"
              value={corregimiento}
              onChange={(e) => setCorregimiento(e.target.value)}
              placeholder="Corregimiento / Zona"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 bg-white shrink-0 w-44"
            />
          </div>
        </form>

        {/* Category chips (quick filters) */}
        {!buscado && categorias.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Categorías populares</h2>
            <div className="flex flex-wrap gap-2">
              {categorias.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategoriaId(c.id); setBuscado(true); buscar(); }}
                  className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                >
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {buscado && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-4">
              {loading
                ? 'Buscando...'
                : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''}`}
            </p>

            <div className="space-y-3">
              {resultados.map((s) => (
                <Link
                  key={s.id}
                  href={`/servicio/${s.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold shrink-0">
                      {s.proveedor_nombre[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{s.titulo}</h3>
                      <p className="text-sm text-gray-500">{s.proveedor_nombre}</p>
                      {s.descripcion && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{s.descripcion}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm">
                        <span className="text-emerald-700 font-semibold">${s.precio_base.toFixed(2)}</span>
                        {s.categoria_nombre && (
                          <span className="text-gray-400">{s.categoria_nombre}</span>
                        )}
                        <span className="text-gray-400">{s.corregimiento}</span>
                        {s.rating_promedio > 0 && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {s.rating_promedio} ({s.total_resenas})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {!loading && resultados.length === 0 && (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-gray-500">No se encontraron servicios</p>
                  <p className="text-sm text-gray-400 mt-1">Intenta con otros términos o filtros</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
