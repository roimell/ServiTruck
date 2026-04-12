import { ESTADO_LABELS, ESTADO_COLORES, type EstadoTrabajo } from '@/types/database';

export default function EstadoBadge({ estado }: { estado: EstadoTrabajo }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${ESTADO_COLORES[estado]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {ESTADO_LABELS[estado]}
    </span>
  );
}
