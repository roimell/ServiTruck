'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import ImageUpload from '@/components/image-upload';
import { PANAMA_GEO, PROVINCIAS } from '@/lib/panama-geo';
import type { Categoria } from '@/types/database';

const CATEGORY_ICONS: Record<string, string> = {
  'Electricidad': '⚡', 'Plomería': '🔧', 'Limpieza': '✨', 'Pintura': '🎨',
  'Cerrajería': '🔑', 'Mudanzas': '📦', 'Jardinería': '🌿', 'Aire Acondicionado': '❄️',
  'Albañilería': '🧱', 'Tecnología': '💻',
};

type Paso = 1 | 2 | 3;

export default function NuevoServicioPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string>('');
  const [paso, setPaso] = useState<Paso>(1);

  // Form
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [precioBase, setPrecioBase] = useState('');
  const [corregimiento, setCorregimiento] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [paquetes, setPaquetes] = useState<{ nombre: string; descripcion: string; precio: string }[]>([]);

  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id);
    });
  }, []);

  function validarPaso(p: Paso): string | null {
    if (p === 1) {
      if (!categoriaId) return 'Selecciona una categoría';
      if (!titulo.trim() || titulo.trim().length < 8) return 'Dale un título claro (mínimo 8 caracteres)';
    }
    if (p === 2) {
      if (!descripcion.trim() || descripcion.trim().length < 30) return 'Describe tu servicio (mínimo 30 caracteres)';
      if (!corregimiento) return 'Selecciona una zona';
      if (!precioBase || Number(precioBase) <= 0) return 'Indica un precio base válido';
    }
    if (p === 3) {
      const valid = paquetes.filter((pq) => pq.nombre.trim() && pq.precio && Number(pq.precio) > 0);
      if (valid.length === 0) {
        return 'Agrega al menos 1 paquete con nombre y precio. Los clientes confían 3× más en servicios con precio cerrado.';
      }
      for (const pq of valid) {
        if (pq.nombre.trim().length < 3) return 'El nombre del paquete debe tener al menos 3 caracteres';
        if (Number(pq.precio) < 1) return 'El precio del paquete debe ser mayor a $0';
      }
    }
    return null;
  }

  function avanzar() {
    const err = validarPaso(paso);
    if (err) { setError(err); return; }
    setError('');
    const next = Math.min(3, paso + 1) as Paso;
    // Al llegar a paso 3, pre-llenar el primer paquete con precio_base para reducir fricción
    if (next === 3 && paquetes.length === 0 && precioBase) {
      setPaquetes([{ nombre: 'Básico', descripcion: '', precio: precioBase }]);
    }
    setPaso(next);
  }

  async function publicar() {
    setError('');
    const err1 = validarPaso(1) || validarPaso(2) || validarPaso(3);
    if (err1) { setError(err1); return; }

    setGuardando(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Inicia sesión'); setGuardando(false); return; }

    const catSel = categorias.find((c) => c.id === categoriaId);

    const { data: servicio, error: errServ } = await supabase
      .from('servicios')
      .insert({
        proveedor_id: user.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        categoria: catSel?.nombre || '',
        categoria_id: categoriaId,
        precio_base: Number(precioBase),
        corregimiento,
        fotos,
      })
      .select()
      .single();

    if (errServ || !servicio) {
      setError(errServ?.message || 'Error al crear el servicio');
      setGuardando(false);
      return;
    }

    const valid = paquetes.filter((p) => p.nombre.trim() && p.precio && Number(p.precio) > 0);
    if (valid.length > 0) {
      await supabase.from('paquetes_servicio').insert(
        valid.map((p, i) => ({
          servicio_id: servicio.id,
          nombre: p.nombre.trim(),
          descripcion: p.descripcion.trim() || null,
          precio: Number(p.precio),
          orden: i + 1,
        }))
      );
    }

    router.push(`/dashboard/servicios/${servicio.id}`);
  }

  const catSel = categorias.find((c) => c.id === categoriaId);
  const pasos = [
    { n: 1, label: 'Categoría', icon: '🏷️' },
    { n: 2, label: 'Detalles', icon: '📝' },
    { n: 3, label: 'Fotos y paquetes', icon: '📸' },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button onClick={() => router.back()} className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-1">Publicar servicio</h1>
        <p className="text-stone-500 text-sm mb-8">En 3 pasos rápidos tu servicio estará visible para clientes en Panamá.</p>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-8">
          {pasos.map((p, i) => (
            <div key={p.n} className="flex items-center flex-1">
              <div className={`flex items-center gap-2 ${paso >= p.n ? 'text-teal-700' : 'text-stone-400'}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  paso === p.n ? 'bg-teal-600 text-white ring-4 ring-teal-100' :
                  paso > p.n ? 'bg-teal-600 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  {paso > p.n ? '✓' : p.n}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold uppercase tracking-wide">Paso {p.n}</p>
                  <p className="text-sm font-medium">{p.label}</p>
                </div>
              </div>
              {i < pasos.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${paso > p.n ? 'bg-teal-600' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 md:p-8">
            {/* ── Paso 1: CATEGORÍA + TÍTULO ── */}
            {paso === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-1">¿Qué tipo de servicio ofreces? *</label>
                  <p className="text-xs text-stone-500 mb-4">Selecciona la categoría principal.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {categorias.map((c) => {
                      const sel = categoriaId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setCategoriaId(c.id)}
                          className={`flex items-center gap-2 px-3 py-3 rounded-xl border transition-all text-sm text-left ${
                            sel ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-100 text-teal-900 font-semibold'
                                : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                          }`}
                        >
                          <span className="text-lg">{CATEGORY_ICONS[c.nombre] || '🛠️'}</span>
                          <span className="truncate">{c.nombre}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-1">Título del servicio *</label>
                  <p className="text-xs text-stone-500 mb-2">Sé específico. Un buen título convierte 3× más.</p>
                  <input
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder={catSel ? `Ej: ${catSel.nombre} residencial 24/7` : 'Ej: Reparación de aires acondicionados'}
                    maxLength={120}
                    className="input"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-stone-400">💡 Incluye qué haces y a quién</span>
                    <span className="text-xs text-stone-400">{titulo.length}/120</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Paso 2: DETALLES ── */}
            {paso === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-1">Descripción *</label>
                  <p className="text-xs text-stone-500 mb-2">Cuenta qué incluye, tu experiencia y qué te hace especial.</p>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={6}
                    placeholder="Ej: Servicio profesional de electricidad residencial con 10 años de experiencia. Incluye..."
                    maxLength={1000}
                    className="input resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-stone-400">{descripcion.length < 30 ? `⚠️ mínimo 30 caracteres` : '✓ buena longitud'}</span>
                    <span className="text-xs text-stone-400">{descripcion.length}/1000</span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-1">Zona principal *</label>
                    <select value={corregimiento} onChange={(e) => setCorregimiento(e.target.value)} className="input">
                      <option value="">Selecciona provincia → corregimiento...</option>
                      {PROVINCIAS.map((prov) => (
                        <optgroup key={prov} label={prov}>
                          {PANAMA_GEO[prov].map((c) => <option key={c} value={c}>{c}</option>)}
                        </optgroup>
                      ))}
                    </select>
                    <p className="text-xs text-stone-500 mt-1">Amplía tu cobertura desde tu perfil.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-stone-900 mb-1">Precio base (USD) *</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                      <input
                        type="number"
                        value={precioBase}
                        onChange={(e) => setPrecioBase(e.target.value)}
                        placeholder="0.00"
                        min="1"
                        step="0.01"
                        className="input !pl-8"
                      />
                    </div>
                    <p className="text-xs text-stone-400 mt-1">Desde cuánto. Se negocia en el chat.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Paso 3: FOTOS + PAQUETES ── */}
            {paso === 3 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-1">Fotos del servicio</label>
                  <p className="text-xs text-stone-500 mb-3">💡 Servicios con fotos reciben 5× más solicitudes. Máx 5 fotos.</p>
                  {userId && (
                    <ImageUpload bucket="servicios" userId={userId} value={fotos} onChange={setFotos} maxImages={5} maxSizeMB={5} publicBucket />
                  )}
                </div>

                <div className="border-t border-stone-100 pt-6">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-stone-900">Paquetes con precio fijo *</label>
                    <span className="text-[10px] font-bold text-white bg-teal-600 px-2 py-0.5 rounded-full">Obligatorio</span>
                  </div>
                  <p className="text-xs text-stone-500 mb-3">
                    Define al menos 1 paquete con precio cerrado. Ej: <em>"Básico — $25"</em>.
                  </p>
                  <div className="mb-4 bg-teal-50 border border-teal-100 rounded-xl p-3 flex gap-2.5">
                    <span className="text-lg leading-none">💡</span>
                    <div className="text-xs text-teal-900 leading-relaxed">
                      <strong>El panameño odia el "chatéame para precio".</strong> Servicios con precio cerrado reciben hasta <strong>3× más contrataciones</strong> y aparecen primero en búsquedas.
                    </div>
                  </div>

                  {paquetes.map((paq, idx) => (
                    <div key={idx} className="border border-stone-200 rounded-xl p-4 mb-3 bg-stone-50/30 relative group">
                      <button
                        type="button"
                        onClick={() => setPaquetes((p) => p.filter((_, i) => i !== idx))}
                        className="absolute top-3 right-3 w-6 h-6 rounded-full bg-stone-200 text-stone-500 hover:bg-red-100 hover:text-red-600 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          type="text"
                          value={paq.nombre}
                          onChange={(e) => setPaquetes((p) => p.map((x, i) => i === idx ? { ...x, nombre: e.target.value } : x))}
                          placeholder="Nombre (Básico, Premium...)"
                          className="col-span-2 input !py-2 !text-sm"
                        />
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">$</span>
                          <input
                            type="number"
                            value={paq.precio}
                            onChange={(e) => setPaquetes((p) => p.map((x, i) => i === idx ? { ...x, precio: e.target.value } : x))}
                            placeholder="Precio"
                            className="input !py-2 !pl-7 !text-sm"
                          />
                        </div>
                      </div>
                      <textarea
                        value={paq.descripcion}
                        onChange={(e) => setPaquetes((p) => p.map((x, i) => i === idx ? { ...x, descripcion: e.target.value } : x))}
                        rows={2}
                        placeholder="Qué incluye este paquete..."
                        className="input !py-2 !text-sm resize-none"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setPaquetes([...paquetes, { nombre: '', descripcion: '', precio: '' }])}
                    className="w-full border-2 border-dashed border-stone-300 rounded-xl py-3 text-sm font-medium text-stone-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/40 transition-all flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar paquete
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Nav */}
            <div className="flex justify-between gap-3 mt-8 pt-6 border-t border-stone-100">
              <button
                type="button"
                disabled={paso === 1}
                onClick={() => setPaso((p) => Math.max(1, p - 1) as Paso)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Atrás
              </button>
              {paso < 3 ? (
                <button type="button" onClick={avanzar} className="btn-primary text-sm">
                  Continuar →
                </button>
              ) : (
                <button type="button" onClick={publicar} disabled={guardando} className="btn-primary text-sm">
                  {guardando ? 'Publicando...' : '🚀 Publicar servicio'}
                </button>
              )}
            </div>
          </div>

          {/* Preview sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-2 px-1">Vista previa en buscador</p>
              <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden card-hover">
                <div className="aspect-video bg-gradient-to-br from-teal-500/10 to-amber-500/10 flex items-center justify-center text-4xl">
                  {fotos.length > 0 ? (
                    <img src={fotos[0]} alt="" className="w-full h-full object-cover" />
                  ) : catSel ? (
                    CATEGORY_ICONS[catSel.nombre] || '🛠️'
                  ) : (
                    '🛠️'
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-medium text-teal-600 mb-1">{catSel?.nombre || 'Categoría'}</p>
                  <h3 className="font-display font-bold text-stone-900 text-sm leading-tight mb-1 line-clamp-2">
                    {titulo || 'Título del servicio aparecerá aquí'}
                  </h3>
                  <p className="text-xs text-stone-500 line-clamp-2 mb-3">
                    {descripcion || 'Descripción...'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">📍 {corregimiento || 'Zona'}</span>
                    <span className="font-display font-bold text-teal-700">
                      {(() => {
                        const minPaq = paquetes
                          .map((p) => Number(p.precio))
                          .filter((n) => n > 0);
                        if (minPaq.length > 0) return `desde $${Math.min(...minPaq).toFixed(0)}`;
                        return precioBase ? `$${Number(precioBase).toFixed(2)}` : '$—';
                      })()}
                    </span>
                  </div>
                  {paquetes.some((p) => p.nombre && Number(p.precio) > 0) && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Precio cerrado
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-900">
                  <strong>💡 Tip:</strong> Perfiles verificados reciben hasta 3× más clientes. Completa tu perfil en{' '}
                  <a href="/perfil" className="underline">Mi Perfil</a>.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
