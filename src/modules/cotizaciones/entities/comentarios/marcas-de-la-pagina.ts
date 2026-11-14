// Las marcas de las cotizaciones de una página del listado (favorita, reporte propio, estado y versión), en una forma. Sin I/O: la lectura (`infra/comentarios/marcas.ts`) pasa lo que
// leyó de la base y esto lo valida y lo une por id.
import { z } from 'zod'
import type { EstadoDeLaCotizacion } from './moderacion'

// Lo que el menú «⋯» de una fila necesita de su cotización y que el listado no trae: la versión con la que se actúa (el texto de la base, con sus microsegundos: nunca pasa por
// `Date`), el estado y el contador de reportes (los mismos de la guardada) y las marcas propias de quien mira.
export type MarcasDeUnaFila = {
  actualizadoEn: string
  estado: EstadoDeLaCotizacion
  reportesCount: number
  favorita: boolean
  // El motivo del reporte de quien mira; nulo si no la reportó.
  miMotivo: string | null
}

const esquemaDeLasFilas = z.array(
  z.object({
    id: z.guid(),
    actualizado_en: z.string().min(1),
    estado: z.enum(['activa', 'reportada', 'invalida']),
    reportes_count: z.int().min(0),
  }),
)
const esquemaDeLasFavoritas = z.array(z.object({ cotizacion_id: z.guid() }))
const esquemaDeLosReportes = z.array(
  z.object({ cotizacion_id: z.guid(), motivo: z.string().nullable() }),
)

// Une las tres lecturas por clave primaria de una página. Una forma rota es nulo (nunca marcas inventadas: el menú no ofrece lo que depende de ellas); una cotización que no
// llegó (ya no se ve) no está en el mapa.
export function marcasDeLaPaginaDesde(crudo: {
  cotizaciones: unknown
  favoritas: unknown
  reportes: unknown
}): ReadonlyMap<string, MarcasDeUnaFila> | null {
  const filas = esquemaDeLasFilas.safeParse(crudo.cotizaciones)
  const favoritas = esquemaDeLasFavoritas.safeParse(crudo.favoritas)
  const reportes = esquemaDeLosReportes.safeParse(crudo.reportes)
  if (!filas.success || !favoritas.success || !reportes.success) {
    return null
  }
  const deFavorita = new Set(favoritas.data.map((f) => f.cotizacion_id))
  const deReporte = new Map(reportes.data.map((r) => [r.cotizacion_id, r.motivo ?? '']))
  return new Map(
    filas.data.map((fila) => [
      fila.id,
      {
        actualizadoEn: fila.actualizado_en,
        estado: fila.estado,
        reportesCount: fila.reportes_count,
        favorita: deFavorita.has(fila.id),
        miMotivo: deReporte.get(fila.id) ?? null,
      },
    ]),
  )
}
