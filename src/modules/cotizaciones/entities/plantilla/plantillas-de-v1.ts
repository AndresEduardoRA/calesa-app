// Arma lo que el modal «Empezar desde una plantilla» recibe del servidor (`datos-de-plantillas-de-v1.ts`): por cada plantilla de V1, la lectura de su tarjeta con
// sus propios colores (quizá todavía no están en el catálogo; al dibujarla, cifras de ejemplo), los avisos y si sus colores caben. Pura.
import { avisosDeLaPlantilla } from '../plantillas-de-v1/avisos'
import {
  coloresDeLaPlantilla,
  motivoDeColores,
  type ColorDelCatalogo,
} from '../plantillas-de-v1/colores'
import type { BorradoresDelOrigen } from '../plantillas-de-v1/pregunta'
import type { PlantillaDeV1 } from '../plantillas-de-v1/tipos'
import { visibilidadDeLaPlantilla } from '../plantillas-de-v1/visibilidad'
import type { ColoresDeLaPlantillaDeV1, DatosDePlantillasDeV1 } from './datos-de-plantillas-de-v1'
import { TOPE_DE_TONOS } from './lectura-de-la-plantilla'
import { lecturaEnCuadricula } from './lectura-en-cuadricula'

export type LoQueTieneElOrigen = {
  readonly origen: string
  readonly catalogo: readonly ColorDelCatalogo[]
  // Las claves activas de la empresa y del origen.
  readonly tiposDeCambio: readonly string[]
  readonly campos: readonly string[]
  readonly borradores: BorradoresDelOrigen
}

function colores(
  p: PlantillaDeV1,
  catalogo: readonly ColorDelCatalogo[],
): ColoresDeLaPlantillaDeV1 {
  const plan = coloresDeLaPlantilla(p, catalogo, TOPE_DE_TONOS)
  return plan.ok
    ? { tipo: 'caben', crear: plan.crear.length }
    : { tipo: 'no_caben', motivo: motivoDeColores(plan) }
}

export function datosDePlantillasDeV1(
  paquetes: readonly PlantillaDeV1[],
  tiene: LoQueTieneElOrigen,
): DatosDePlantillasDeV1 {
  return {
    plantillas: paquetes.map((p) => ({
      clave: p.clave,
      nombre: p.nombre,
      frase: p.frase,
      lectura: lecturaEnCuadricula(
        p.tarjeta,
        {
          definicion: p.formula.definicion,
          diseno: p.formula.diseno,
          visibilidad: visibilidadDeLaPlantilla(p),
          tonos: null,
        },
        p.colores,
      ),
      avisos: avisosDeLaPlantilla(p, {
        tiposDeCambio: tiene.tiposDeCambio,
        campos: tiene.campos,
        origen: tiene.origen,
      }),
      colores: colores(p, tiene.catalogo),
    })),
    borradores: tiene.borradores,
  }
}
