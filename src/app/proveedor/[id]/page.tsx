'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import Navbar from '@/components/navbar';
import { createClient } from '@/lib/supabase';

interface Proveedor {
  id: string;
  nombre: string;
  nombre_comercial: string | null;
  avatar_url: string | null;
  corregimiento: string | null;
  bio: string | null;
  verificado: boolean;
  anos_experiencia: number | null;
  certificaciones: string[] | null;
  idiomas: string[] | null;
  area_cobertura: string[] | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  sitio_web: string | null;
  rating_promedio: number | null;
  total_resenas: number | null;
  activo: boolean;
  es_proveedor: boolean;
  created_at: string;
}

interface ServicioPublico {
  id: string;
  titulo: string;
  descripcion: string | null;
  precio_base: number;
  precio_desde_paquete: number | null;
  tiene_paquetes_fijos: boolean;
  fotos: string[] | null;
  corregimiento: string;
  rating_promedio: number;
  total_resenas: number;
  activo: boolean;
  categoria: { id: string; nombre: string; icono: string | null } | null;
}

interface ResenaPublica {
  id: string;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  autor: { nombre: string; avatar_url: string | null } | null;
  trabajo: { servicio: { titulo: string } | null } | null;
}

export default function ProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const supabase = createClient();
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [prov, setProv] = useState<Proveedor | null>(null);
  const [servicios, setServicios] = useState<ServicioPublico[]>([]);
  const [resenas, setResenas] = useState<ResenaPublica[]>([]);
  const [trabajosCompletados, setTrabajosCompletados] = useState(0);

  useEffect(() => {
    (async () => {
      const [pRes, sRes, rRes, tRes] = await Promise.all([
        supabase
          .from('perfiles')
          .select('id, nombre, nombre_comercial, avatar_url, corregimiento, bio, verificado, anos_experiencia, certificaciones, idiomas, area_cobertura, instagram, facebook, tiktok, sitio_web, rating_promedio, total_resenas, activo, es_proveedor, created_at')
          .eq('id', id)
          .single(),
        supabase
          .from('servicios')
          .select('id, titulo, descripcion, precio_base, precio_desde_paquete, tiene_paquetes_fijos, fotos, corregimiento, rating_promedio, total_resenas, activo, categoria:categorias(id, nombre, icono)')
          .eq('proveedor_id', id)
          .eq('activo', true)
          .order('tiene_paquetes_fijos', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('resenas')
          .select('id, estrellas, comentario, created_at, autor:perfiles!autor_id(nombre, avatar_url), trabajo:trabajos!inner(proveedor_id, servicio:servicios(titulo))')
          .eq('trabajo.proveedor_id', id)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('solicitudes_trabajo')
          .select('id', { count: 'exact', head: true })
          .eq('proveedor_id', id)
          .eq('estado', 'completado_fondos_liberados'),
      ]);

      if (pRes.error || !pRes.data || !pRes.data.es_proveedor || !pRes.data.activo) {
        setCargando(false);
        return;
      }

      setProv(pRes.data as unknown as Proveedor);
      setServicios((sRes.data as unknown as ServicioPublico[]) || []);
      setResenas((rRes.data as unknown as ResenaPublica[]) || []);
      setTrabajosCompletados(tRes.count || 0);
      setCargando(false);
    })();
  }, [id]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-[var(--color-warm-bg)]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-stone-400">Cargando perfil...</div>
      </div>
    );
  }

  if (!prov) return notFound();

  // Agrupar servicios por categoría
  const porCategoria = servicios.reduce((acc, s) => {
    const key = s.categoria?.nombre || 'Otros';
    if (!acc[key]) acc[key] = { icono: s.categoria?.icono || '🛠️', items: [] };
    acc[key].items.push(s);
    return acc;
  }, {} as Record<string, { icono: string; items: ServicioPublico[] }>);

  const categoriasOrdenadas = Object.entries(porCategoria).sort((a, b) => b[1].items.length - a[1].items.length);

  const nombreMostrar = prov.nombre_comercial || prov.nombre;
  const initial = nombreMostrar[0]?.toUpperCase() || 'P';

  const mesAntig = Math.floor((Date.now() - new Date(prov.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30));
  const antiguedad = mesAntig < 1 ? 'Recién llegado' : mesAntig < 12 ? `${mesAntig} mes${mesAntig !== 1 ? 'es' : ''} en la plataforma` : `${Math.floor(mesAntig / 12)} año${Math.floor(mesAntig / 12) !== 1 ? 's' : ''} en la plataforma`;

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <button onClick={() => router.back()} className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1">
          ← Volver
        </button>

        {/* HERO */}
        <section className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8 shadow-warm">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-display font-bold text-4xl shrink-0 overflow-hidden shadow-lg ring-4 ring-white">
              {prov.avatar_url ? (
                <img src={prov.avatar_url} alt={nombreMostrar} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>

            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-stone-900">{nombreMostrar}</h1>
                    {prov.verificado && (
                      <span
                        title="Identidad y documentación revisadas manualmente por nuestro equipo"
                        className="inline-flex items-center gap-1 bg-teal-100 text-teal-700 text-[11px] font-bold px-2 py-0.5 rounded-full cursor-help"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        VERIFICADO
                      </span>
                    )}
                  </div>
                  {prov.nombre_comercial && prov.nombre_comercial !== prov.nombre && (
                    <p className="text-sm text-stone-500 mt-0.5">Representante: {prov.nombre}</p>
                  )}
                  <p className="text-sm text-stone-500 mt-1">{antiguedad}</p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {prov.corregimiento && (
                  <span className="inline-flex items-center gap-1 text-xs text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
                    📍 {prov.corregimiento}
                  </span>
                )}
                {prov.anos_experiencia != null && prov.anos_experiencia > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                    🎓 {prov.anos_experiencia} año{prov.anos_experiencia !== 1 ? 's' : ''} de experiencia
                  </span>
                )}
              </div>

              {/* Rating row */}
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-stone-100 flex-wrap">
                {(prov.rating_promedio ?? 0) > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <svg key={s} className={`w-4 h-4 ${s <= Math.round(prov.rating_promedio ?? 0) ? 'text-amber-400' : 'text-stone-200'} fill-current`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-stone-800">{prov.rating_promedio?.toFixed(1)}</span>
                    <span className="text-xs text-stone-500">({prov.total_resenas} reseña{prov.total_resenas !== 1 ? 's' : ''})</span>
                  </div>
                ) : (
                  <span className="text-xs text-stone-400">Aún sin reseñas</span>
                )}

                <div className="text-xs text-stone-500">
                  <span className="font-semibold text-stone-800">{servicios.length}</span> servicio{servicios.length !== 1 ? 's' : ''} activo{servicios.length !== 1 ? 's' : ''}
                </div>

                {trabajosCompletados > 0 && (
                  <div className="text-xs text-stone-500">
                    <span className="font-semibold text-stone-800">{trabajosCompletados}</span> trabajo{trabajosCompletados !== 1 ? 's' : ''} completado{trabajosCompletados !== 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Redes sociales */}
              {(prov.instagram || prov.facebook || prov.tiktok || prov.sitio_web) && (
                <div className="flex items-center gap-2 mt-4 flex-wrap">
                  {prov.instagram && (
                    <a href={`https://instagram.com/${prov.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-pink-600 bg-stone-50 hover:bg-pink-50 px-2.5 py-1 rounded-full transition-colors">
                      📷 Instagram
                    </a>
                  )}
                  {prov.facebook && (
                    <a href={prov.facebook.startsWith('http') ? prov.facebook : `https://facebook.com/${prov.facebook}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-blue-600 bg-stone-50 hover:bg-blue-50 px-2.5 py-1 rounded-full transition-colors">
                      f Facebook
                    </a>
                  )}
                  {prov.tiktok && (
                    <a href={`https://tiktok.com/@${prov.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 bg-stone-50 hover:bg-stone-200 px-2.5 py-1 rounded-full transition-colors">
                      🎵 TikTok
                    </a>
                  )}
                  {prov.sitio_web && (
                    <a href={prov.sitio_web.startsWith('http') ? prov.sitio_web : `https://${prov.sitio_web}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-teal-700 bg-stone-50 hover:bg-teal-50 px-2.5 py-1 rounded-full transition-colors">
                      🌐 Sitio web
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* BIO */}
        {prov.bio && (
          <section className="bg-white rounded-2xl border border-stone-200/80 p-6">
            <h2 className="font-display text-lg font-bold text-stone-900 mb-2">Sobre {nombreMostrar.split(' ')[0]}</h2>
            <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{prov.bio}</p>

            {/* Certs / idiomas / zonas */}
            <div className="grid sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-stone-100">
              {prov.certificaciones && prov.certificaciones.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">🎓 Certificaciones</p>
                  <div className="flex flex-wrap gap-1">
                    {prov.certificaciones.map((c) => (
                      <span key={c} className="text-xs bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded-full">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              {prov.idiomas && prov.idiomas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">🗣️ Idiomas</p>
                  <div className="flex flex-wrap gap-1">
                    {prov.idiomas.map((i) => (
                      <span key={i} className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full">{i}</span>
                    ))}
                  </div>
                </div>
              )}
              {prov.area_cobertura && prov.area_cobertura.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">📍 Zonas de cobertura</p>
                  <div className="flex flex-wrap gap-1">
                    {prov.area_cobertura.slice(0, 6).map((z) => (
                      <span key={z} className="text-xs bg-teal-50 text-teal-700 border border-teal-100 px-2 py-0.5 rounded-full">{z}</span>
                    ))}
                    {prov.area_cobertura.length > 6 && (
                      <span className="text-xs text-stone-400">+{prov.area_cobertura.length - 6} más</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SERVICIOS AGRUPADOS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-bold text-stone-900">
              Servicios que ofrece
              <span className="ml-2 text-sm font-normal text-stone-500">({servicios.length})</span>
            </h2>
          </div>

          {servicios.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center text-stone-500 text-sm">
              Este proveedor aún no tiene servicios publicados.
            </div>
          ) : (
            <div className="space-y-6">
              {categoriasOrdenadas.map(([cat, { icono, items }]) => (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">{icono}</span>
                    <h3 className="font-display text-base font-bold text-stone-800">{cat}</h3>
                    <span className="text-xs text-stone-400">({items.length})</span>
                    <div className="flex-1 h-px bg-stone-200 ml-2" />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {items.map((s) => {
                      const precio = s.tiene_paquetes_fijos && s.precio_desde_paquete != null ? s.precio_desde_paquete : s.precio_base;
                      return (
                        <Link key={s.id} href={`/servicio/${s.id}`}
                          className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden card-hover flex flex-col">
                          {s.fotos && s.fotos.length > 0 ? (
                            <div className="aspect-[16/9] bg-stone-100 overflow-hidden">
                              <img src={s.fotos[0]} alt={s.titulo} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          ) : (
                            <div className="aspect-[16/9] bg-gradient-to-br from-teal-50 to-amber-50 flex items-center justify-center text-4xl">{icono}</div>
                          )}
                          <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-stone-900 text-sm leading-tight group-hover:text-teal-700 line-clamp-2">
                                {s.titulo}
                              </h4>
                              <div className="text-right shrink-0">
                                {s.tiene_paquetes_fijos && <p className="text-[10px] text-stone-400 leading-none">desde</p>}
                                <p className="font-display font-bold text-teal-700 text-base leading-tight">${Number(precio).toFixed(0)}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                              <div className="flex items-center gap-2 text-[11px] text-stone-500">
                                {s.rating_promedio > 0 && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <svg className="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    {s.rating_promedio.toFixed(1)} ({s.total_resenas})
                                  </span>
                                )}
                                <span>📍 {s.corregimiento}</span>
                              </div>
                              {s.tiene_paquetes_fijos && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                  ✓ Precio cerrado
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RESEÑAS RECIENTES */}
        {resenas.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-bold text-stone-900 mb-4">
              Reseñas recientes
              <span className="ml-2 text-sm font-normal text-stone-500">({prov.total_resenas})</span>
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {resenas.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-stone-200/80 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-semibold text-sm shrink-0 overflow-hidden">
                      {r.autor?.avatar_url ? (
                        <img src={r.autor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        r.autor?.nombre?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-stone-900 truncate">{r.autor?.nombre || 'Cliente'}</p>
                        <div className="flex items-center shrink-0">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <svg key={s} className={`w-3 h-3 ${s <= r.estrellas ? 'text-amber-400' : 'text-stone-200'} fill-current`} viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                      {r.trabajo?.servicio?.titulo && (
                        <p className="text-[11px] text-stone-400 truncate">sobre: {r.trabajo.servicio.titulo}</p>
                      )}
                      {r.comentario && (
                        <p className="text-sm text-stone-700 leading-relaxed mt-2">{r.comentario}</p>
                      )}
                      <p className="text-[11px] text-stone-400 mt-2">
                        {new Date(r.created_at).toLocaleDateString('es-PA', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FOOTER CTA */}
        {servicios.length > 0 && (
          <section className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-6 md:p-8 text-center text-white">
            <h2 className="font-display text-xl md:text-2xl font-bold mb-2">
              ¿Te interesa contratar a {nombreMostrar.split(' ')[0]}?
            </h2>
            <p className="text-teal-100 text-sm mb-4">Elige uno de sus servicios y agenda directo desde el chat.</p>
            <Link href={`#servicios`} onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 400, behavior: 'smooth' });
            }} className="inline-block bg-white text-teal-700 font-semibold px-6 py-2.5 rounded-xl hover:bg-teal-50 transition-colors">
              Ver servicios disponibles
            </Link>
          </section>
        )}
      </main>
    </div>
  );
}
