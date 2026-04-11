'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import ImageUpload from '@/components/image-upload';
import type { Servicio, Perfil, Resena, Categoria, PaqueteServicio, DisponibilidadSemanal, SlotDisponible } from '@/types/database';
import { DIAS_SEMANA } from '@/types/database';

interface ServicioDetalle extends Servicio {
  proveedor: Pick<Perfil, 'id' | 'nombre' | 'avatar_url' | 'corregimiento'>;
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

  // Solicitar servicio
  const [mostrarSolicitud, setMostrarSolicitud] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState<string | null>(null);
  const [fotosCliente, setFotosCliente] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    async function cargar() {
      const [servicioRes, paquetesRes, dispRes, resenasRes] = await Promise.all([
        supabase
          .from('servicios')
          .select('*, proveedor:perfiles!proveedor_id(id, nombre, avatar_url, corregimiento), categoria_rel:categorias(*)')
          .eq('id', servicioId)
          .single(),
        supabase
          .from('paquetes_servicio')
          .select('*')
          .eq('servicio_id', servicioId)
          .eq('activo', true)
          .order('orden'),
        // Disponibilidad del proveedor (la cargamos después de saber el proveedor_id)
        Promise.resolve(null),
        supabase
          .from('resenas')
          .select('*, autor:perfiles!autor_id(nombre)')
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (servicioRes.data) {
        const s = servicioRes.data as any;
        setServicio(s);

        // Cargar disponibilidad del proveedor
        const { data: dispData } = await supabase
          .from('disponibilidad_semanal')
          .select('*')
          .eq('proveedor_id', s.proveedor_id)
          .eq('activo', true)
          .order('dia_semana');
        setDisponibilidad(dispData || []);

        // Registrar vista de perfil
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
        const filtradas = resenasRes.data.filter(
          (r: any) => r.trabajo?.servicio_id === servicioId
        );
        setResenas(filtradas as any);
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!servicio) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-500 text-lg">Servicio no encontrado</p>
          <button onClick={() => router.back()} className="mt-4 text-emerald-600 underline">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl shrink-0">
              {servicio.proveedor?.nombre?.[0] ?? 'P'}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{servicio.titulo}</h1>
              <p className="text-gray-500">{servicio.proveedor?.nombre}</p>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {servicio.corregimiento}
              </div>
              {servicio.categoria_rel && (
                <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                  {servicio.categoria_rel.nombre}
                </span>
              )}
            </div>
          </div>

          {servicio.rating_promedio > 0 && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className={`w-5 h-5 ${star <= servicio.rating_promedio ? 'text-amber-400' : 'text-gray-200'} fill-current`} viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="text-sm text-gray-600">{servicio.rating_promedio} ({servicio.total_resenas})</span>
            </div>
          )}
        </div>

        {/* Galería de fotos */}
        {servicio.fotos && servicio.fotos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Fotos del servicio</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {servicio.fotos.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Descripción */}
        {servicio.descripcion && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-2">Descripción</h2>
            <p className="text-gray-600 whitespace-pre-line">{servicio.descripcion}</p>
          </div>
        )}

        {/* Paquetes */}
        {paquetes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Paquetes disponibles</h2>
            <div className="space-y-3">
              {paquetes.map((p) => (
                <div
                  key={p.id}
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${
                    paqueteSeleccionado === p.id
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPaqueteSeleccionado(paqueteSeleccionado === p.id ? null : p.id)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{p.nombre}</h3>
                      {p.descripcion && <p className="text-sm text-gray-500 mt-0.5">{p.descripcion}</p>}
                    </div>
                    <span className="text-lg font-bold text-emerald-700 shrink-0 ml-3">
                      ${p.precio.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-400">
                Los precios son referenciales. El monto final se acuerda en el chat con el profesional.
              </p>
            </div>
          </div>
        )}

        {/* Disponibilidad */}
        {disponibilidad.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Disponibilidad</h2>
            <div className="grid grid-cols-2 gap-2">
              {disponibilidad.map((d) => (
                <div key={d.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-gray-700">{DIAS_SEMANA[d.dia_semana]}</span>
                  <span className="text-sm text-gray-500">
                    {d.hora_inicio.slice(0, 5)} - {d.hora_fin.slice(0, 5)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fotos */}
        {servicio.fotos && servicio.fotos.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Portafolio</h2>
            <div className="grid grid-cols-3 gap-2">
              {servicio.fotos.map((foto, i) => (
                <img key={i} src={foto} alt={`Trabajo ${i + 1}`} className="rounded-lg aspect-square object-cover w-full" />
              ))}
            </div>
          </div>
        )}

        {/* CTA: Solicitar servicio */}
        {!mostrarSolicitud && !enviado && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Desde</p>
                <p className="text-2xl font-bold text-emerald-700">${servicio.precio_base.toFixed(2)}</p>
              </div>
              <button
                onClick={() => setMostrarSolicitud(true)}
                className="bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Solicitar servicio
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Describe lo que necesitas y el profesional te contactará para acordar detalles y precio.</p>
          </div>
        )}

        {/* Formulario de solicitud */}
        {mostrarSolicitud && !enviado && (
          <div className="bg-white rounded-xl border border-emerald-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Describe lo que necesitas</h2>

            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={4}
              placeholder="Detalla el trabajo que necesitas: qué tipo de trabajo, ubicación exacta, urgencia, detalles de acceso, etc."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
            />

            {paqueteSeleccionado && (
              <div className="bg-emerald-50 rounded-lg p-3 text-sm">
                <span className="text-emerald-700 font-medium">
                  Paquete seleccionado: {paquetes.find((p) => p.id === paqueteSeleccionado)?.nombre}
                </span>
                <p className="text-emerald-600 text-xs mt-0.5">El precio final se acuerda en el chat</p>
              </div>
            )}

            {userId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotos de referencia <span className="text-gray-400 font-normal">(opcional)</span>
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

            <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">¿Cómo funciona?</span> El profesional revisará tu solicitud.
                Si la acepta, se abrirá un chat donde podrán acordar detalles, fecha y precio.
                Solo pagas cuando estés de acuerdo con la cotización.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMostrarSolicitud(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={enviarSolicitud}
                disabled={!descripcion.trim() || enviando}
                className="flex-1 bg-emerald-600 text-white font-semibold py-3 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {enviando ? 'Enviando...' : 'Enviar solicitud'}
              </button>
            </div>
          </div>
        )}

        {/* Confirmación */}
        {enviado && (
          <div className="bg-white rounded-xl border border-emerald-200 p-5 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Solicitud enviada</h2>
            <p className="text-gray-500 mt-1">
              {servicio.proveedor?.nombre} recibirá tu solicitud y te responderá pronto.
            </p>
            <Link href="/mis-solicitudes" className="inline-block mt-4 text-emerald-600 font-medium hover:text-emerald-700">
              Ver mis solicitudes
            </Link>
          </div>
        )}

        {/* Reseñas */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Reseñas {resenas.length > 0 && `(${resenas.length})`}</h2>
          {resenas.length === 0 ? (
            <p className="text-gray-400 text-sm">Aún no hay reseñas</p>
          ) : (
            <div className="space-y-4">
              {resenas.map((r) => (
                <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{r.autor?.nombre}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg key={star} className={`w-3.5 h-3.5 ${star <= r.estrellas ? 'text-amber-400' : 'text-gray-200'} fill-current`} viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  {r.comentario && <p className="text-sm text-gray-600 mt-1">{r.comentario}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
