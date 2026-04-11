import { ESTADO_LABELS, ESTADO_COLORES, type EstadoTrabajo } from '@/types/database';

export default function EstadoBadge({ estado }: { estado: EstadoTrabajo }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ESTADO_COLORES[estado]}`}>
      {ESTADO_LABELS[estado]}
    </span>
  );
}
