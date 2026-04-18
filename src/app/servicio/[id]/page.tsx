'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import ImageUpload from '@/components/image-upload';
import type { Servicio, Perfil, Resena, Categoria, PaqueteServicio, DisponibilidadSemanal } from '@/types/database';
import { DIAS_SEMANA } from '@/types/database';

interface ProveedorDetalle extends Pick<Perfil, 'id' | 'nombre' | 'avatar_url' | 'corregimiento'> {
  verificado?: boolean;
  nombre_comercial?: string | null;
  bio?: string | null;
  anos_experiencia?: number | null;
  certificaciones?: string[];
  idiomas?: string[];
  area_cobertura?: string[];
  rating_promedio?: number;
  total_resenas?: number;
}

interface ServicioDetalle extends Servicio {
  proveedor: ProveedorDetalle;
  categoria_rel: Categoria | null;
}

export default function ServicioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const servicioId = params.id as string;

  const [servicio, setServicio] = useState<ServicioDetalle | null>(null);
  const [paquetes, setPaquetes] = useState<PaqueteServicio[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadSemanal[]>([]);
  const [resenas, setResenas] = useState<(Resena & { autor: Pick<Perfil, 'nombre'> })[]>([]);
  const [loading, setLoading] = useState(true);
  const [galeriaIdx, setGaleriaIdx] = useState<number | null>(null);
  const viewStartRef = useState<number>(() => Date.now())[0];
  const chatIniciadoRef = { current: false };

  // Solicitar servicio
  const [mostrarSolicitud, setMostrarSolicitud] = useState(false);
  function abrirSolicitud() { chatIniciadoRef.current = true; setMostrarSolicitud(true); }
  const [descripcion, setDescripcion] = useState('');
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<string | null>(null);
  const [fotosCliente, setFotosCliente] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  // Track intento_contacto on unmount (fire and forget)
  useEffect(() => {
    return () => {
      const dur = Math.round((Date.now() - viewStartRef) / 1000);
      // Only log if viewed > 5s (not a bounce)
      if (dur < 5) return;
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!servicio) return;
        supabase.from('intentos_contacto').insert({
          usuario_id: user?.id || null,
          proveedor_id: (servicio as any).proveedor_id,
          servicio_id: servicioId,
          duracion_vista_segundos: dur,
          inicio_chat: chatIniciadoRef.current,
          dispositivo: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
        });
      });
    };
  }, [servicio]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    async function cargar() {
      const [servicioRes, paquetesRes, , resenasRes] = await Promise.all([
        supabase
          .from('servicios')
          .select('*, proveedor:perfiles!proveedor_id(id, nombre, avatar_url, corregimiento, verificado, nombre_comercial, bio, anos_experiencia, certificaciones, idiomas, area_cobertura, rating_promedio, total_resenas), categoria_rel:categorias(*)')
          .eq('id', servicioId)
          .single(),
        supabase
          .from('paquetes_servicio')
          .select('*')
          .eq('servicio_id', servicioId)
          .eq('activo', true)
          .order('orden'),
        Promise.resolve(null),
        supabase
          .from('resenas')
          .select('*, autor:perfiles!autor_id(nombre, avatar_url), trabajo:trabajos!inner(servicio_id)')
          .eq('trabajo.servicio_id', servicioId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (servicioRes.data) {
        const s = servicioRes.data as any;
        setServicio(s);

        const { data: dispData } = await supabase
          .from('disponibilidad_semanal')
          .select('*')
          .eq('proveedor_id', s.proveedor_id)
          .eq('activo', true)
          .order('dia_semana');
        setDisponibilidad(dispData || []);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) setUserId(user.id);
        supabase.from('vistas_perfil').insert({
          proveedor_id: s.proveedor_id,
          visitante_id: user?.id || null,
          servicio_id: servicioId,
          fuente: 'busqueda',
        });
      }

      setPaquetes((paquetesRes.data as PaqueteServicio[]) || []);

      if (resenasRes.data) {
        setResenas(resenasRes.data as any);
      }

      setLoading(false);
    }
    cargar();
  }, [servicioId]);

  async function enviarSolicitud() {
    if (!servicio || !descripcion.trim()) return;
    setEnviando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    const { error } = await supabase.from('solicitudes_trabajo').insert({
      cliente_id: user.id,
      servicio_id: servicio.id,
      proveedor_id: servicio.proveedor_id,
      estado: 'solicitud_enviada',
      descripcion_cliente: descripcion.trim(),
      notas_cliente: descripcion.trim(),
      paquete_id: paqueteSeleccionado,
      fotos_cliente: fotosCliente,
    });

    if (error) {
      alert(error.message);
      setEnviando(false);
      return;
    }

    setEnviado(true);
    setEnviando(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-warm-bg)]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <div className="animate-pulse space-y-5">
            <div className="h-48 bg-stone-200 rounded-2xl" />
            <div className="h-6 bg-stone-200 rounded w-2/3" />
            <div className="h-4 bg-stone-200 rounded w-1/3" />
            <div className="h-32 bg-stone-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="min-h-screen bg-[var(--color-warm-bg)]">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-stone-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </div>
          <p className="text-stone-500 font-medium">Servicio no encontrado</p>
          <button onClick={() => router.back()} className="mt-4 text-teal-600 font-medium hover:text-teal-700">← Volver</button>
        </div>
      </div>
    );
  }

  const fotos = servicio.fotos || [];

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      {/* Hero image gallery */}
      {fotos.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
          <div className={`grid gap-2 rounded-2xl overflow-hidden ${
            fotos.length === 1 ? 'grid-cols-1' : fotos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`} style={{ maxHeight: '320px' }}>
            {fotos.slice(0, 3).map((url, idx) => (
              <div
                key={idx}
                className={`relative cursor-pointer group overflow-hidden ${
                  fotos.length >= 3 && idx === 0 ? 'row-span-2 col-span-2' : ''
                }`}
                style={{ minHeight: fotos.length === 1 ? '320px' : '158px' }}
                onClick={() => setGaleriaIdx(idx)}
              >
                <Image src={url} alt={`Foto ${idx + 1}`} fill sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                {idx === 2 && fotos.length > 3 && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-semibold">+{fotos.length - 3} más</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {galeriaIdx !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setGaleriaIdx(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setGaleriaIdx(null)}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img src={fotos[galeriaIdx]} alt="" className="max-h-[85vh] max-w-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          {fotos.length > 1 && (
            <div className="absolute bottom-6 flex gap-2">
              {fotos.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setGaleriaIdx(i); }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${i === galeriaIdx ? 'bg-white scale-125' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* ── Header card ── */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-warm">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-sm overflow-hidden">
              {servicio.proveedor?.avatar_url
                ? <img src={servicio.proveedor.avatar_url} alt="" className="w-full h-full object-cover" />
                : (servicio.proveedor?.nombre?.[0] ?? 'P')}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-stone-900">{servicio.titulo}</h1>
              <p className="text-stone-500 font-medium flex items-center gap-1.5">
                {servicio.proveedor?.id ? (
                  <Link href={`/proveedor/${servicio.proveedor.id}`} className="hover:text-teal-700 hover:underline transition-colors">
                    {servicio.proveedor?.nombre_comercial || servicio.proveedor?.nombre}
                  </Link>
                ) : (
                  servicio.proveedor?.nombre_comercial || servicio.proveedor?.nombre
                )}
                {servicio.proveedor?.verificado && (
                  <span className="inline-flex items-center gap-0.5 bg-teal-100 text-teal-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    VERIFICADO
                  </span>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-sm text-stone-500">
                  <svg className="w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {servicio.corregimiento}
                </span>
                {servicio.categoria_rel && (
                  <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                    {servicio.categoria_rel.nombre}
                  </span>
                )}
                {servicio.proveedor?.anos_experiencia != null && servicio.proveedor.anos_experiencia > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                    {servicio.proveedor.anos_experiencia} años de experiencia
                  </span>
                )}
              </div>
            </div>
          </div>

          {servicio.rating_promedio > 0 && (
            <div className="flex items-center gap-3 mt-5 pt-5 border-t border-stone-100">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`w-5 h-5 ${star <= servicio.rating_promedio ? 'text-amber-400' : 'text-stone-200'} fill-current`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm font-medium text-stone-600">{servicio.rating_promedio}</span>
              <span className="text-sm text-stone-400">({servicio.total_resenas} reseña{servicio.total_resenas !== 1 ? 's' : ''})</span>
            </div>
          )}
        </div>

        {/* ── Description ── */}
        {servicio.descripcion && (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-warm">
            <h2 className="font-display font-bold text-stone-900 mb-3">Descripción</h2>
            <p className="text-stone-600 leading-relaxed whitespace-pre-line">{servicio.descripcion}</p>
          </div>
        )}

        {/* ── Sobre el profesional ── */}
        {(servicio.proveedor?.bio ||
          (servicio.proveedor?.certificaciones && servicio.proveedor.certificaciones.length > 0) ||
          (servicio.proveedor?.idiomas && servicio.proveedor.idiomas.length > 0) ||
          (servicio.proveedor?.area_cobertura && servicio.proveedor.area_cobertura.length > 0)) && (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-warm">
            <h2 className="font-display font-bold text-stone-900 mb-4">Sobre el profesional</h2>

            {servicio.proveedor.bio && (
              <p className="text-stone-600 leading-relaxed whitespace-pre-line mb-4">{servicio.proveedor.bio}</p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {servicio.proveedor.certificaciones && servicio.proveedor.certificaciones.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">🏆 Certificaciones</p>
                  <div className="flex flex-wrap gap-1.5">
                    {servicio.proveedor.certificaciones.map((c, i) => (
                      <span key={i} className="text-xs font-medium bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {servicio.proveedor.idiomas && servicio.proveedor.idiomas.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">🗣️ Idiomas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {servicio.proveedor.idiomas.map((i, k) => (
                      <span key={k} className="text-xs font-medium bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full">
                        {i}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {servicio.proveedor.area_cobertura && servicio.proveedor.area_cobertura.length > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2">📍 Áreas de cobertura</p>
                  <div className="flex flex-wrap gap-1.5">
                    {servicio.proveedor.area_cobertura.map((a, i) => (
                      <span key={i} className="text-xs font-medium bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Packages ── */}
        {paquetes.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-warm">
            <h2 className="font-display font-bold text-stone-900 mb-4">Paquetes disponibles</h2>
            <div className="space-y-3">
              {paquetes.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`w-full text-left border-2 rounded-xl p-4 transition-all duration-200 ${
                    paqueteSeleccionado === p.id
                      ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                  onClick={() => setPaqueteSeleccionado(paqueteSeleccionado === p.id ? null : p.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        paqueteSeleccionado === p.id ? 'border-teal-500 bg-teal-500' : 'border-stone-300'
                      }`}>
                        {paqueteSeleccionado === p.id && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900">{p.nombre}</h3>
                        {p.descripcion && <p className="text-sm text-stone-500 mt-0.5">{p.descripcion}</p>}
                      </div>
                    </div>
                    <span className="text-lg font-display font-bold text-teal-600 shrink-0 ml-3">
                      ${p.precio.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
              <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2.5">
                <svg className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="text-xs text-emerald-900 leading-relaxed">
                  <strong>Precio cerrado.</strong> Estos precios son fijos. Sin sorpresas al final del trabajo.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Schedule ── */}
        {disponibilidad.length > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-warm">
            <h2 className="font-display font-bold text-stone-900 mb-4">Disponibilidad</h2>
            <div className="grid grid-cols-2 gap-2">
              {disponibilidad.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-stone-50 rounded-xl px-4 py-2.5">
                  <span className="text-sm font-medium text-stone-700">{DIAS_SEMANA[d.dia_semana]}</span>
                  <span className="text-sm text-stone-500 font-mono">{d.hora_inicio.slice(0, 5)} – {d.hora_fin.slice(0, 5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA: Solicitar servicio ── */}
        {!mostrarSolicitud && !enviado && (
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 400 200" fill="none">
                <circle cx="350" cy="30" r="100" fill="white" />
                <circle cx="50" cy="180" r="60" fill="white" />
              </svg>
            </div>
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-teal-200 text-sm">Desde</p>
                <p className="text-3xl font-display font-bold">
                  ${(paquetes.length > 0 ? Math.min(...paquetes.map((p) => p.precio)) : servicio.precio_base).toFixed(2)}
                </p>
                <p className="text-teal-200 text-xs mt-1">
                  {paquetes.length > 0 ? '✓ Precio cerrado — sin sorpresas' : 'Precio final se acuerda en el chat'}
                </p>
              </div>
              <button
                onClick={abrirSolicitud}
                className="bg-white text-teal-700 font-semibold px-7 py-3.5 rounded-xl
                  hover:bg-teal-50 transition-all shadow-lg group"
              >
                <span className="flex items-center gap-2">
                  Solicitar servicio
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── Request form ── */}
        {mostrarSolicitud && !enviado && (
          <div className="bg-white rounded-2xl border-2 border-teal-200 p-6 shadow-warm space-y-5 animate-in">
            <div>
              <h2 className="font-display font-bold text-stone-900 text-lg">Describe lo que necesitas</h2>
              <p className="text-sm text-stone-500 mt-1">Mientras más detallado, mejor podrá ayudarte el profesional</p>
            </div>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Detalla el trabajo: tipo de trabajo, ubicación, urgencia, horario preferido, detalles de acceso..."
              className="input-field !rounded-xl resize-none"
            />

            {paqueteSeleccionado && (
              <div className="flex items-center gap-3 bg-teal-50 rounded-xl p-4 border border-teal-100">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <span className="text-teal-700 font-semibold text-sm">
                    Paquete: {paquetes.find((p) => p.id === paqueteSeleccionado)?.nombre}
                  </span>
                  <p className="text-teal-600 text-xs">El precio final se acuerda en el chat</p>
                </div>
              </div>
            )}

            {userId && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Fotos de referencia <span className="text-stone-400 font-normal">(opcional)</span>
                </label>
                <ImageUpload
                  bucket="solicitudes"
                  userId={userId}
                  value={fotosCliente}
                  onChange={setFotosCliente}
                  maxImages={3}
                  maxSizeMB={5}
                  publicBucket={false}
                />
              </div>
            )}

            {/* How it works info */}
            <div className="bg-amber-50 rounded-xl border border-amber-200/60 p-4 flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-amber-900 font-medium">¿Cómo funciona?</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  El profesional revisará tu solicitud. Si la acepta, se abrirá un chat
                  donde podrán acordar detalles, fecha y precio. Solo pagas cuando estés de acuerdo.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setMostrarSolicitud(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={enviarSolicitud}
                disabled={!descripcion.trim() || enviando}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </span>
                ) : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        )}

        {/* ── Success confirmation ── */}
        {enviado && (
          <div className="bg-white rounded-2xl border border-teal-200 p-8 text-center shadow-warm animate-in">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="font-display text-xl font-bold text-stone-900">¡Solicitud enviada!</h2>
            <p className="text-stone-500 mt-2 max-w-sm mx-auto">
              {servicio.proveedor?.nombre} recibirá tu solicitud y te responderá pronto.
              Te notificaremos cuando haya novedades.
            </p>
            <Link href="/mis-solicitudes" className="btn-primary mt-6 inline-flex">
              Ver mis solicitudes
            </Link>
          </div>
        )}

        {/* ── Reviews ── */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-warm">
          <h2 className="font-display font-bold text-stone-900 mb-4">
            Reseñas {resenas.length > 0 && <span className="text-stone-400 font-normal">({resenas.length})</span>}
          </h2>
          {resenas.length === 0 ? (
            <div className="text-center py-6">
              <svg className="w-10 h-10 text-stone-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-stone-400 text-sm">Aún no hay reseñas. ¡Sé el primero!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resenas.map((r) => (
                <div key={r.id} className="border-b border-stone-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 font-semibold text-sm">
                      {r.autor?.nombre?.[0] ?? '?'}
                    </div>
                    <div>
                      <span className="font-medium text-sm text-stone-900">{r.autor?.nombre}</span>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg key={star} className={`w-3.5 h-3.5 ${star <= r.estrellas ? 'text-amber-400' : 'text-stone-200'} fill-current`} viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </div>
                  {r.comentario && <p className="text-sm text-stone-600 mt-2 ml-11">{r.comentario}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
