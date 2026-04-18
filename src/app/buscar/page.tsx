'use client';

import { Suspense, useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import type { Categoria, ResultadoBusquedaServicio } from '@/types/database';

export default function BuscarPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--color-warm-bg)]">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center text-stone-400">Cargando...</div>
      </div>
    }>
      <BuscarContent />
    </Suspense>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  'Electricidad': '⚡', 'Plomería': '🔧', 'Limpieza': '✨', 'Pintura': '🎨',
  'Cerrajería': '🔑', 'Mudanzas': '📦', 'Jardinería': '🌿', 'Aire Acondicionado': '❄️',
  'Albañilería': '🧱', 'Tecnología': '💻',
};

const QUICK_SEARCHES = ['Electricista', 'Plomero', 'Limpieza del hogar', 'Pintor', 'Cerrajero', 'Jardinero'];

interface Proveedor {
  id: string;
  nombre: string;
  avatar_url: string | null;
  corregimiento: string | null;
  bio: string | null;
  rating_promedio: number;
  total_resenas: number;
  total_servicios: number;
  precio_desde: number | null;
  categorias_nombres: string[] | null;
}

function StarRating({ value, count }: { value: number; count: number }) {
  if (!value) return null;
  return (
    <span className="flex items-center gap-1 text-amber-500 font-medium text-xs">
      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      {value.toFixed(1)} <span className="text-stone-400 font-normal">({count})</span>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden animate-pulse">
      <div className="h-36 bg-stone-100" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-stone-200 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
        <div className="h-3 bg-stone-100 rounded w-full" />
      </div>
    </div>
  );
}

function SkeletonProvider() {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 flex gap-4 animate-pulse">
      <div className="w-14 h-14 rounded-xl bg-stone-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-stone-200 rounded w-1/2" />
        <div className="h-3 bg-stone-100 rounded w-3/4" />
        <div className="h-3 bg-stone-100 rounded w-1/3" />
      </div>
    </div>
  );
}

function BuscarContent() {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [categoriaId, setCategoriaId] = useState<number | null>(
    searchParams.get('cat') ? Number(searchParams.get('cat')) : null
  );
  const [urgencia, setUrgencia] = useState<'hoy' | 'esta_semana' | 'flexible' | null>(null);
  const [tab, setTab] = useState<'todo' | 'servicios' | 'proveedores'>('todo');
  const [soloPrecioCerrado, setSoloPrecioCerrado] = useState(false);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [servicios, setServicios] = useState<ResultadoBusquedaServicio[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [buscado, setBuscado] = useState(false);

  // Autocomplete
  const [inputFocused, setInputFocused] = useState(false);
  const [topQueries, setTopQueries] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showAutocomplete = inputFocused && !buscado && !loading && query.length === 0;

  // Init
  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });
    // Popular queries
    supabase.rpc('top_queries_busqueda', { p_limite: 8 }).then(({ data }) => {
      if (data) setTopQueries(data.map((r: any) => r.query_texto));
    });
    // Recent from localStorage
    try {
      const r = JSON.parse(localStorage.getItem('st_recientes') || '[]');
      setRecentSearches(r.slice(0, 5));
    } catch {}
  }, []);

  // Close autocomplete on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setInputFocused(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function saveRecent(q: string) {
    if (!q.trim()) return;
    try {
      const prev: string[] = JSON.parse(localStorage.getItem('st_recientes') || '[]');
      const updated = [q, ...prev.filter((x) => x !== q)].slice(0, 5);
      localStorage.setItem('st_recientes', JSON.stringify(updated));
      setRecentSearches(updated);
    } catch {}
  }

  const ejecutarBusqueda = useCallback(async (q: string, catId: number | null, urg = urgencia) => {
    if (!q.trim() && !catId) {
      setServicios([]);
      setProveedores([]);
      setBuscado(false);
      return;
    }

    setLoading(true);
    setBuscado(true);
    setInputFocused(false);

    if (q.trim()) saveRecent(q.trim());

    // Fire and forget analytics
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from('eventos_busqueda').insert({
        query_texto: q.trim() || null,
        categoria_id: catId,
        corregimiento_buscado: null,
        usuario_id: user?.id || null,
        urgencia: urg,
        filtros_aplicados: catId ? { categoria_id: catId } : null,
      });
    });

    // Run services + providers in parallel
    const [svcResult, pvdResult] = await Promise.all([
      // Services
      q.trim()
        ? supabase.rpc('buscar_servicios', {
            p_query: q.trim(),
            p_corregimiento: null,
            p_categoria_id: catId,
            p_limite: 20,
            p_solo_precio_cerrado: soloPrecioCerrado,
          })
        : (() => {
            let qb = supabase
              .from('servicios')
              .select(`id, titulo, descripcion, precio_base, corregimiento, rating_promedio, total_resenas, fotos, precio_desde_paquete, tiene_paquetes_fijos, categoria:categorias(nombre), proveedor:perfiles!proveedor_id(nombre, avatar_url)`)
              .eq('activo', true)
              .eq('categoria_id', catId!);
            if (soloPrecioCerrado) qb = qb.eq('tiene_paquetes_fijos', true);
            return qb.order('tiene_paquetes_fijos', { ascending: false }).limit(20);
          })(),

      // Providers
      supabase.rpc('buscar_proveedores', {
        p_query: q.trim() || null,
        p_categoria_id: catId,
        p_limite: 12,
      }),
    ]);

    // Normalize services
    if (q.trim()) {
      setServicios((svcResult.data as ResultadoBusquedaServicio[]) || []);
    } else {
      setServicios(
        ((svcResult.data || []) as any[]).map((s) => ({
          id: s.id, titulo: s.titulo, descripcion: s.descripcion,
          precio_base: s.precio_base, corregimiento: s.corregimiento,
          categoria_nombre: s.categoria?.nombre || '',
          proveedor_nombre: s.proveedor?.nombre || '',
          proveedor_avatar: s.proveedor?.avatar_url,
          rating_promedio: s.rating_promedio, total_resenas: s.total_resenas,
          fotos: s.fotos || [], relevancia: 0,
          precio_desde_paquete: s.precio_desde_paquete,
          tiene_paquetes_fijos: s.tiene_paquetes_fijos,
        }))
      );
    }

    setProveedores((pvdResult.data as Proveedor[]) || []);
    setLoading(false);
  }, [urgencia, soloPrecioCerrado]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce on query/category change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() && !categoriaId) {
      setServicios([]); setProveedores([]); setBuscado(false);
      return;
    }
    const delay = query.trim().length < 2 ? 500 : 300;
    debounceRef.current = setTimeout(() => ejecutarBusqueda(query, categoriaId), delay);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, categoriaId, soloPrecioCerrado]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-search from URL params
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (mounted) return;
    setMounted(true);
    const q = searchParams.get('q') || '';
    const cat = searchParams.get('cat') ? Number(searchParams.get('cat')) : null;
    if (q || cat) ejecutarBusqueda(q, cat);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    ejecutarBusqueda(query, categoriaId);
  }

  function pickSuggestion(q: string) {
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    ejecutarBusqueda(q, categoriaId);
  }

  function limpiar() {
    setQuery(''); setCategoriaId(null);
    setServicios([]); setProveedores([]);
    setBuscado(false); setTab('todo');
  }

  const categoriaNombre = categorias.find((c) => c.id === categoriaId)?.nombre;
  const totalServicios = servicios.length;
  const totalProveedores = proveedores.length;
  const totalTodo = totalServicios + totalProveedores;

  const visibleServicios = tab === 'proveedores' ? [] : servicios;
  const visibleProveedores = tab === 'servicios' ? [] : proveedores;

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold text-stone-900 mb-0.5">Buscar en ServiTrust</h1>
          <p className="text-sm text-stone-500">Servicios y profesionales verificados en Panamá</p>
        </div>

        {/* Search bar with autocomplete */}
        <div className="relative mb-4" ref={autocompleteRef}>
          <form onSubmit={handleSubmit}>
            <div className={`flex bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              inputFocused ? 'border-teal-500 ring-2 ring-teal-500/15' : 'border-stone-200/80'
            }`}>
              <div className="flex-1 flex items-center px-4 gap-3">
                {loading ? (
                  <svg className="w-5 h-5 text-teal-500 shrink-0 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  placeholder="Busca un servicio o profesional... (ej: plomero, Carlos, limpieza)"
                  className="w-full py-3.5 text-stone-900 placeholder-stone-400 focus:outline-none text-[15px] bg-transparent"
                />
                {(query || categoriaId) && (
                  <button type="button" onClick={limpiar} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button type="submit" className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 font-semibold hover:from-teal-700 hover:to-teal-800 transition-all text-sm shrink-0">
                Buscar
              </button>
            </div>
          </form>

          {/* Autocomplete dropdown */}
          {showAutocomplete && (recentSearches.length > 0 || topQueries.length > 0 || QUICK_SEARCHES.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-stone-200/80 shadow-lg z-30 overflow-hidden">
              {recentSearches.length > 0 && (
                <div className="px-4 pt-3 pb-2">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Búsquedas recientes</p>
                  <div className="space-y-0.5">
                    {recentSearches.map((r) => (
                      <button
                        key={r}
                        onClick={() => pickSuggestion(r)}
                        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors text-left group"
                      >
                        <svg className="w-3.5 h-3.5 text-stone-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-stone-600 group-hover:text-stone-900">{r}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {topQueries.length > 0 && (
                <div className={`px-4 pb-2 ${recentSearches.length > 0 ? 'pt-2 border-t border-stone-100' : 'pt-3'}`}>
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">🔥 Más buscado</p>
                  <div className="flex flex-wrap gap-1.5">
                    {topQueries.map((q) => (
                      <button
                        key={q}
                        onClick={() => pickSuggestion(q)}
                        className="px-3 py-1 rounded-full bg-stone-100 hover:bg-teal-50 hover:text-teal-700 text-xs font-medium text-stone-600 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 py-2 border-t border-stone-100">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Sugerencias rápidas</p>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {QUICK_SEARCHES.map((s) => (
                    <button
                      key={s}
                      onClick={() => pickSuggestion(s)}
                      className="px-3 py-1 rounded-full border border-stone-200 hover:border-teal-300 hover:text-teal-700 text-xs text-stone-500 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Trust filter: precio cerrado */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSoloPrecioCerrado(!soloPrecioCerrado)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
              soloPrecioCerrado
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-stone-200/80 text-stone-600 hover:border-emerald-300 hover:text-emerald-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Solo precio cerrado
          </button>
        </div>

        {/* Urgencia chips */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
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

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaId((prev) => prev === c.id ? null : c.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                categoriaId === c.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-stone-200/80 text-stone-600 hover:border-teal-300 hover:text-teal-700'
              }`}
            >
              <span className="text-base leading-none">{CATEGORY_ICONS[c.nombre] || '🛠️'}</span>
              {c.nombre}
            </button>
          ))}
        </div>

        {/* ── Results area ── */}
        {loading && (
          <div>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              {[1, 2].map((i) => <SkeletonProvider key={i} />)}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        )}

        {!loading && buscado && (
          <div>
            {/* Tabs + count */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
                {([
                  { key: 'todo', label: 'Todo', count: totalTodo },
                  { key: 'servicios', label: 'Servicios', count: totalServicios },
                  { key: 'proveedores', label: 'Profesionales', count: totalProveedores },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      tab === t.key
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-700'
                    }`}
                  >
                    {t.label}
                    {t.count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        tab === t.key ? 'bg-teal-100 text-teal-700' : 'bg-stone-200 text-stone-500'
                      }`}>
                        {t.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {(query || categoriaId) && (
                <div className="flex items-center gap-2">
                  {query && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 text-xs font-medium text-stone-600">
                      &ldquo;{query}&rdquo;
                      <button onClick={() => setQuery('')} className="text-stone-400 hover:text-stone-600 ml-0.5">✕</button>
                    </span>
                  )}
                  {categoriaNombre && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-xs font-medium text-teal-700">
                      {CATEGORY_ICONS[categoriaNombre] || '🛠️'} {categoriaNombre}
                      <button onClick={() => setCategoriaId(null)} className="text-teal-400 hover:text-teal-600 ml-0.5">✕</button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {totalTodo === 0 ? (
              /* Empty state */
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-stone-700 font-semibold mb-1">Sin resultados para &ldquo;{query}&rdquo;</p>
                <p className="text-sm text-stone-400 mb-6">Prueba con otros términos o explora las categorías</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_SEARCHES.map((s) => (
                    <button key={s} onClick={() => setQuery(s)}
                      className="px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium hover:bg-teal-50 hover:text-teal-700 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-8">

                {/* ── Provider cards ── */}
                {visibleProveedores.length > 0 && (
                  <div>
                    {tab === 'todo' && (
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-teal-100 flex items-center justify-center text-teal-600 text-xs">👤</span>
                          Profesionales
                        </h2>
                        {totalProveedores > 3 && (
                          <button onClick={() => setTab('proveedores')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                            Ver todos ({totalProveedores}) →
                          </button>
                        )}
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {(tab === 'todo' ? visibleProveedores.slice(0, 4) : visibleProveedores).map((p) => (
                        <Link
                          key={p.id}
                          href={`/proveedor/${p.id}`}
                          className="group bg-white rounded-2xl border border-stone-200/80 p-4 flex gap-4 card-hover"
                        >
                          {/* Avatar */}
                          <div className="shrink-0">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt={p.nombre}
                                className="w-14 h-14 rounded-xl object-cover ring-2 ring-stone-100 group-hover:ring-teal-200 transition-all" />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-display font-bold text-xl shadow-sm">
                                {p.nombre[0]}
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="font-semibold text-stone-900 group-hover:text-teal-700 transition-colors truncate">
                                  {p.nombre}
                                </h3>
                                {p.corregimiento && (
                                  <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    {p.corregimiento}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                                ✓ Verificado
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {p.rating_promedio > 0 && (
                                <StarRating value={p.rating_promedio} count={p.total_resenas} />
                              )}
                              <span className="text-xs text-stone-400">
                                {p.total_servicios} servicio{p.total_servicios !== 1 ? 's' : ''}
                              </span>
                              {p.precio_desde && (
                                <span className="text-xs font-semibold text-teal-600">
                                  desde ${p.precio_desde.toFixed(0)}
                                </span>
                              )}
                            </div>

                            {p.categorias_nombres && p.categorias_nombres.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">
                                {p.categorias_nombres.slice(0, 3).map((cat) => (
                                  <span key={cat} className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-500 text-[10px] font-medium">
                                    {CATEGORY_ICONS[cat] || '🛠️'} {cat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Service cards ── */}
                {visibleServicios.length > 0 && (
                  <div>
                    {tab === 'todo' && (
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-amber-100 flex items-center justify-center text-amber-600 text-xs">🛠️</span>
                          Servicios
                        </h2>
                        {totalServicios > 4 && (
                          <button onClick={() => setTab('servicios')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">
                            Ver todos ({totalServicios}) →
                          </button>
                        )}
                      </div>
                    )}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {(tab === 'todo' ? visibleServicios.slice(0, 4) : visibleServicios).map((s) => (
                        <Link key={s.id} href={`/servicio/${s.id}`}
                          className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden card-hover">
                          {s.fotos && s.fotos.length > 0 ? (
                            <div className="h-40 bg-stone-100 overflow-hidden">
                              <img src={s.fotos[0]} alt={s.titulo}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                          ) : (
                            <div className="h-32 bg-gradient-to-br from-teal-50 to-stone-50 flex items-center justify-center">
                              <span className="text-4xl opacity-40">{CATEGORY_ICONS[s.categoria_nombre] || '🛠️'}</span>
                            </div>
                          )}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-stone-900 truncate group-hover:text-teal-700 transition-colors text-[15px]">
                                  {s.titulo}
                                </h3>
                                <p className="text-xs text-stone-500">{s.proveedor_nombre}</p>
                              </div>
                              <div className="text-right shrink-0">
                                {s.tiene_paquetes_fijos && s.precio_desde_paquete ? (
                                  <>
                                    <div className="text-[10px] text-stone-500 leading-none">desde</div>
                                    <div className="text-base font-display font-bold text-teal-600 leading-tight">
                                      ${Number(s.precio_desde_paquete).toFixed(0)}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-base font-display font-bold text-teal-600">
                                    ${s.precio_base.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {s.tiene_paquetes_fijos && (
                              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full mb-2">
                                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                Precio cerrado
                              </div>
                            )}
                            {s.descripcion && (
                              <p className="text-xs text-stone-400 line-clamp-2 mb-2">{s.descripcion}</p>
                            )}
                            <div className="flex items-center gap-2.5 text-xs text-stone-400">
                              <StarRating value={s.rating_promedio} count={s.total_resenas} />
                              {s.categoria_nombre && (
                                <span className="px-2 py-0.5 rounded-full bg-stone-100">
                                  {CATEGORY_ICONS[s.categoria_nombre] || '🛠️'} {s.categoria_nombre}
                                </span>
                              )}
                              {s.corregimiento && <span>{s.corregimiento}</span>}
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Initial state: category grid */}
        {!buscado && !loading && categorias.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-stone-500 mb-4">O explora por categoría</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {categorias.map((c) => (
                <button key={c.id}
                  onClick={() => setCategoriaId((prev) => prev === c.id ? null : c.id)}
                  className="group bg-white rounded-2xl border border-stone-200/80 p-5 text-center card-hover">
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
