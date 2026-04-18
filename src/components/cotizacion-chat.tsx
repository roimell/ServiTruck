'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Cotizacion, PaqueteServicio } from '@/types/database';

interface CotizacionChatProps {
  trabajoId: string;
  esProveedor: boolean;
  paquetes: PaqueteServicio[];
  onCotizacionEnviada?: () => void;
  onCotizacionAceptada?: (cotizacion: Cotizacion) => void;
}

// Componente para que el proveedor envíe cotizaciones
export function EnviarCotizacion({ trabajoId, paquetes, onCotizacionEnviada }: CotizacionChatProps) {
  const supabase = createClient();
  const [mostrar, setMostrar] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [paqueteId, setPaqueteId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function seleccionarPaquete(p: PaqueteServicio) {
    setPaqueteId(p.id);
    setMonto(p.precio.toString());
    setDescripcion(p.descripcion || p.nombre);
  }

  async function enviar() {
    if (!descripcion.trim() || !monto || Number(monto) <= 0) return;
    setEnviando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Crear mensaje de cotización en el chat
    const { data: msg } = await supabase.from('mensajes_chat').insert({
      trabajo_id: trabajoId,
      autor_id: user.id,
      contenido: `[COTIZACIÓN] ${descripcion} — $${Number(monto).toFixed(2)}`,
    }).select().single();

    // Crear la cotización
    await supabase.from('cotizaciones').insert({
      trabajo_id: trabajoId,
      proveedor_id: user.id,
      paquete_id: paqueteId,
      descripcion: descripcion.trim(),
      monto: Number(monto),
      mensaje_id: msg?.id,
    });

    // Actualizar estado del trabajo
    await supabase.from('solicitudes_trabajo')
      .update({ estado: 'cotizacion_enviada' })
      .eq('id', trabajoId);

    setMostrar(false);
    setDescripcion('');
    setMonto('');
    setPaqueteId(null);
    setEnviando(false);
    onCotizacionEnviada?.();
  }

  if (!mostrar) {
    return (
      <button
        onClick={() => setMostrar(true)}
        className="w-full bg-violet-600 text-white text-sm font-medium py-2.5 px-4 rounded-xl hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        Enviar cotización
      </button>
    );
  }

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-violet-900 text-sm">Nueva cotización</h3>

      {/* Paquetes rápidos */}
      {paquetes.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-violet-600">Selecciona un paquete o personaliza:</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {paquetes.map((p) => (
              <button
                key={p.id}
                onClick={() => seleccionarPaquete(p)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  paqueteId === p.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-white border border-violet-200 text-violet-700 hover:bg-violet-100'
                }`}
              >
                {p.nombre} — ${p.precio.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        rows={2}
        placeholder="Describe qué incluye esta cotización..."
        className="w-full rounded-lg border border-violet-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 resize-none"
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-violet-700 font-medium">$</span>
        <input
          type="number"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          placeholder="Monto"
          min="0.01"
          step="0.01"
          className="flex-1 rounded-lg border border-violet-200 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMostrar(false)}
          className="flex-1 bg-white text-violet-700 text-sm font-medium py-2 rounded-lg border border-violet-200 hover:bg-violet-50"
        >
          Cancelar
        </button>
        <button
          onClick={enviar}
          disabled={!descripcion.trim() || !monto || Number(monto) <= 0 || enviando}
          className="flex-1 bg-violet-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-violet-700 disabled:bg-gray-300 transition-colors"
        >
          {enviando ? 'Enviando...' : 'Enviar'}
        </button>
      </div>
    </div>
  );
}

// Componente para mostrar cotización en el chat (para el cliente)
export function TarjetaCotizacion({
  cotizacion,
  esCliente,
  onAceptar,
  onRechazar,
}: {
  cotizacion: Cotizacion;
  esCliente: boolean;
  onAceptar: () => void;
  onRechazar: () => void;
}) {
  return (
    <div className="bg-white border border-violet-200 rounded-xl p-4 max-w-[85%] shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-semibold text-violet-800">Cotización</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          cotizacion.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
          cotizacion.estado === 'aceptada' ? 'bg-green-100 text-green-700' :
          'bg-red-100 text-red-700'
        }`}>
          {cotizacion.estado === 'pendiente' ? 'Pendiente' :
           cotizacion.estado === 'aceptada' ? 'Aceptada' : 'Rechazada'}
        </span>
      </div>

      <p className="text-sm text-gray-700">{cotizacion.descripcion}</p>

      <p className="text-xl font-bold text-emerald-700 mt-2">${cotizacion.monto.toFixed(2)}</p>
      <p className="text-xs text-gray-400">
        Precio acordado entre cliente y proveedor.
      </p>

      {esCliente && cotizacion.estado === 'pendiente' && (
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAceptar}
            className="flex-1 bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Aceptar y Pagar
          </button>
          <button
            onClick={onRechazar}
            className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
