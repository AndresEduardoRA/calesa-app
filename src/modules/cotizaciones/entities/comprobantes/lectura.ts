// Lo que devuelve la lectura de `comprobantes` para la guardada (4.26-2) y para el resumen de una cotización: el `select` y la forma de cada fila, con Zod. No incluye `datos` (P4 a):
// lo congelado no se dibuja. Sin React ni Supabase: la leen `infra/comprobantes/leer.ts` (servidor) y `leer.client.ts` (navegador).
import { z } from 'zod'
import type { ComprobanteDeLaCotizacion } from './comprobante'

// Los nombres de quien emitió y de quien anuló salen de `perfiles`, que lee todo usuario activo.
export const COLUMNAS_DE_COMPROBANTES =
  'id, serie, numero, emitido_en, anulado_en, motivo_anulacion, emisor:perfiles!comprobantes_emitido_por_fkey(nombre), anulador:perfiles!comprobantes_anulado_por_fkey(nombre)'

const esquemaDelNombre = z.object({ nombre: z.string().nullable() }).nullable()

const esquemaDeLaFila = z.object({
  id: z.guid(),
  serie: z.string().min(1),
  numero: z.number().int().positive(),
  emitido_en: z.string().min(10),
  anulado_en: z.string().min(10).nullable(),
  motivo_anulacion: z.string().nullable(),
  emisor: esquemaDelNombre,
  anulador: esquemaDelNombre,
})

// Las filas de la lectura, o nulo si alguna no es lo que promete (un error, nunca una lista vacía).
export function comprobantesDesde(crudo: unknown): ComprobanteDeLaCotizacion[] | null {
  const leidas = z.array(esquemaDeLaFila).safeParse(crudo)
  if (!leidas.success) {
    return null
  }
  return leidas.data.map((fila) => ({
    id: fila.id,
    serie: fila.serie,
    numero: fila.numero,
    emitidoEn: fila.emitido_en,
    emitidoPor: fila.emisor?.nombre ?? null,
    anuladoEn: fila.anulado_en,
    anuladoPor: fila.anulador?.nombre ?? null,
    motivo: fila.motivo_anulacion,
  }))
}
