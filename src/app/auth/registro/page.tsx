'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function RegistroPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esProveedor, setEsProveedor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
          es_proveedor: esProveedor,
        },
      },
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setExito(true);
    setLoading(false);
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-warm-bg)] px-4">
        <div className="w-full max-w-sm text-center animate-in">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-bold text-stone-900">¡Revisa tu correo!</h2>
          <p className="text-stone-500 mt-3 leading-relaxed">
            Te enviamos un enlace de confirmación a{' '}
            <span className="font-medium text-stone-700">{email}</span>
          </p>
          <Link
            href="/auth/login"
            className="btn-primary mt-8 inline-flex"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 hero-gradient noise relative items-center justify-center p-12">
        <div className="relative z-10 max-w-md">
          <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-8">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="font-display text-4xl font-bold text-white leading-tight mb-4">
            Empieza a construir confianza hoy
          </h2>
          <p className="text-teal-100 leading-relaxed mb-10">
            {esProveedor
              ? 'Llega a más clientes, cobra de forma segura y haz crecer tu negocio con datos exclusivos de demanda.'
              : 'Encuentra profesionales confiables con pagos protegidos. Tú pagas solo cuando estás satisfecho.'
            }
          </p>

          {/* Benefits list */}
          <div className="space-y-4">
            {(esProveedor
              ? [
                  'Cobro asegurado por cada trabajo',
                  'Perfil profesional con reseñas reales',
                  'Datos de demanda exclusivos en tu zona',
                ]
              : [
                  'Profesionales verificados con reseñas',
                  'Pago protegido hasta que estés satisfecho',
                  'Chat directo y cotización transparente',
                ]
            ).map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-400/20 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-teal-50 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-[var(--color-warm-bg)] px-4 sm:px-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-teal-700 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="font-display font-bold text-xl text-stone-900">
                Servi<span className="text-teal-600">Trust</span>
              </span>
            </Link>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-stone-900">Crear cuenta</h1>
            <p className="text-stone-500 mt-1 text-sm">Únete a la comunidad ServiTrust</p>
          </div>

          <form onSubmit={handleRegistro} className="space-y-5">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-stone-700 mb-1.5">
                Nombre completo
              </label>
              <input
                id="nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1.5">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input-field"
              />
            </div>

            {/* Provider toggle — redesigned as appealing card */}
            <button
              type="button"
              onClick={() => setEsProveedor(!esProveedor)}
              className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
                esProveedor
                  ? 'border-teal-500 bg-teal-50/50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  esProveedor
                    ? 'bg-teal-600 border-teal-600'
                    : 'border-stone-300'
                }`}>
                  {esProveedor && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-stone-900 block">
                    Quiero ofrecer mis servicios
                  </span>
                  <span className="text-xs text-stone-500 mt-0.5 block">
                    Registrarme como profesional y empezar a recibir clientes
                  </span>
                </div>
              </div>
            </button>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200/80 rounded-xl p-3.5 text-sm text-red-700">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creando cuenta...
                </span>
              ) : 'Crear cuenta gratis'}
            </button>
          </form>

          <p className="text-center text-sm text-stone-500 mt-8">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-teal-600 hover:text-teal-700 font-semibold">
              Inicia sesión
            </Link>
          </p>

          <Link
            href="/"
            className="block text-center text-xs text-stone-400 hover:text-stone-500 mt-4 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
