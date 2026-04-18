'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import { createClient } from '@/lib/supabase';

const TIPOS = [
  { id: 'idea', label: 'Idea / Sugerencia', icon: '💡', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'bug', label: 'Algo no funciona', icon: '🐛', color: 'bg-red-100 text-red-800 border-red-200' },
  { id: 'pregunta', label: 'Tengo una pregunta', icon: '❓', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'queja', label: 'Mala experiencia', icon: '😤', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'elogio', label: 'Me encanta', icon: '❤️', color: 'bg-pink-100 text-pink-800 border-pink-200' },
  { id: 'otro', label: 'Otro', icon: '💬', color: 'bg-stone-100 text-stone-700 border-stone-200' },
] as const;

type TipoId = typeof TIPOS[number]['id'];

export default function FeedbackPage() {
  const supabase = createClient();
  const [tipo, setTipo] = useState<TipoId | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [nps, setNps] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setEmail(data.user.email || '');
      }
    });
  }, []);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!tipo) { setError('Selecciona un tipo'); return; }
    if (mensaje.trim().length < 5) { setError('Cuéntanos un poco más (mínimo 5 caracteres)'); return; }

    setEnviando(true);

    const dispositivo = typeof window !== 'undefined' && /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop';
    const { error: err } = await supabase.from('feedback_usuarios').insert({
      tipo,
      mensaje: mensaje.trim(),
      email: email.trim() || null,
      nombre: nombre.trim() || null,
      nps,
      usuario_id: userId,
      dispositivo,
      user_agent: typeof window !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });

    setEnviando(false);
    if (err) { setError('Error al enviar. Intenta de nuevo.'); return; }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="min-h-screen bg-[var(--color-warm-bg)]">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-20 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg animate-scale-in">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-3">
            ¡Gracias! Lo leemos todo 🙌
          </h1>
          <p className="text-stone-600 text-lg leading-relaxed mb-8">
            Tu opinión llega directo al equipo. Si dejaste tu correo y amerita respuesta, te escribimos en 1-3 días.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-primary">Volver al inicio</Link>
            <button
              onClick={() => {
                setEnviado(false); setTipo(null); setMensaje(''); setNps(null);
              }}
              className="btn-ghost"
            >
              Enviar otro
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">← Inicio</Link>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mt-2 mb-2">
            Queremos escucharte
          </h1>
          <p className="text-stone-600 text-base leading-relaxed">
            Ideas, quejas, bugs, elogios — todo sirve. Leemos el 100%. No pedimos registro.
          </p>
        </div>

        <form onSubmit={enviar} className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8 shadow-warm space-y-7">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-3">¿Qué nos quieres decir? *</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS.map((t) => {
                const sel = tipo === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTipo(t.id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      sel
                        ? `${t.color} ring-2 ring-offset-1 ring-stone-900/10 font-semibold`
                        : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
                    }`}
                  >
                    <span className="text-2xl">{t.icon}</span>
                    <span className="text-xs text-center leading-tight">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mensaje */}
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-1.5">Tu mensaje *</label>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={5}
              maxLength={2000}
              placeholder={
                tipo === 'bug' ? 'Describe qué pasó, en qué pantalla, y qué esperabas...' :
                tipo === 'idea' ? '¿Qué te gustaría ver en ServiTrust?' :
                tipo === 'queja' ? 'Cuéntanos qué salió mal para poder mejorarlo.' :
                '¿Qué tienes en mente?'
              }
              className="input resize-none"
            />
            <p className="text-xs text-stone-500 mt-1">{mensaje.length}/2000 — sé tan directo como quieras</p>
          </div>

          {/* NPS */}
          <div>
            <label className="block text-sm font-semibold text-stone-900 mb-1.5">
              ¿Qué tan probable es que recomiendes ServiTrust a un amigo?{' '}
              <span className="text-stone-400 font-normal">(opcional)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap mt-3">
              {Array.from({ length: 11 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNps(nps === i ? null : i)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all ${
                    nps === i
                      ? i >= 9 ? 'bg-emerald-600 text-white shadow-md scale-110' :
                        i >= 7 ? 'bg-amber-500 text-white shadow-md scale-110' :
                        'bg-red-500 text-white shadow-md scale-110'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-stone-500 mt-1.5 px-1">
              <span>Nada probable</span>
              <span>Muy probable</span>
            </div>
          </div>

          {/* Contacto opcional */}
          <div className="pt-3 border-t border-stone-100">
            <p className="text-xs text-stone-500 mb-3">
              Si quieres que te contestemos, déjanos cómo contactarte (opcional):
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Tu nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: María"
                  maxLength={80}
                  className="input !py-2 !text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  maxLength={120}
                  className="input !py-2 !text-sm"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="submit" disabled={enviando} className="btn-primary">
              {enviando ? 'Enviando...' : 'Enviar opinión'}
            </button>
          </div>

          <p className="text-[11px] text-stone-500 text-center leading-relaxed pt-2 border-t border-stone-100">
            🔒 Tu feedback se envía de forma segura. No compartimos tus datos. Al enviar aceptas nuestros{' '}
            <Link href="/terminos" className="underline hover:text-stone-700">Términos</Link> y{' '}
            <Link href="/privacidad" className="underline hover:text-stone-700">Privacidad</Link>.
          </p>
        </form>
      </main>
    </div>
  );
}
