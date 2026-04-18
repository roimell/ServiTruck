'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { EnviarCotizacion, TarjetaCotizacion } from '@/components/cotizacion-chat';
import { ESTADOS_CHAT_ACTIVO } from '@/types/database';
import type { Perfil, Cotizacion, PaqueteServicio, EstadoTrabajo } from '@/types/database';

interface Mensaje {
  id: string;
  trabajo_id: string;
  autor_id: string;
  contenido: string;
  leido: boolean;
  created_at: string;
}

interface ChatTrabajoProps {
  trabajoId: string;
  estadoTrabajo: EstadoTrabajo;
  onEstadoCambiado?: () => void;
}

export default function ChatTrabajo({ trabajoId, estadoTrabajo, onEstadoCambiado }: ChatTrabajoProps) {
  const supabase = createClient();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [paquetes, setPaquetes] = useState<PaqueteServicio[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [esProveedor, setEsProveedor] = useState(false);
  const [otroPerfil, setOtroPerfil] = useState<Pick<Perfil, 'nombre' | 'avatar_url'> | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [noLeidos, setNoLeidos] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatActivo = ESTADOS_CHAT_ACTIVO.includes(estadoTrabajo);
  const puedeEnviarCotizacion = esProveedor && ['aceptada', 'negociando'].includes(estadoTrabajo);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      // Cargar info del trabajo y la otra parte
      const { data: trabajo } = await supabase
        .from('solicitudes_trabajo')
        .select('cliente_id, proveedor_id, servicio_id')
        .eq('id', trabajoId)
        .single();

      if (trabajo) {
        setEsProveedor(trabajo.proveedor_id === user.id);
        const otroId = trabajo.cliente_id === user.id ? trabajo.proveedor_id : trabajo.cliente_id;
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('nombre, avatar_url')
          .eq('id', otroId)
          .single();
        if (perfil) setOtroPerfil(perfil);

        // Cargar paquetes del servicio (para cotizaciones)
        const { data: paqData } = await supabase
          .from('paquetes_servicio')
          .select('*')
          .eq('servicio_id', trabajo.servicio_id)
          .eq('activo', true)
          .order('orden');
        if (paqData) setPaquetes(paqData);
      }

      // Cargar mensajes existentes
      const { data: msgs } = await supabase
        .from('mensajes_chat')
        .select('*')
        .eq('trabajo_id', trabajoId)
        .order('created_at', { ascending: true });
      if (msgs) setMensajes(msgs);

      // Cargar cotizaciones
      const { data: cots } = await supabase
        .from('cotizaciones')
        .select('*')
        .eq('trabajo_id', trabajoId)
        .order('created_at', { ascending: true });
      if (cots) setCotizaciones(cots);

      // Contar no leídos
      const { data: countData } = await supabase.rpc('mensajes_no_leidos', {
        p_trabajo_id: trabajoId,
      });
      if (countData !== null) setNoLeidos(countData);
    }
    init();
  }, [trabajoId]);

  // Suscripción en tiempo real
  useEffect(() => {
    const channelName = `chat:${trabajoId}`;
    const stale = supabase.getChannels().find(ch => ch.topic === `realtime:${channelName}`);
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes_chat',
          filter: `trabajo_id=eq.${trabajoId}`,
        },
        (payload) => {
          const nuevo = payload.new as Mensaje;
          setMensajes((prev) => {
            // Reemplazar mensaje optimista si existe, o agregar nuevo
            const sinOptimista = prev.filter(
              (m) => !(m.autor_id === nuevo.autor_id && m.contenido === nuevo.contenido && m.id !== nuevo.id)
            );
            // Evitar duplicado si ya existe por id
            if (sinOptimista.some((m) => m.id === nuevo.id)) return sinOptimista;
            return [...sinOptimista, nuevo];
          });
          if (nuevo.autor_id !== userId) {
            setNoLeidos((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trabajoId, userId]);

  // Auto-scroll al final cuando llegan mensajes
  useEffect(() => {
    if (abierto && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensajes, abierto]);

  // Marcar como leídos cuando se abre el chat
  useEffect(() => {
    if (!abierto || !userId) return;

    async function marcarLeidos() {
      await supabase
        .from('mensajes_chat')
        .update({ leido: true })
        .eq('trabajo_id', trabajoId)
        .neq('autor_id', userId!)
        .eq('leido', false);
      setNoLeidos(0);
    }
    marcarLeidos();
  }, [abierto, mensajes.length]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoMensaje.trim() || !userId || enviando) return;

    setEnviando(true);
    const contenido = nuevoMensaje.trim();
    setNuevoMensaje('');

    // Optimistic: mostrar mensaje inmediatamente
    const tempId = crypto.randomUUID();
    const msgOptimista: Mensaje = {
      id: tempId,
      trabajo_id: trabajoId,
      autor_id: userId,
      contenido,
      leido: false,
      created_at: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, msgOptimista]);

    const { error } = await supabase.from('mensajes_chat').insert({
      trabajo_id: trabajoId,
      autor_id: userId,
      contenido,
    });

    if (error) {
      // Revertir mensaje optimista y restaurar input
      setMensajes((prev) => prev.filter((m) => m.id !== tempId));
      setNuevoMensaje(contenido);
      console.error('Error enviando mensaje:', error.message);
    }

    setEnviando(false);
  }

  async function aceptarCotizacion(cotizacion: Cotizacion) {
    // Actualizar cotización
    await supabase.from('cotizaciones')
      .update({ estado: 'aceptada', aceptada_at: new Date().toISOString() })
      .eq('id', cotizacion.id);

    // Actualizar monto del trabajo y estado
    await supabase.from('solicitudes_trabajo')
      .update({ monto_total: cotizacion.monto })
      .eq('id', trabajoId);

    // Enviar mensaje automático
    if (userId) {
      await supabase.from('mensajes_chat').insert({
        trabajo_id: trabajoId,
        autor_id: userId,
        contenido: `✅ Cotización aceptada — $${cotizacion.monto.toFixed(2)}. Procediendo al pago.`,
      });
    }

    setCotizaciones(prev => prev.map(c => c.id === cotizacion.id ? { ...c, estado: 'aceptada' as const } : c));
    onEstadoCambiado?.();
    // TODO: Redirect to payment
    alert('Redirigiendo a pasarela de pago...');
  }

  async function rechazarCotizacion(cotizacion: Cotizacion) {
    await supabase.from('cotizaciones')
      .update({ estado: 'rechazada' })
      .eq('id', cotizacion.id);

    // Volver a negociando
    await supabase.from('solicitudes_trabajo')
      .update({ estado: 'negociando' })
      .eq('id', trabajoId);

    if (userId) {
      await supabase.from('mensajes_chat').insert({
        trabajo_id: trabajoId,
        autor_id: userId,
        contenido: '❌ Cotización rechazada. Sigamos negociando.',
      });
    }

    setCotizaciones(prev => prev.map(c => c.id === cotizacion.id ? { ...c, estado: 'rechazada' as const } : c));
    onEstadoCambiado?.();
  }

  function formatHora(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('es-PA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatFecha(dateStr: string) {
    const date = new Date(dateStr);
    const hoy = new Date();
    if (date.toDateString() === hoy.toDateString()) return 'Hoy';
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);
    if (date.toDateString() === ayer.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
  }

  // Obtener cotización por mensaje_id
  function cotizacionPorMensaje(msgId: string): Cotizacion | undefined {
    return cotizaciones.find(c => c.mensaje_id === msgId);
  }

  // Agrupar mensajes por fecha
  const mensajesPorFecha = mensajes.reduce<Record<string, Mensaje[]>>((acc, msg) => {
    const fecha = new Date(msg.created_at).toDateString();
    if (!acc[fecha]) acc[fecha] = [];
    acc[fecha].push(msg);
    return acc;
  }, {});

  return (
    <>
      {/* Botón flotante del chat */}
      <button
        onClick={() => setAbierto(!abierto)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center z-40"
      >
        {abierto ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {noLeidos > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {noLeidos > 9 ? '9+' : noLeidos}
              </span>
            )}
          </>
        )}
      </button>

      {/* Panel del chat */}
      {abierto && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 h-[32rem] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-40 overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold">
              {otroPerfil?.nombre?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{otroPerfil?.nombre ?? 'Chat'}</p>
              <p className="text-xs text-emerald-200">
                {estadoTrabajo === 'negociando' ? 'Negociando detalles' :
                 estadoTrabajo === 'cotizacion_enviada' ? 'Cotización pendiente' :
                 estadoTrabajo === 'en_progreso' ? 'Trabajo en progreso' :
                 'Chat del servicio'}
              </p>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 bg-gray-50">
            {mensajes.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">No hay mensajes aún</p>
                <p className="text-xs text-gray-300 mt-1">Envía un mensaje para coordinar el servicio</p>
              </div>
            )}

            {Object.entries(mensajesPorFecha).map(([fecha, msgs]) => (
              <div key={fecha}>
                <div className="text-center my-2">
                  <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
                    {formatFecha(msgs[0].created_at)}
                  </span>
                </div>
                {msgs.map((msg) => {
                  const esMio = msg.autor_id === userId;
                  const cotizacion = msg.contenido.startsWith('[COTIZACIÓN]') ? cotizacionPorMensaje(msg.id) : null;

                  // Renderizar tarjeta de cotización
                  if (cotizacion) {
                    return (
                      <div key={msg.id} className={`flex mb-2 ${esMio ? 'justify-end' : 'justify-start'}`}>
                        <TarjetaCotizacion
                          cotizacion={cotizacion}
                          esCliente={!esProveedor}
                          onAceptar={() => aceptarCotizacion(cotizacion)}
                          onRechazar={() => rechazarCotizacion(cotizacion)}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex mb-1 ${esMio ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                          esMio
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-white text-gray-900 border border-gray-200 rounded-bl-md'
                        }`}
                      >
                        <p className="break-words">{msg.contenido}</p>
                        <p
                          className={`text-[10px] mt-0.5 ${
                            esMio ? 'text-emerald-200' : 'text-gray-400'
                          }`}
                        >
                          {formatHora(msg.created_at)}
                          {esMio && msg.leido && ' ✓✓'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Cotización (proveedor puede enviar) */}
          {puedeEnviarCotizacion && (
            <div className="border-t border-gray-200 px-3 py-2 bg-violet-50 shrink-0">
              <EnviarCotizacion
                trabajoId={trabajoId}
                esProveedor={true}
                paquetes={paquetes}
                onCotizacionEnviada={() => {
                  // Recargar cotizaciones
                  supabase.from('cotizaciones').select('*').eq('trabajo_id', trabajoId).order('created_at', { ascending: true })
                    .then(({ data }) => { if (data) setCotizaciones(data); });
                  onEstadoCambiado?.();
                }}
              />
            </div>
          )}

          {/* Input */}
          {chatActivo ? (
            <form onSubmit={enviar} className="border-t border-gray-200 p-2 flex gap-2 shrink-0 bg-white">
              <input
                type="text"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                placeholder="Escribe un mensaje..."
                maxLength={2000}
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!nuevoMensaje.trim() || enviando}
                className="w-9 h-9 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 disabled:bg-gray-300 transition-colors shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          ) : (
            <div className="border-t border-gray-200 p-3 bg-gray-50 text-center shrink-0">
              <p className="text-xs text-gray-400">Chat no disponible en este estado</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
