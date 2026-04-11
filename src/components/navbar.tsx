'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import type { Perfil } from '@/types/database';

export default function Navbar() {
  const router = useRouter();
  const supabase = createClient();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    async function cargarPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setPerfil(data);
    }
    cargarPerfil();
  }, []);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    setPerfil(null);
    setMenuAbierto(false);
    router.push('/');
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-lg">ServiTrust</span>
        </Link>

        {/* Search link (mobile) */}
        <Link
          href="/buscar"
          className="md:hidden text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/buscar" className="text-sm text-gray-600 hover:text-gray-900">
            Buscar servicios
          </Link>

          {perfil ? (
            <div className="relative">
              <button
                onClick={() => setMenuAbierto(!menuAbierto)}
                className="flex items-center gap-2 text-sm"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold">
                  {perfil.nombre[0]}
                </div>
                <span className="text-gray-700">{perfil.nombre}</span>
              </button>

              {menuAbierto && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
                  {perfil.es_proveedor && (
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuAbierto(false)}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Mi Dashboard
                    </Link>
                  )}
                  <Link
                    href="/mis-solicitudes"
                    onClick={() => setMenuAbierto(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Mis Solicitudes
                  </Link>
                  <button
                    onClick={cerrarSesion}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/auth/registro"
                className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
