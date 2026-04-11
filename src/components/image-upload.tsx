'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase';

interface ImageUploadProps {
  bucket: 'servicios' | 'avatares' | 'solicitudes';
  userId: string;
  value: string[]; // URLs o paths
  onChange: (urls: string[]) => void;
  maxImages?: number;
  maxSizeMB?: number;
  /** Si es true, el bucket es público y se guarda el URL completo. Si no, el path relativo. */
  publicBucket?: boolean;
}

export default function ImageUpload({
  bucket,
  userId,
  value,
  onChange,
  maxImages = 5,
  maxSizeMB = 5,
  publicBucket = true,
}: ImageUploadProps) {
  const supabase = createClient();
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function subirArchivo(file: File) {
    setError('');

    // Validaciones
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`La imagen no debe superar ${maxSizeMB}MB`);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WebP');
      return;
    }
    if (value.length >= maxImages) {
      setError(`Máximo ${maxImages} imágenes`);
      return;
    }

    setSubiendo(true);

    // Generar nombre único: userId/timestamp-random.ext
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setSubiendo(false);
      return;
    }

    // Si es bucket público, guardar URL completo; si privado, guardar path
    let urlOPath: string;
    if (publicBucket) {
      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      urlOPath = data.publicUrl;
    } else {
      urlOPath = filename;
    }

    onChange([...value, urlOPath]);
    setSubiendo(false);
  }

  async function manejarArchivos(files: FileList | null) {
    if (!files) return;
    for (let i = 0; i < files.length; i++) {
      if (value.length + i >= maxImages) break;
      await subirArchivo(files[i]);
    }
  }

  async function eliminar(idx: number) {
    const item = value[idx];
    // Extraer el path relativo (funciona para URL público o path)
    let path: string;
    if (publicBucket) {
      const match = item.match(new RegExp(`/${bucket}/(.+)$`));
      path = match ? match[1] : '';
    } else {
      path = item;
    }

    if (path) {
      await supabase.storage.from(bucket).remove([path]);
    }

    onChange(value.filter((_, i) => i !== idx));
  }

  // Para mostrar previews de paths privados, generamos signed URLs
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  async function obtenerSignedUrl(path: string) {
    if (signedUrls[path]) return signedUrls[path];
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setSignedUrls(prev => ({ ...prev, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  }

  function getDisplayUrl(item: string): string {
    if (publicBucket) return item;
    return signedUrls[item] || '';
  }

  // Solicitar signed URLs para paths no cargados
  if (!publicBucket) {
    value.forEach(item => {
      if (!signedUrls[item]) obtenerSignedUrl(item);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {value.map((item, idx) => {
          const url = getDisplayUrl(item);
          return (
            <div
              key={idx}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group border border-gray-200"
            >
              {url ? (
                <Image
                  src={url}
                  alt={`Imagen ${idx + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 25vw"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-100 animate-pulse" />
              )}
              <button
                type="button"
                onClick={() => eliminar(idx)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}

        {value.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={subiendo}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-emerald-600 disabled:opacity-50"
          >
            {subiendo ? (
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-medium">Agregar</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => manejarArchivos(e.target.files)}
      />

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}

      <p className="text-xs text-gray-400 mt-2">
        {value.length}/{maxImages} imágenes · Máximo {maxSizeMB}MB por imagen
      </p>
    </div>
  );
}
