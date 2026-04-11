'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import { DIAS_SEMANA } from '@/types/database';
import type { DisponibilidadSemanal, BloqueoAgenda } from '@/types/database';

const HORAS = Array.from({ length: 13 }, (_, i) => {
  const h = i + 7; // 7:00 AM a 19:00 PM
  return `${h.toString().padStart(2, '0')}:00`;
});

interface SlotForm {
  id?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

export default function DisponibilidadPage() {
  const supabase = createClient();

  const [slots, setSlots] = useState<SlotForm[]>([]);
  const [bloqueos, setBloqueos] = useState<BloqueoAgenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  // Nuevo bloqueo
  const [nuevoBloqueoFecha, setNuevoBloqueoFecha] = useState('');
  const [nuevoBloqueoMotivo, setNuevoBloqueoMotivo] = useState('');
  const [agregandoBloqueo, setAgregandoBloqueo] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [dispRes, bloqRes] = await Promise.all([
      supabase
        .from('disponibilidad_semanal')
        .select('*')
        .eq('proveedor_id', user.id)
        .order('dia_semana')
        .order('hora_inicio'),
      supabase
        .from('bloqueos_agenda')
        .select('*')
        .eq('proveedor_id', user.id)
        .gte('fecha', new Date().toISOString().split('T')[0])
        .order('fecha'),
    ]);

    if (dispRes.data && dispRes.data.length > 0) {
      setSlots(dispRes.data.map((d: DisponibilidadSemanal) => ({
        id: d.id,
        dia_semana: d.dia_semana,
        hora_inicio: d.hora_inicio,
        hora_fin: d.hora_fin,
        activo: d.activo,
      })));
    } else {
      // Crear slots predeterminados (Lun-Vie 8:00-17:00)
      const defaults: SlotForm[] = [];
      for (let dia = 1; dia <= 5; dia++) {
        defaults.push({ dia_semana: dia, hora_inicio: '08:00', hora_fin: '17:00', activo: true });
      }
      // Sábado medio día
      defaults.push({ dia_semana: 6, hora_inicio: '08:00', hora_fin: '12:00', activo: false });
      // Domingo off
      defaults.push({ dia_semana: 0, hora_inicio: '08:00', hora_fin: '12:00', activo: false });
      setSlots(defaults);
    }

    if (bloqRes.data) setBloqueos(bloqRes.data);
    setLoading(false);
  }

  function toggleDia(diaSemana: number) {
    setSlots(prev => prev.map(s =>
      s.dia_semana === diaSemana ? { ...s, activo: !s.activo } : s
    ));
  }

  function actualizarSlot(diaSemana: number, campo: 'hora_inicio' | 'hora_fin', valor: string) {
    setSlots(prev => prev.map(s =>
      s.dia_semana === diaSemana ? { ...s, [campo]: valor } : s
    ));
  }

  async function guardar() {
    setGuardando(true);
    setGuardado(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Eliminar todos los existentes y recrear
    await supabase.from('disponibilidad_semanal').delete().eq('proveedor_id', user.id);

    await supabase.from('disponibilidad_semanal').insert(
      slots.map(s => ({
        proveedor_id: user.id,
        dia_semana: s.dia_semana,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin,
        activo: s.activo,
      }))
    );

    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 3000);
  }

  async function agregarBloqueo() {
    if (!nuevoBloqueoFecha) return;
    setAgregandoBloqueo(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('bloqueos_agenda').insert({
      proveedor_id: user.id,
      fecha: nuevoBloqueoFecha,
      motivo: nuevoBloqueoMotivo.trim() || null,
    }).select().single();

    if (!error && data) {
      setBloqueos(prev => [...prev, data].sort((a, b) => a.fecha.localeCompare(b.fecha)));
      setNuevoBloqueoFecha('');
      setNuevoBloqueoMotivo('');
    }

    setAgregandoBloqueo(false);
  }

  async function eliminarBloqueo(id: string) {
    await supabase.from('bloqueos_agenda').delete().eq('id', id);
    setBloqueos(prev => prev.filter(b => b.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-64 bg-gray-200 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Disponibilidad</h1>
          <p className="text-gray-500 mt-1">Configura tu horario semanal y bloquea fechas específicas.</p>
        </div>

        {/* Horario semanal */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 mb-6">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center justify-center">1</span>
            Horario semanal
          </h2>
          <p className="text-sm text-gray-500">Los clientes verán estos horarios al solicitar tu servicio.</p>

          <div className="space-y-2">
            {DIAS_SEMANA.map((nombreDia, diaSemana) => {
              const slot = slots.find(s => s.dia_semana === diaSemana);
              if (!slot) return null;

              return (
                <div
                  key={diaSemana}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    slot.activo
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleDia(diaSemana)}
                    className={`w-10 h-6 rounded-full relative transition-colors shrink-0 ${
                      slot.activo ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      slot.activo ? 'left-[18px]' : 'left-0.5'
                    }`} />
                  </button>

                  {/* Día */}
                  <span className={`w-24 text-sm font-medium ${slot.activo ? 'text-gray-900' : 'text-gray-400'}`}>
                    {nombreDia}
                  </span>

                  {slot.activo ? (
                    <div className="flex items-center gap-2 flex-1">
                      <select
                        value={slot.hora_inicio}
                        onChange={(e) => actualizarSlot(diaSemana, 'hora_inicio', e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <span className="text-gray-400 text-sm">a</span>
                      <select
                        value={slot.hora_fin}
                        onChange={(e) => actualizarSlot(diaSemana, 'hora_fin', e.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500"
                      >
                        {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400 italic">No disponible</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Guardar horario */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={guardar}
              disabled={guardando}
              className="bg-emerald-600 text-white font-medium py-2.5 px-6 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 transition-all text-sm shadow-lg shadow-emerald-200"
            >
              {guardando ? 'Guardando...' : 'Guardar horario'}
            </button>
            {guardado && (
              <span className="text-sm text-emerald-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </span>
            )}
          </div>
        </div>

        {/* Bloqueos de agenda */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <span className="w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center justify-center">2</span>
            Bloqueos de agenda
          </h2>
          <p className="text-sm text-gray-500">Bloquea fechas en las que no puedes trabajar (vacaciones, compromisos, etc.).</p>

          {/* Lista de bloqueos */}
          {bloqueos.length > 0 && (
            <div className="space-y-2">
              {bloqueos.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between px-4 py-3 rounded-xl border border-orange-100 bg-orange-50/50 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(b.fecha + 'T12:00:00').toLocaleDateString('es-PA', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                      {b.motivo && <p className="text-xs text-gray-500">{b.motivo}</p>}
                      {b.trabajo_id && <p className="text-xs text-blue-600">Bloqueado por trabajo agendado</p>}
                    </div>
                  </div>
                  {!b.trabajo_id && (
                    <button
                      onClick={() => eliminarBloqueo(b.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Agregar bloqueo */}
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Agregar bloqueo</p>
            <div className="flex gap-3">
              <input
                type="date"
                value={nuevoBloqueoFecha}
                onChange={(e) => setNuevoBloqueoFecha(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <input
                type="text"
                value={nuevoBloqueoMotivo}
                onChange={(e) => setNuevoBloqueoMotivo(e.target.value)}
                placeholder="Motivo (opcional)"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <button
              onClick={agregarBloqueo}
              disabled={!nuevoBloqueoFecha || agregandoBloqueo}
              className="w-full bg-orange-500 text-white font-medium py-2 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 transition-colors text-sm"
            >
              {agregandoBloqueo ? 'Agregando...' : 'Bloquear fecha'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
