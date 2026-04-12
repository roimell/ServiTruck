'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import type { Categoria, ResultadoBusquedaServicio } from '@/types/database';

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--color-warm-bg)]"><Navbar /><div className="max-w-5xl mx-auto px-4 py-20 text-center text-stone-400">Cargando...</div></div>}>
      <BuscarContent />
    </Suspense>
  );
}

function BuscarContent() {
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

  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });
  }, []);

  const buscar = useCallback(async () => {
    if (!query.trim() && !categoriaId) return;
    setLoading(true);
    setBuscado(true);

    const { data: { user } } = await supabase.auth.getUser();
    supabase.from('eventos_busqueda').insert({
      query_texto: query.trim(),
      categoria_id: categoriaId,
      corregimiento_buscado: corregimiento || null,
      usuario_id: user?.id || null,
    });

    if (query.trim()) {
      const { data } = await supabase.rpc('buscar_servicios', {
        p_query: query.trim(),
        p_corregimiento: corregimiento || null,
        p_categoria_id: categoriaId,
        p_limite: 20,
      });
      setResultados((data as ResultadoBusquedaServicio[]) || []);
    } else {
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

  const CATEGORY_ICONS: Record<string, string> = {
    'Electricidad': '⚡', 'Plomería': '🔧', 'Limpieza': '✨', 'Pintura': '🎨',
    'Cerrajería': '🔑', 'Mudanzas': '📦', 'Jardinería': '🌿', 'Aire Acondicionado': '❄️',
    'Albañilería': '🧱', 'Tecnología': '💻',
  };

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Search header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-stone-900 mb-1">Buscar servicios</h1>
          <p className="text-sm text-stone-500">Encuentra el profesional ideal para tu proyecto</p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="¿Qué servicio necesitas?"
                className="input-field !pl-12 !rounded-xl"
              />
            </div>
            <button
              type="submit"
              className="btn-primary !rounded-xl shrink-0"
            >
              Buscar
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <select
              value={categoriaId ?? ''}
              onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : null)}
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 bg-white shrink-0 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
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
              placeholder="Zona / Corregimiento"
              className="rounded-xl border border-stone-200 px-4 py-2.5 text-sm text-stone-700 bg-white shrink-0 w-48 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>
        </form>

        {/* Category chips (before search) */}
        {!buscado && categorias.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-medium text-stone-500 mb-4">Categorías populares</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categorias.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setCategoriaId(c.id); setBuscado(true); buscar(); }}
                  className="group bg-white rounded-2xl border border-stone-200/80 p-5 text-center card-hover"
                >
                  <span className="text-2xl mb-2 block">{CATEGORY_ICONS[c.nombre] || '🛠️'}</span>
                  <span className="text-sm font-medium text-stone-700 group-hover:text-teal-700 transition-colors">
                    {c.nombre}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {buscado && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-stone-500">
                {loading
                  ? 'Buscando...'
                  : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''} encontrado${resultados.length !== 1 ? 's' : ''}`}
              </p>
              {buscado && (
                <button
                  onClick={() => { setBuscado(false); setResultados([]); setQuery(''); setCategoriaId(null); }}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {resultados.map((s) => (
                <Link
                  key={s.id}
                  href={`/servicio/${s.id}`}
                  className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden card-hover"
                >
                  {/* Image or placeholder */}
                  {s.fotos && s.fotos.length > 0 ? (
                    <div className="h-40 bg-stone-100 overflow-hidden">
                      <img
                        src={s.fotos[0]}
                        alt={s.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-teal-50 to-stone-50 flex items-center justify-center">
                      <span className="text-4xl opacity-40">🛠️</span>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-stone-900 truncate group-hover:text-teal-700 transition-colors">
                          {s.titulo}
                        </h3>
                        <p className="text-sm text-stone-500">{s.proveedor_nombre}</p>
                      </div>
                      <span className="text-lg font-display font-bold text-teal-600 shrink-0">
                        ${s.precio_base.toFixed(0)}
                      </span>
                    </div>

                    {s.descripcion && (
                      <p className="text-sm text-stone-500 line-clamp-2 mb-3">{s.descripcion}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      {s.rating_promedio > 0 && (
                        <span className="flex items-center gap-1 text-amber-500 font-medium">
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          {s.rating_promedio} ({s.total_resenas})
                        </span>
                      )}
                      {s.categoria_nombre && (
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">{s.categoria_nombre}</span>
                      )}
                      <span>{s.corregimiento}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {!loading && resultados.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-stone-600 font-medium">No se encontraron servicios</p>
                <p className="text-sm text-stone-400 mt-1">Intenta con otros términos o explora las categorías</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
