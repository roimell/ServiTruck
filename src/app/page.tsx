'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import type { Categoria } from '@/types/database';

export default function HomePage() {
  const supabase = createClient();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    supabase.from('categorias').select('*').order('nombre').then(({ data }) => {
      if (data) setCategorias(data);
    });
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/buscar?q=${encodeURIComponent(query.trim())}`;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Servicios de confianza en Panamá
          </h1>
          <p className="text-emerald-100 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Contrata profesionales verificados con pagos protegidos en custodia.
            Tu dinero está seguro hasta que el trabajo esté listo.
          </p>

          {/* Search */}
          <form onSubmit={handleSearch} className="max-w-xl mx-auto">
            <div className="flex bg-white rounded-xl shadow-lg overflow-hidden">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="¿Qué necesitas? (ej: electricista, plomero...)"
                className="flex-1 px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-emerald-700 text-white px-6 hover:bg-emerald-800 transition-colors flex items-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              ),
              title: 'Busca y elige',
              desc: 'Encuentra el profesional que necesitas en tu zona, con reseñas y precios transparentes.',
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ),
              title: 'Pago en custodia',
              desc: 'Tu dinero queda protegido. No se libera al profesional hasta que confirmes el trabajo.',
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ),
              title: 'Confirma y califica',
              desc: 'Cuando estés satisfecho, libera los fondos y deja tu reseña para ayudar a la comunidad.',
            },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                {step.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      {categorias.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 pb-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Categorías</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {categorias.map((c) => (
              <Link
                key={c.id}
                href={`/buscar?cat=${c.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700">
                  {c.nombre}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA for providers */}
      <section className="bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            ¿Eres profesional?
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto mb-8">
            Únete a ServiTrust y accede a datos de demanda en tu zona.
            Te decimos qué servicios están buscando y nadie ofrece.
          </p>
          <Link
            href="/auth/registro"
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            Registrarme como proveedor
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900">ServiTrust Panamá</span>
            </div>
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} ServiTrust. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
