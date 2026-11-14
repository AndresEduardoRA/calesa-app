import { formatearFecha } from '@/shared/lib/fechas'
import { detalleDeDemorada, detalleDeTrabado } from './bandeja'
import type { FilaDeLaBandeja } from './grupo-leido'

// Lo que dice cada fila de la bandeja del día (lo que ofrece, en `features/alertas/accion-de-la-fila.ts`). Los textos de vencimiento, ETA y zarpe son de esta área (`alertas` no importa `documentos`). Puro: ninguna lectura.

const ESTE_DIA = 'este día'

function dia(texto: string, zona: string): string {
  return formatearFecha(texto, { zona }) || ESTE_DIA
}

function unidos(partes: ReadonlyArray<string | null | undefined>): string {
  return partes.filter((p) => p !== null && p !== undefined && p !== '').join(' · ')
}

/** La línea de detalle bajo el nombre: dónde está, qué le falta o cuándo vence, según el grupo. */
export function detalleDeLaFila(fila: FilaDeLaBandeja, ahora: Date, zona: string): string {
  if (fila.grupo === 'demorados') return detalleDeDemorada(fila, ahora)
  if (fila.grupo === 'trabados') return detalleDeTrabado(fila)
  return detalleDeLaFilaDeUnTransporteOUnDocumento(fila, zona)
}

function detalleDeLaFilaDeUnTransporteOUnDocumento(
  fila: Exclude<FilaDeLaBandeja, { grupo: 'demorados' | 'trabados' }>,
  zona: string,
): string {
  switch (fila.grupo) {
    case 'por_aprobar':
      return unidos([fila.tipo, `subido el ${dia(fila.creadoEn, zona)}`])
    case 'por_vencer':
      return unidos([
        fila.tipo,
        `vence el ${dia(fila.venceEl, zona)}`,
        fila.modo === 'renovar' ? 'sube el nuevo para renovarlo' : 'pide uno nuevo',
      ])
    case 'llegadas':
      return unidos([
        `«${fila.fase}»`,
        `ETA ${dia(fila.etaEl, zona)}`,
        fila.contenedor ? `contenedor ${fila.contenedor}` : null,
      ])
    case 'salidas':
      return unidos([
        fila.fase ? `«${fila.fase}»` : 'Sin fase',
        'zarpa hoy',
        fila.booking ? `booking ${fila.booking}` : null,
        fila.contenedor ? `contenedor ${fila.contenedor}` : null,
      ])
    case 'sin_resolver':
      return `Subasta sin resolver desde el ${dia(fila.creadoEn, zona)}`
  }
}
