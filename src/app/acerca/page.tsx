import Link from 'next/link';
import Navbar from '@/components/navbar';

export const metadata = {
  title: 'Sobre ServiTrust | Nuestra historia y visión',
  description: 'Conoce el proyecto ServiTrust Panamá, nuestra misión, el problema que resolvemos y el roadmap de funciones que vienen.',
};

const ROADMAP = {
  ya: [
    { t: 'Búsqueda de servicios y profesionales', d: 'Filtros por categoría, zona, urgencia y precio cerrado.' },
    { t: 'Chat directo cliente ↔ proveedor', d: 'Negocia y coordina sin intermediarios ni llamadas.' },
    { t: 'Paquetes con precio cerrado', d: 'Fin del "chatéame por precio". Tarifas claras antes de contratar.' },
    { t: 'Perfiles verificados manualmente', d: 'Nuestro equipo revisa identidad y certificaciones.' },
    { t: 'Reseñas verificadas', d: 'Solo clientes con trabajo real completado pueden calificar.' },
    { t: 'Cobertura por provincia y corregimiento', d: 'Las 10 provincias + comarcas de Panamá.' },
  ],
  pronto: [
    { t: 'Pagos protegidos (escrow)', d: 'Dinero retenido 48h tras finalizar trabajo para tu tranquilidad.' },
    { t: 'Video-presentación del profesional', d: '15 segundos de presentación real — confianza antes del primer contacto.' },
    { t: 'Notificaciones push', d: 'Nuevos mensajes, cotizaciones y recordatorios de citas.' },
    { t: 'Filtro de emergencias', d: 'Profesionales disponibles hoy para averías urgentes.' },
    { t: 'Aplicación móvil nativa', d: 'Android e iOS con acceso rápido desde el ícono.' },
  ],
  votando: [
    { t: 'Botón SOS de emergencia', d: '¿Lanzarlo pronto o esperar mayor cobertura?' },
    { t: 'Membresía premium para profesionales', d: '¿Qué beneficios valorarías?' },
    { t: 'Garantía de servicio con reembolso', d: '¿Lo usarías si costara un 5% extra?' },
    { t: 'Seguro opcional por trabajo', d: '¿Cubriría tu tranquilidad al contratar?' },
  ],
};

export default function AcercaPage() {
  return (
    <div className="min-h-screen bg-[var(--color-warm-bg)]">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-gradient noise">
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-20 md:py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-teal-50 text-xs font-medium uppercase tracking-wider">Proyecto en construcción</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
              Conectamos a Panamá con profesionales de confianza
            </h1>
            <p className="text-teal-100 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              ServiTrust nació de una frustración real: nunca saber con quién contratas, cuánto te va a cobrar, ni si el trabajo va a quedar bien hecho.
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto">
              <path d="M0 60V30C240 0 480 0 720 30C960 60 1200 60 1440 30V60H0Z" fill="var(--color-warm-bg)" />
            </svg>
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16 space-y-20">
        {/* El problema */}
        <section>
          <p className="text-teal-600 font-medium text-sm tracking-wide uppercase mb-2">El problema</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-8">
            Contratar servicios en Panamá no debería ser una lotería
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { i: '🤷', t: '"No sé a quién llamar"', d: 'WhatsApp de grupos vecinales, referencias dudosas, páginas sin filtro real.' },
              { i: '💸', t: '"¿Cuánto cobra?"', d: 'El técnico llega, evalúa, y el precio cambia según el carro afuera.' },
              { i: '😤', t: '"No volvió a contestar"', d: 'Paga, se va, algo falla. Silencio. Nadie responde.' },
            ].map((p) => (
              <div key={p.t} className="bg-white rounded-2xl border border-stone-200/80 p-6">
                <div className="text-4xl mb-3">{p.i}</div>
                <h3 className="font-display font-bold text-stone-900 mb-1.5">{p.t}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Misión */}
        <section className="bg-gradient-to-br from-teal-50 via-white to-amber-50 rounded-3xl border border-stone-200/80 p-8 md:p-12">
          <p className="text-teal-700 font-medium text-sm tracking-wide uppercase mb-2">Nuestra misión</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-4">
            Que contratar sea tan simple como pedir comida.
          </h2>
          <p className="text-stone-700 text-lg leading-relaxed max-w-3xl">
            Queremos construir el marketplace de servicios más confiable de Panamá: precios cerrados, profesionales verificados, reseñas reales y cero fricción. Desde cambiar un bombillo hasta remodelar una casa — con la misma transparencia.
          </p>
        </section>

        {/* Roadmap */}
        <section>
          <p className="text-teal-600 font-medium text-sm tracking-wide uppercase mb-2">Hacia dónde vamos</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 mb-8">
            Roadmap público
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Ya disponible */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-6">
              <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4">
                ✅ Ya funcionando
              </div>
              <ul className="space-y-3">
                {ROADMAP.ya.map((x) => (
                  <li key={x.t}>
                    <p className="text-sm font-semibold text-stone-900">{x.t}</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{x.d}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Próximamente */}
            <div className="bg-white rounded-2xl border border-amber-200 p-6">
              <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4">
                🚧 En camino
              </div>
              <ul className="space-y-3">
                {ROADMAP.pronto.map((x) => (
                  <li key={x.t}>
                    <p className="text-sm font-semibold text-stone-900">{x.t}</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{x.d}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Votando */}
            <div className="bg-white rounded-2xl border border-purple-200 p-6">
              <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-4">
                🗳️ Tú decides
              </div>
              <ul className="space-y-3">
                {ROADMAP.votando.map((x) => (
                  <li key={x.t}>
                    <p className="text-sm font-semibold text-stone-900">{x.t}</p>
                    <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{x.d}</p>
                  </li>
                ))}
              </ul>
              <Link
                href="/feedback"
                className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900"
              >
                Dinos tu opinión →
              </Link>
            </div>
          </div>
        </section>

        {/* CTA feedback */}
        <section className="bg-stone-900 rounded-3xl p-10 md:p-14 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,white,transparent_50%)]" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Esto lo construimos entre todos
            </h2>
            <p className="text-stone-300 text-lg leading-relaxed mb-8">
              Si algo te falta, no te funciona o tienes una idea mejor — queremos escucharte. Sin formalidades, sin formularios largos.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/feedback" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-7 py-3.5 rounded-xl transition-all shadow-lg">
                Comparte tu opinión
              </Link>
              <Link href="/buscar" className="bg-white/10 hover:bg-white/20 border border-white/20 font-semibold px-7 py-3.5 rounded-xl transition-all backdrop-blur-sm">
                Explorar servicios
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
