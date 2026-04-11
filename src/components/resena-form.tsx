'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

interface ResenaFormProps {
  trabajoId: string;
  proveedorNombre: string;
  onEnviada: () => void;
  onCancelar: () => void;
}

export default function ResenaForm({ trabajoId, proveedorNombre, onEnviada, onCancelar }: ResenaFormProps) {
  const supabase = createClient();
  const [estrellas, setEstrellas] = useState(0);
  const [hover, setHover] = useState(0);
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  async function enviar() {
    if (estrellas === 0) {
      setError('Selecciona una calificación');
      return;
    }

    setEnviando(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Debes iniciar sesión');
      setEnviando(false);
      return;
    }

    const { error: errInsert } = await supabase.from('resenas').insert({
      trabajo_id: trabajoId,
      autor_id: user.id,
      estrellas,
      comentario: comentario.trim() || null,
    });

    if (errInsert) {
      setError(errInsert.message);
      setEnviando(false);
      return;
    }

    setEnviando(false);
    onEnviada();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Califica tu experiencia</h2>
        <p className="text-sm text-gray-500 mb-4">¿Cómo fue tu servicio con {proveedorNombre}?</p>

        {/* Estrellas */}
        <div className="flex items-center justify-center gap-1 py-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setEstrellas(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <svg
                className={`w-10 h-10 transition-colors ${
                  n <= (hover || estrellas) ? 'text-amber-400' : 'text-gray-200'
                } fill-current`}
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        {/* Label */}
        {estrellas > 0 && (
          <p className="text-center text-sm font-medium text-gray-700 mb-4">
            {['Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][estrellas - 1]}
          </p>
        )}

        {/* Comentario */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Comentario <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Cuenta cómo fue tu experiencia..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{comentario.length}/500</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancelar}
            disabled={enviando}
            className="flex-1 bg-white border border-gray-300 text-gray-700 font-medium py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={enviar}
            disabled={estrellas === 0 || enviando}
            className="flex-[2] bg-emerald-600 text-white font-semibold py-2.5 rounded-xl hover:bg-emerald-700 disabled:bg-gray-300 transition-colors text-sm shadow-lg shadow-emerald-200"
          >
            {enviando ? 'Enviando...' : 'Publicar reseña'}
          </button>
        </div>
      </div>
    </div>
  );
}
