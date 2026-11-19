// Lo publicado de cada origen, para el inicio de Configuración › Cotización: la versión de la fórmula publicada y si hay una plantilla de la
// tarjeta publicada. Cruza la fórmula y la plantilla, por eso vive en el núcleo (un área no importa otra). Puro: las filas las trae `infra/`.
import { z } from 'zod'

// Los orígenes que el inicio dibuja como mucho (más, con «Mostrando los 100 primeros»). Son tablas de configuración: decenas.
export const TOPE_DE_ORIGENES_DEL_INICIO = 100

export const esquemaDeLosIds = z.array(z.guid()).max(TOPE_DE_ORIGENES_DEL_INICIO)

export const esquemaDeLasFormulasPublicadas = z.array(
  z.object({ origen_id: z.guid(), version: z.number().int() }),
)

export const esquemaDeLasPlantillasPublicadas = z.array(z.object({ origen_id: z.guid() }))

export type PublicadoDelOrigen = {
  // null: el origen no tiene fórmula publicada.
  versionDeLaFormula: number | null
  tarjetaPublicada: boolean
}

// Un id sin fila queda «sin»; una fila de un id que no se pidió se ignora.
export function publicadasPorOrigen(
  ids: readonly string[],
  formulas: z.infer<typeof esquemaDeLasFormulasPublicadas>,
  plantillas: z.infer<typeof esquemaDeLasPlantillasPublicadas>,
): Map<string, PublicadoDelOrigen> {
  const version = new Map(formulas.map((fila) => [fila.origen_id, fila.version]))
  const conTarjeta = new Set(plantillas.map((fila) => fila.origen_id))
  return new Map(
    ids.map((id) => [
      id,
      { versionDeLaFormula: version.get(id) ?? null, tarjetaPublicada: conTarjeta.has(id) },
    ]),
  )
}
