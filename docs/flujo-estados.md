# Flujo de Estados — Solicitud de Trabajo (v2: Negociación)

```
┌────────────────────┐   proveedor    ┌───────────┐   inician     ┌─────────────┐
│ solicitud_enviada  │───acepta──────▶│ aceptada  │───chat───────▶│ negociando  │
└────────────────────┘               └───────────┘               └─────────────┘
        │                                 │                            │
        │ rechaza/expira                  │ cancela/expira             │ proveedor envía
        ▼                                 ▼                            │ cotización
┌────────────┐                    ┌───────────┐                        ▼
│ rechazada  │                    │ cancelado │◀───────┐    ┌──────────────────────┐
└────────────┘                    └───────────┘        │    │ cotizacion_enviada   │
┌────────────┐                         ▲               │    └──────────────────────┘
│  expirada  │                         │               │         │          │
└────────────┘                         │               │    cliente    vuelve a
                                       │               │    paga       negociar
                                       │               │         │          │
                                       │               │         ▼          ▼
                                       │               │  ┌─────────────────┐
                                       │               ├──│ pagado_custodia │
                                       │               │  └─────────────────┘
                                       │               │         │
                                       │               │    proveedor inicia
                                       │               │         │
                                       │               │         ▼
                                       │               │  ┌─────────────┐
                                       │               ├──│ en_progreso │
                                       │               │  └─────────────┘
                                       │               │         │
                                       │               │    proveedor marca listo
                                       │               │         │
                                       │               │         ▼
                                       │               │  ┌───────────┐
                                       │               │  │ terminado │
                                       │               │  └───────────┘
                                       │               │         │
                                       │ ┌──────────┐  │    cliente confirma
                                       ├─│ disputa  │◀─┘         │
                                       │ └──────────┘            ▼
                                       │      │       ┌──────────────────────────────┐
                                       │      └──────▶│ completado_fondos_liberados  │
                                       │              └──────────────────────────────┘
                                       │                         │
                                       └─────────────────────────┘
                                         resolución                ✅ Puede dejar reseña
```

## Transiciones Permitidas

| Estado Actual              | → Puede ir a                                     | Quién ejecuta    |
|---------------------------|--------------------------------------------------|------------------|
| `solicitud_enviada`       | `aceptada`, `rechazada`, `expirada`              | Proveedor / Cron |
| `aceptada`                | `negociando`, `cancelado`, `expirada`            | Ambas partes     |
| `negociando`              | `cotizacion_enviada`, `cancelado`, `expirada`    | Proveedor / Cron |
| `cotizacion_enviada`      | `pagado_custodia`, `negociando`, `cancelado`, `expirada` | Cliente  |
| `pendiente`               | `pagado_custodia`, `cancelado`                   | Cliente / Sistema |
| `pagado_custodia`         | `en_progreso`, `cancelado`, `disputa`            | Proveedor        |
| `en_progreso`             | `terminado`, `disputa`                           | Proveedor        |
| `terminado`               | `completado_fondos_liberados`, `disputa`         | Cliente          |
| `completado_fondos_liberados` | _(estado final)_                             | —                |
| `cancelado`               | _(estado final)_                                 | —                |
| `rechazada`               | _(estado final)_                                 | —                |
| `expirada`                | _(estado final)_                                 | —                |
| `disputa`                 | `completado_fondos_liberados`, `cancelado`       | Admin / Sistema  |

## Chat activo en estos estados
`aceptada`, `negociando`, `cotizacion_enviada`, `pagado_custodia`, `en_progreso`, `terminado`, `disputa`

## Flujo del Cliente

1. **Busca servicio** → ve paquetes y disponibilidad del proveedor
2. **Envía solicitud** → describe lo que necesita, adjunta fotos opcionales, selecciona paquete (opcional)
3. **Espera aceptación** → el proveedor revisa y acepta o rechaza
4. **Chat de negociación** → acuerdan detalles, fechas, alcance
5. **Recibe cotización** → el proveedor envía cotización formal en el chat
6. **Paga** → acepta cotización y paga (custodia)
7. **Sigue progreso** → ve estado del trabajo
8. **Confirma completado** → libera fondos al proveedor
9. **Deja reseña** → disponible tras liberar fondos

## Flujo del Proveedor

1. **Recibe solicitud** → ve descripción, fotos, paquete seleccionado
2. **Acepta o rechaza** → decide si tomar el trabajo
3. **Negocia en chat** → acuerda detalles con el cliente
4. **Envía cotización** → monto formal basado en paquete o personalizado
5. **Espera pago** → el cliente paga la cotización
6. **Inicia trabajo** → marca como en progreso
7. **Marca terminado** → notifica al cliente
8. **Recibe pago** → fondos liberados automáticamente (menos comisión)

## Expiración automática
- Solicitudes en `solicitud_enviada`, `aceptada`, `negociando`, `cotizacion_enviada` sin actividad por **15 días** se marcan como `expirada` automáticamente vía `expirar_solicitudes_inactivas()`.

## Flujo de Dinero

```
Cliente paga $100 (acepta cotización)
    ├── monto_total:          $100.00
    ├── comision_porcentaje:   10.00%
    ├── comision_monto:        $10.00  (para ServiTrust)
    └── monto_proveedor:       $90.00  (se libera al completar)

Estado: cotizacion_enviada ──▶ pagado_custodia
        Dinero:                Retenido en custodia

Estado: completado_fondos_liberados
        Dinero:       $90 → proveedor, $10 → ServiTrust
```

## Métricas del Proveedor
- Total solicitudes, trabajos completados, trabajos activos
- Tasa de conversión (completados / total)
- Tasa de aceptación (no rechazados / total)
- Ingresos totales y del mes actual
- Ticket promedio
- Rating y reseñas
- Vistas de perfil (últimos 30 días)
- Ingresos por mes (gráfico de barras)
- Tendencias de búsqueda por categoría y hora
