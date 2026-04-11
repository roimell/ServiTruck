'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Redirigir al detalle del servicio — el flujo de agendamiento
// ahora se maneja mediante solicitud + negociación en chat.
export default function AgendarRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/servicio/${params.id}`);
  }, [params.id, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400 text-sm">Redirigiendo...</p>
    </div>
  );
}
