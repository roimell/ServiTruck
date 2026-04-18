'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import type { Categoria } from '@/types/database';

interface ResenaDestacada {
  id: string;
  calificacion: number;
  comentario: string | null;
  created_at: string;
  autor: { nombre: string; avatar_url: string | null } | null;
}

export default function HomePage() {
  const supabase = createClient();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState<{ profesionales: number; servicios: number; ratingProm: number; completados: number } | null>(null);
  const [resenasDestacadas, setResenasDestacadas] = useState<ResenaDestacada[]>([]);

  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });

    // Stats reales en paralelo
    (async () => {
      const [profRes, servRes, trabajosRes, resenasAggRes] = await Promise.all([
        supabase.from('perfiles').select('id', { count: 'exact', head: true }).eq('es_proveedor', true),
        supabase.from('servicios').select('id', { count: 'exact', head: true }).eq('activo', true),
        supabase.from('trabajos').select('id', { count: 'exact', head: true }).eq('estado', 'completado_fondos_liberados'),
        supabase.from('resenas').select('calificacion'),
      ]);
      const calis = (resenasAggRes.data || []).map((r: any) => r.calificacion);
      const prom = calis.length ? calis.reduce((a, b) => a + b, 0) / calis.length : 0;
      setStats({
        profesionales: profRes.count || 0,
        servicios: servRes.count || 0,
        completados: trabajosRes.count || 0,
        ratingProm: Math.round(prom * 10) / 10,
      });

      // Reseñas reales (máx 3, 4+ estrellas, con comentario)
      const { data: rds } = await supabase
        .from('resenas')
        .select('id, calificacion, comentario, created_at, autor:perfiles!autor_id(nombre, avatar_url)')
        .gte('calificacion', 4)
        .not('comentario', 'is', null)
        .order('created_at', { ascending: false })
        .limit(3);
      if (rds) setResenasDestacadas(rds as any);
    })();
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/buscar?q=${encodeURIComponent(query.trim())}`;
    }
  }

  const CATEGORY_ICONS: Record<string, string> = {
    'Electricidad': '⚡',
    'Plomería': '🔧',
    'Limpieza': '✨',
    'Pintura': '🎨',
    'Cerrajería': '🔑',
    'Mudanzas': '📦',
    'Jardinería': '🌿',
    'Aire Acondicionado': '❄️',
    'Albañilería': '🧱',
    'Tecnología': '💻',
  };

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="hero-gradient noise relative">
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28">
          {/* Trust badge */}
          <div className="animate-in flex justify-center mb-6">
            <div className="trust-badge !bg-white/10 !border-white/20 !text-teal-100">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Plataforma #1 de servicios en Panamá
            </div>
          </div>

          <h1 className="animate-in animate-in-delay-1 text-center font-display text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight">
            Profesionales de confianza,{' '}
            <span className="relative inline-block">
              <span className="relative z-10">cerca de ti</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-amber-400/30 rounded-full -z-0" />
            </span>
          </h1>

          <p className="animate-in animate-in-delay-2 text-center text-teal-100 text-lg md:text-xl mt-5 mb-10 max-w-2xl mx-auto leading-relaxed">
            Encuentra al experto ideal para tu proyecto. Chatea, acuerda y agenda
            — directo con el profesional.
          </p>

          {/* Search */}
          <div className="animate-in animate-in-delay-3 max-w-xl mx-auto">
            <form onSubmit={handleSearch}>
              <div className="flex bg-white rounded-2xl shadow-2xl shadow-black/10 overflow-hidden ring-1 ring-white/20">
                <div className="flex-1 flex items-center px-5">
                  <svg className="w-5 h-5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="¿Qué necesitas? (ej: electricista, plomero...)"
                    className="w-full px-3 py-4 text-stone-900 placeholder-stone-400 focus:outline-none text-[15px]"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-7 font-medium hover:from-teal-700 hover:to-teal-800 transition-all text-sm"
                >
                  Buscar
                </button>
              </div>
            </form>

            {/* Quick suggestions */}
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {['Electricista', 'Plomero', 'Limpieza', 'Pintor'].map((s) => (
                <Link
                  key={s}
                  href={`/buscar?q=${s}`}
                  className="px-3 py-1 rounded-full bg-white/10 text-teal-100 text-xs font-medium
                    hover:bg-white/20 transition-colors border border-white/10"
                >
                  {s}
                </Link>
              ))}
            </div>
          </div>

          {/* Stats bar — datos reales */}
          {stats && (stats.profesionales > 0 || stats.servicios > 0) && (
            <div className="animate-in animate-in-delay-4 mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <StatBlock value={stats.profesionales} label="Profesionales activos" />
              <StatBlock value={stats.servicios} label="Servicios disponibles" />
              {stats.ratingProm > 0 ? (
                <StatBlock value={stats.ratingProm.toFixed(1)} label="Calificación promedio" icon="★" />
              ) : (
                <StatBlock value={stats.completados} label="Trabajos completados" />
              )}
              <StatBlock value="24/7" label="Soporte disponible" literal />
            </div>
          )}

          {/* Trust row — garantías */}
          <div className="animate-in animate-in-delay-4 mt-10 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {[
              { i: '🛡️', t: 'Proveedores verificados' },
              { i: '⚡', t: 'Respuesta en minutos' },
              { i: '⭐', t: 'Reseñas reales de clientes' },
              { i: '🇵🇦', t: '100% Panamá' },
            ].map((x) => (
              <span key={x.t} className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 text-teal-50 text-xs font-medium px-3 py-1.5 rounded-full backdrop-blur-sm">
                <span>{x.i}</span> {x.t}
              </span>
            ))}
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
            <path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="var(--color-warm-bg)" />
          </svg>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-14">
          <p className="text-teal-600 font-medium text-sm tracking-wide uppercase mb-2">Simple y transparente</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900">Cómo funciona</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 md:gap-6">
          {[
            {
              step: '01',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ),
              title: 'Busca y elige',
              desc: 'Encuentra el profesional ideal en tu zona. Compara precios, reseñas y portafolios reales.',
              color: 'teal',
            },
            {
              step: '02',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
              title: 'Negocia directo',
              desc: 'Chatea con el profesional, acuerda el precio y recibe una cotización formal en segundos.',
              color: 'amber',
            },
            {
              step: '03',
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'Agenda y listo',
              desc: 'Coordina la fecha, recibe el servicio y deja tu reseña. Transparencia de principio a fin.',
              color: 'emerald',
            },
          ].map((step, i) => (
            <div
              key={i}
              className="relative bg-white rounded-2xl border border-stone-200/80 p-7 card-hover group"
            >
              {/* Step number */}
              <span className="absolute top-6 right-6 font-display text-5xl font-bold text-stone-100 group-hover:text-teal-50 transition-colors">
                {step.step}
              </span>

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                step.color === 'teal' ? 'bg-teal-50 text-teal-600' :
                step.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                'bg-emerald-50 text-emerald-600'
              }`}>
                {step.icon}
              </div>
              <h3 className="font-display text-lg font-bold text-stone-900 mb-2">{step.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      {categorias.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          <div className="text-center mb-10">
            <p className="text-teal-600 font-medium text-sm tracking-wide uppercase mb-2">Explora por categoría</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900">¿Qué necesitas hoy?</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/buscar?cat=${c.id}`}
                className="group bg-white rounded-2xl border border-stone-200/80 p-5 text-center card-hover"
              >
                <span className="text-2xl mb-2 block">
                  {CATEGORY_ICONS[c.nombre] || '🛠️'}
                </span>
                <span className="text-sm font-medium text-stone-700 group-hover:text-teal-700 transition-colors">
                  {c.nombre}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Reseñas reales ── (solo si hay) */}
      {resenasDestacadas.length > 0 && (
        <section className="bg-stone-50 border-y border-stone-200/60">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
            <div className="text-center mb-12">
              <p className="text-teal-600 font-medium text-sm tracking-wide uppercase mb-2">Reseñas verificadas</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900">Clientes reales. Experiencias reales.</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {resenasDestacadas.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl border border-stone-200/80 p-6 card-hover">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: r.calificacion }).map((_, j) => (
                      <svg key={j} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-stone-700 text-sm leading-relaxed mb-5">
                    &ldquo;{r.comentario}&rdquo;
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
                      {r.autor?.avatar_url ? (
                        <img src={r.autor.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        r.autor?.nombre?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{r.autor?.nombre || 'Cliente'}</p>
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <svg className="w-3 h-3 text-teal-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                        Reseña verificada
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Provider CTA ── */}
      <section className="relative overflow-hidden">
        <div className="hero-gradient noise">
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-20">
            <div className="md:flex items-center gap-12">
              <div className="flex-1 mb-8 md:mb-0">
                <div className="trust-badge !bg-white/10 !border-white/20 !text-teal-100 mb-5">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" />
                  </svg>
                  Haz crecer tu negocio
                </div>
                <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
                  Tu talento merece más clientes
                </h2>
                <p className="text-teal-100 leading-relaxed mb-6 max-w-lg">
                  Únete a la red de profesionales de ServiTrust. Recibe solicitudes en tu zona
                  y accede a datos de demanda que nadie más te da.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    'Clientes reales buscando en tu zona cada día',
                    'Datos exclusivos: qué buscan y nadie ofrece en tu zona',
                    'Perfil profesional con reseñas que generan confianza',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-teal-50 text-sm">{item}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/auth/registro"
                  className="inline-flex items-center gap-2 bg-white text-teal-700 font-semibold px-7 py-3.5 rounded-xl
                    hover:bg-teal-50 transition-all shadow-lg shadow-black/10 group"
                >
                  Registrarme como proveedor
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>

              {/* Visual element — trust illustration */}
              <div className="hidden md:block flex-shrink-0">
                <div className="relative w-72 h-72">
                  {/* Floating cards */}
                  <div className="absolute top-0 left-4 bg-white/95 rounded-2xl p-4 shadow-xl float" style={{ animationDelay: '0s' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-white text-lg">⚡</div>
                      <div>
                        <p className="font-semibold text-stone-900 text-sm">Nueva solicitud</p>
                        <p className="text-xs text-stone-400">Electricista en Bella Vista</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute bottom-12 left-0 bg-white/95 rounded-2xl p-4 shadow-xl float" style={{ animationDelay: '2s' }}>
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5">
                        {['🟢', '🔵', '🟡'].map((c, i) => (
                          <div key={i} className="w-7 h-7 rounded-full bg-stone-200 border-2 border-white flex items-center justify-center text-xs">{c}</div>
                        ))}
                      </div>
                      <div className="ml-1">
                        <p className="text-xs font-semibold text-stone-900">+23 clientes</p>
                        <p className="text-[10px] text-stone-400">buscan esta semana</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-24 right-0 bg-white/95 rounded-2xl p-4 shadow-xl float" style={{ animationDelay: '4s' }}>
                    <div className="text-center">
                      <p className="text-2xl font-display font-bold text-teal-600">$1,250</p>
                      <p className="text-[10px] text-stone-400 uppercase tracking-wide">ganado este mes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-stone-200/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="font-display font-bold text-stone-900 text-lg">
                  Servi<span className="text-teal-600">Trust</span>
                </span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed">
                Conectamos a Panamá con profesionales de confianza. Precios claros, reseñas reales.
              </p>
            </div>

            {/* Plataforma */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">Plataforma</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/buscar" className="text-stone-600 hover:text-teal-700 transition-colors">Buscar servicios</Link></li>
                <li><Link href="/auth/registro" className="text-stone-600 hover:text-teal-700 transition-colors">Registrarse</Link></li>
                <li><Link href="/auth/login" className="text-stone-600 hover:text-teal-700 transition-colors">Iniciar sesión</Link></li>
              </ul>
            </div>

            {/* Empresa */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">ServiTrust</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/acerca" className="text-stone-600 hover:text-teal-700 transition-colors">Sobre nosotros</Link></li>
                <li>
                  <Link href="/feedback" className="text-stone-600 hover:text-teal-700 transition-colors inline-flex items-center gap-1.5">
                    Feedback
                    <span className="text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">Queremos oírte</span>
                  </Link>
                </li>
                <li><Link href="/acerca#roadmap" className="text-stone-600 hover:text-teal-700 transition-colors">Roadmap</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-3">Legal</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terminos" className="text-stone-600 hover:text-teal-700 transition-colors">Términos y Condiciones</Link></li>
                <li><Link href="/privacidad" className="text-stone-600 hover:text-teal-700 transition-colors">Política de Privacidad</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-stone-100 text-xs text-stone-500">
            <p>&copy; {new Date().getFullYear()} ServiTrust Panamá. Hecho con 🇵🇦 en Panamá.</p>
            <p>Plataforma en fase beta — tu opinión construye el producto.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBlock({ value, label, icon, literal }: { value: string | number; label: string; icon?: string; literal?: boolean }) {
  const formatted = literal || typeof value === 'string' ? value : value.toLocaleString('es-PA');
  return (
    <div className="text-center">
      <div className="text-2xl md:text-3xl font-display font-bold text-white flex items-center justify-center gap-1">
        {icon && <span className="text-amber-400 text-xl">{icon}</span>}
        {formatted}
      </div>
      <p className="text-teal-200/90 text-xs mt-1">{label}</p>
    </div>
  );
}
