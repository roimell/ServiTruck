'use client';

import { useMemo, useState } from 'react';
import { PANAMA_GEO, PROVINCIAS, provinciaDe } from '@/lib/panama-geo';

interface Props {
  /** Corregimientos seleccionados (lista plana) */
  seleccionados: string[];
  onChange: (nuevos: string[]) => void;
  /** Texto auxiliar */
  ayuda?: string;
}

/**
 * Selector jerárquico: provincia → corregimientos
 * - Acordeón por provincia
 * - Contador de seleccionados por provincia
 * - Botón "Seleccionar toda la provincia"
 * - Búsqueda rápida
 */
export default function SelectorCobertura({ seleccionados, onChange, ayuda }: Props) {
  const [provinciaAbierta, setProvinciaAbierta] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Agrupar seleccionados por provincia para el contador
  const conteoPorProvincia = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of seleccionados) {
      const p = provinciaDe(c);
      if (p) m[p] = (m[p] || 0) + 1;
    }
    return m;
  }, [seleccionados]);

  const provinciasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return PROVINCIAS;
    const q = busqueda.toLowerCase();
    return PROVINCIAS.filter((p) => {
      if (p.toLowerCase().includes(q)) return true;
      return PANAMA_GEO[p].some((c) => c.toLowerCase().includes(q));
    });
  }, [busqueda]);

  function toggleCorregimiento(c: string) {
    if (seleccionados.includes(c)) {
      onChange(seleccionados.filter((x) => x !== c));
    } else {
      onChange([...seleccionados, c]);
    }
  }

  function toggleProvinciaCompleta(p: string) {
    const corrs = PANAMA_GEO[p];
    const todosSel = corrs.every((c) => seleccionados.includes(c));
    if (todosSel) {
      onChange(seleccionados.filter((c) => !corrs.includes(c)));
    } else {
      const set = new Set([...seleccionados, ...corrs]);
      onChange(Array.from(set));
    }
  }

  function limpiarTodo() {
    onChange([]);
  }

  return (
    <div className="space-y-3">
      {/* Header con conteo + limpiar */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-semibold text-stone-900">{seleccionados.length}</span>{' '}
          <span className="text-stone-500">
            {seleccionados.length === 1 ? 'área seleccionada' : 'áreas seleccionadas'}
          </span>
        </div>
        {seleccionados.length > 0 && (
          <button
            type="button"
            onClick={limpiarTodo}
            className="text-xs text-stone-500 hover:text-red-600 font-medium"
          >
            Limpiar todo
          </button>
        )}
      </div>

      {ayuda && <p className="text-xs text-stone-400">{ayuda}</p>}

      {/* Buscador */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar provincia o corregimiento..."
          className="input !pl-9 !text-sm"
        />
      </div>

      {/* Chips de seleccionados (preview) */}
      {seleccionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-3 bg-teal-50/50 border border-teal-100 rounded-xl">
          {seleccionados.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 bg-white border border-teal-200 text-teal-700 text-xs font-medium px-2.5 py-1 rounded-full"
            >
              {c}
              <button
                type="button"
                onClick={() => toggleCorregimiento(c)}
                className="hover:text-red-600 ml-0.5"
                aria-label={`Quitar ${c}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Acordeón de provincias */}
      <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 bg-white">
        {provinciasFiltradas.map((p) => {
          const corrs = PANAMA_GEO[p];
          const corrsFiltrados = busqueda.trim()
            ? corrs.filter((c) => c.toLowerCase().includes(busqueda.toLowerCase()) || p.toLowerCase().includes(busqueda.toLowerCase()))
            : corrs;
          const conteo = conteoPorProvincia[p] || 0;
          const todosSel = corrs.every((c) => seleccionados.includes(c));
          const abierto = provinciaAbierta === p || (busqueda.trim() !== '' && corrsFiltrados.length > 0);

          return (
            <div key={p}>
              <button
                type="button"
                onClick={() => setProvinciaAbierta(abierto && provinciaAbierta === p ? null : p)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <svg
                    className={`w-4 h-4 text-stone-400 transition-transform ${abierto ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-stone-800 text-sm">{p}</span>
                  {conteo > 0 && (
                    <span className="text-xs font-semibold bg-teal-600 text-white px-2 py-0.5 rounded-full">
                      {conteo}
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-400">
                  {corrs.length} {corrs.length === 1 ? 'área' : 'áreas'}
                </span>
              </button>

              {abierto && (
                <div className="px-4 pb-4 pt-1 bg-stone-50/50">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleProvinciaCompleta(p); }}
                    className="text-xs font-medium text-teal-700 hover:text-teal-900 mb-2.5"
                  >
                    {todosSel ? '☒ Quitar toda la provincia' : '☐ Seleccionar toda la provincia'}
                  </button>
                  <div className="flex flex-wrap gap-1.5">
                    {corrsFiltrados.map((c) => {
                      const sel = seleccionados.includes(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCorregimiento(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            sel
                              ? 'bg-teal-600 text-white shadow-sm'
                              : 'bg-white border border-stone-200 text-stone-600 hover:border-teal-400 hover:text-teal-700'
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {provinciasFiltradas.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-stone-400">
            No se encontraron coincidencias para "{busqueda}"
          </div>
        )}
      </div>
    </div>
  );
}
