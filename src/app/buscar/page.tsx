'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

const CATEGORY_ICONS: Record<string, string> = {
  'Electricidad': '⚡', 'Plomería': '🔧', 'Limpieza': '✨', 'Pintura': '🎨',
  'Cerrajería': '🔑', 'Mudanzas': '📦', 'Jardinería': '🌿', 'Aire Acondicionado': '❄️',
  'Albañilería': '🧱', 'Tecnología': '💻',
};

function BuscarContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [categoriaId, setCategoriaId] = useState<number | null>(
    searchParams.get('cat') ? Number(searchParams.get('cat')) : null
  );
  const [urgencia, setUrgencia] = useState<'hoy' | 'esta_semana' | 'flexible' | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [resultados, setResultados] = useState<ResultadoBusquedaServicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load categories
  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });
  }, []);

  // Core search function
  const ejecutarBusqueda = useCallback(async (q: string, catId: number | null, urg: typeof urgencia = urgencia) => {
    if (!q.trim() && !catId) {
      setResultados([]);
      setBuscado(false);
      return;
    }

    setLoading(true);
    setBuscado(true);

    // Log search event (fire and forget)
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('eventos_busqueda').insert({
        query_texto: q.trim(),
        categoria_id: catId,
        corregimiento_buscado: null,
        usuario_id: user?.id || null,
        urgencia: urg,
        filtros_aplicados: catId ? { categoria_id: catId } : null,
      });
    });

    if (q.trim()) {
      const { data } = await supabase.rpc('buscar_servicios', {
        p_query: q.trim(),
        p_corregimiento: null,
        p_categoria_id: catId,
        p_limite: 20,
      });
      setResultados((data as ResultadoBusquedaServicio[]) || []);
    } else {
      // Category-only search
      let qb = supabase
        .from('servicios')
        .select(`
          id, titulo, descripcion, precio_base, corregimiento,
          rating_promedio, total_resenas, fotos,
          categoria:categorias(nombre),
          proveedor:perfiles!proveedor_id(nombre, avatar_url)
        `)
        .eq('activo', true)
        .limit(20);

      if (catId) qb = qb.eq('categoria_id', catId);

      const { data } = await qb;
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
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() && !categoriaId) {
      setResultados([]);
      setBuscado(false);
      return;
    }

    // Shorter debounce for short queries, immediate for category-only
    const delay = query.trim().length < 2 ? 500 : 300;

    debounceRef.current = setTimeout(() => {
      ejecutarBusqueda(query, categoriaId);
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, categoriaId, ejecutarBusqueda]);

  // Auto-search on mount if URL params
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted) return;
    setMounted(true);
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('cat') ? Number(searchParams.get('cat')) : null;
    if (q || cat) {
      ejecutarBusqueda(q, cat);
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    ejecutarBusqueda(query, categoriaId);
  }

  function selectCategoria(catId: number | null) {
    setCategoriaId((prev) => prev === catId ? null : catId);
  }

  function limpiar() {
    setQuery('');
    setCategoriaId(null);
    setResultados([]);
    setBuscado(false);
  }

  const categoriaNombre = categorias.find((c) => c.id === categoriaId)?.nombre;

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Search header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-stone-900 mb-1">Buscar servicios</h1>
          <p className="text-sm text-stone-500">Encuentra el profesional ideal para tu proyecto</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
            <div className="flex-1 flex items-center px-4">
              <svg className="w-5 h-5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe lo que necesitas... (ej: plomero, limpieza, pintar casa)"
                className="w-full px-3 py-3.5 text-stone-900 placeholder-stone-400 focus:outline-none text-[15px]"
              />
              {(query || categoriaId) && (
                <button
                  type="button"
                  onClick={limpiar}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            <button type="submit" className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 font-medium hover:from-teal-700 hover:to-teal-800 transition-all text-sm">
              Buscar
            </button>
          </div>
        </form>

        {/* Urgencia chips — quick signal with high data value */}
        <div className="flex gap-2 mb-3">
          {([
            { value: 'hoy', label: '🔥 Lo necesito hoy' },
            { value: 'esta_semana', label: '📅 Esta semana' },
            { value: 'flexible', label: '🌿 Sin prisa' },
          ] as const).map((u) => (
            <button
              key={u.value}
              onClick={() => setUrgencia(urgencia === u.value ? null : u.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                urgencia === u.value
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white border border-stone-200/80 text-stone-600 hover:border-amber-300 hover:text-amber-700'
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>

        {/* Category filter chips — always visible */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2 scrollbar-hide">
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => selectCategoria(c.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                categoriaId === c.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-stone-200/80 text-stone-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              <span className="text-base">{CATEGORY_ICONS[c.nombre] || '🛠️'}</span>
              {c.nombre}
            </button>
          ))}
        </div>

        {/* Active filters summary */}
        {buscado && (query || categoriaId) && (
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-stone-400">Filtrando por:</span>
            {query && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-xs font-medium text-stone-600">
                &ldquo;{query}&rdquo;
                <button onClick={() => setQuery('')} className="text-stone-400 hover:text-stone-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            )}
            {categoriaNombre && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-xs font-medium text-teal-700">
                {CATEGORY_ICONS[categoriaNombre] || '🛠️'} {categoriaNombre}
                <button onClick={() => setCategoriaId(null)} className="text-teal-400 hover:text-teal-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </span>
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden animate-pulse">
                <div className="h-36 bg-stone-100" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-stone-200 rounded w-3/4" />
                  <div className="h-4 bg-stone-100 rounded w-1/2" />
                  <div className="h-3 bg-stone-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && buscado && (
          <div>
            <p className="text-sm text-stone-500 mb-4">
              {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} encontrado{resultados.length !== 1 ? 's' : ''}
            </p>

            {resultados.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {resultados.map((s) => (
                  <Link
                    key={s.id}
                    href={`/servicio/${s.id}`}
                    className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden card-hover"
                  >
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
                        <span className="text-4xl opacity-40">
                          {CATEGORY_ICONS[s.categoria_nombre] || '🛠️'}
                        </span>
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
                          <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">
                            {CATEGORY_ICONS[s.categoria_nombre] || '🛠️'} {s.categoria_nombre}
                          </span>
                        )}
                        {s.corregimiento && <span>{s.corregimiento}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-stone-600 font-medium mb-1">No se encontraron servicios</p>
                <p className="text-sm text-stone-400 mb-6">Intenta con otros términos o explora las categorías</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['Electricista', 'Plomero', 'Limpieza', 'Pintor', 'Cerrajero'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setQuery(s)}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Initial state — no search yet, show category grid */}
        {!buscado && !loading && categorias.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-stone-500 mb-4">O explora por categoría</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categorias.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCategoria(c.id)}
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
      </main>
    </div>
  );
}
