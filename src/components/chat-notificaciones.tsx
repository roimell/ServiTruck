'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { ESTADOS_CHAT_ACTIVO } from '@/types/database';
import type { EstadoTrabajo } from '@/types/database';

interface ChatConversacion {
  trabajo_id: string;
  estado: EstadoTrabajo;
  servicio_titulo: string;
  otro_nombre: string;
  otro_avatar: string | null;
  ultimo_mensaje: string | null;
  ultimo_mensaje_at: string | null;
  no_leidos: number;
  es_proveedor: boolean;
}

export default function ChatNotificaciones() {
  const supabase = createClient();
  const [conversaciones, setConversaciones] = useState<ChatConversacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const totalNoLeidos = conversaciones.reduce((sum, c) => sum + c.no_leidos, 0);

  useEffect(() => {
    cargarConversaciones();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!abierto) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [abierto]);

  // Realtime: listen for new messages to update badge
  useEffect(() => {
    if (!userId) return;

    const channelName = `notif-${userId}`;

    // Strict Mode / re-render guard: remove stale channel before subscribing
    const stale = supabase.getChannels().find(
      (ch) => ch.topic === `realtime:${channelName}`
    );
    if (stale) supabase.removeChannel(stale);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_chat' },
        (payload) => {
          const msg = payload.new as { autor_id: string; trabajo_id: string; contenido: string; created_at: string };
          if (msg.autor_id === userId) return;

          setConversaciones((prev) => {
            const idx = prev.findIndex((c) => c.trabajo_id === msg.trabajo_id);
            if (idx === -1) {
              // New conversation — reload full list
              cargarConversaciones();
              return prev;
            }
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              ultimo_mensaje: msg.contenido,
              ultimo_mensaje_at: msg.created_at,
              no_leidos: updated[idx].no_leidos + 1,
            };
            // Sort: most recent first
            updated.sort((a, b) => {
              const tA = a.ultimo_mensaje_at || '';
              const tB = b.ultimo_mensaje_at || '';
              return tB.localeCompare(tA);
            });
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function cargarConversaciones() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Get all active trabajos where user is a party
    const { data: trabajos } = await supabase
      .from('solicitudes_trabajo')
      .select(`
        id, estado,
        cliente_id, proveedor_id,
        servicio:servicios(titulo),
        cliente:perfiles!cliente_id(nombre, avatar_url),
        proveedor:perfiles!proveedor_id(nombre, avatar_url)
      `)
      .or(`cliente_id.eq.${user.id},proveedor_id.eq.${user.id}`)
      .in('estado', ESTADOS_CHAT_ACTIVO)
      .order('updated_at', { ascending: false });

    if (!trabajos || trabajos.length === 0) {
      setConversaciones([]);
      return;
    }

    // Get last message + unread count for each trabajo
    const convs: ChatConversacion[] = [];

    for (const t of trabajos as any[]) {
      const esProveedor = t.proveedor_id === user.id;
      const otro = esProveedor ? t.cliente : t.proveedor;

      // Last message
      const { data: lastMsg } = await supabase
        .from('mensajes_chat')
        .select('contenido, created_at')
        .eq('trabajo_id', t.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Unread count
      const { count } = await supabase
        .from('mensajes_chat')
        .select('*', { count: 'exact', head: true })
        .eq('trabajo_id', t.id)
        .neq('autor_id', user.id)
        .eq('leido', false);

      convs.push({
        trabajo_id: t.id,
        estado: t.estado,
        servicio_titulo: t.servicio?.titulo || 'Servicio',
        otro_nombre: otro?.nombre || 'Usuario',
        otro_avatar: otro?.avatar_url || null,
        ultimo_mensaje: lastMsg?.contenido || null,
        ultimo_mensaje_at: lastMsg?.created_at || null,
        no_leidos: count || 0,
        es_proveedor: esProveedor,
      });
    }

    // Sort by most recent message
    convs.sort((a, b) => {
      const tA = a.ultimo_mensaje_at || '';
      const tB = b.ultimo_mensaje_at || '';
      return tB.localeCompare(tA);
    });

    setConversaciones(convs);
  }

  function formatTiempo(dateStr: string | null) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-PA', { day: 'numeric', month: 'short' });
  }

  function estadoLabel(estado: EstadoTrabajo) {
    const labels: Record<string, string> = {
      aceptada: 'Aceptada',
      negociando: 'Negociando',
      cotizacion_enviada: 'Cotización',
      pagado_custodia: 'Pagado',
      en_progreso: 'En progreso',
      terminado: 'Terminado',
      disputa: 'Disputa',
    };
    return labels[estado] || estado;
  }

  // No user / no conversations - don't render
  if (!userId) return null;

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => {
          setAbierto(!abierto);
          if (!abierto) cargarConversaciones();
        }}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100/80 hover:text-stone-700 transition-all"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {totalNoLeidos > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow-sm">
            {totalNoLeidos > 99 ? '99+' : totalNoLeidos}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-warm-lg border border-stone-200/80 overflow-hidden animate-scale-in origin-top-right z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-900 text-sm">Mensajes</h3>
            {totalNoLeidos > 0 && (
              <span className="text-xs text-teal-600 font-medium bg-teal-50 px-2 py-0.5 rounded-full">
                {totalNoLeidos} nuevo{totalNoLeidos !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Conversation list */}
          <div className="max-h-80 overflow-y-auto">
            {conversaciones.length === 0 ? (
              <div className="py-10 text-center">
                <svg className="w-10 h-10 text-stone-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm text-stone-400">No tienes conversaciones activas</p>
              </div>
            ) : (
              conversaciones.map((c) => (
                <Link
                  key={c.trabajo_id}
                  href={c.es_proveedor ? `/dashboard?chat=${c.trabajo_id}` : `/mis-solicitudes?chat=${c.trabajo_id}`}
                  onClick={() => setAbierto(false)}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-stone-50 transition-colors border-b border-stone-50 last:border-b-0 ${
                    c.no_leidos > 0 ? 'bg-teal-50/40' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center text-white font-semibold text-sm shrink-0 shadow-sm">
                    {c.otro_nombre[0]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${c.no_leidos > 0 ? 'font-semibold text-stone-900' : 'font-medium text-stone-700'}`}>
                        {c.otro_nombre}
                      </p>
                      <span className="text-[10px] text-stone-400 shrink-0">
                        {formatTiempo(c.ultimo_mensaje_at)}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 truncate mt-0.5">{c.servicio_titulo}</p>

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className={`text-xs truncate ${c.no_leidos > 0 ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>
                        {c.ultimo_mensaje
                          ? (c.ultimo_mensaje.length > 50 ? c.ultimo_mensaje.slice(0, 50) + '...' : c.ultimo_mensaje)
                          : 'Sin mensajes aún'}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-stone-400 px-1.5 py-0.5 rounded bg-stone-100">
                          {estadoLabel(c.estado)}
                        </span>
                        {c.no_leidos > 0 && (
                          <span className="bg-teal-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                            {c.no_leidos}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer */}
          {conversaciones.length > 0 && (
            <div className="border-t border-stone-100 px-4 py-2.5">
              <Link
                href="/mis-solicitudes"
                onClick={() => setAbierto(false)}
                className="text-xs text-teal-600 hover:text-teal-700 font-medium"
              >
                Ver todas las solicitudes →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
