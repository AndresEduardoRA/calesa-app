// Lo que el modal «Empezar desde una plantilla» recibe del servidor (`GET /configuracion/cotizacion/<origen>/plantillas-de-v1`, lo arma
// `datosDePlantillasDeV1()`): por cada plantilla de V1 su nombre, su frase, la lectura de su tarjeta, los avisos y si sus colores caben; y los borradores del
// origen, con la versión que cada uno espera. Plano: cruza de una ruta a un componente de cliente, que lo lee con el esquema de abajo.
// docs/UX.md › «Cotización: empezar desde una plantilla (estados propios)».
import { z } from 'zod'
import type { LecturaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import {
  CLAVES_DE_PLANTILLA_DE_V1,
  esquemaDeClaveDePlantillaDeV1,
  type ClaveDePlantillaDeV1,
} from '../plantillas-de-v1/claves'
import type { BorradoresDelOrigen } from '../plantillas-de-v1/pregunta'

export type ColoresDeLaPlantillaDeV1 =
  | { readonly tipo: 'caben'; readonly crear: number }
  | { readonly tipo: 'no_caben'; readonly motivo: string }

export type PlantillaDeV1ParaElegir = {
  readonly clave: ClaveDePlantillaDeV1
  readonly nombre: string
  readonly frase: string
  readonly lectura: LecturaEnCuadricula
  readonly avisos: readonly string[]
  readonly colores: ColoresDeLaPlantillaDeV1
}

export type DatosDePlantillasDeV1 = {
  readonly plantillas: readonly PlantillaDeV1ParaElegir[]
  readonly borradores: BorradoresDelOrigen
}

// La versión como el texto de la base, con sus microsegundos (un `Date` los pierde).
const esquemaDeHora = z.iso.datetime({ offset: true })

// La lectura de la tarjeta la arma el servidor (`lecturaEnCuadricula()`) y la dibuja el lienzo de la pestaña Tarjeta: aquí sólo se pide que sea un objeto con su
// cuadrícula.
const esquemaDeLectura = z.custom<LecturaEnCuadricula>(
  (v) => typeof v === 'object' && v !== null && 'definicion' in v && 'nodos' in v,
)

export const esquemaDeDatosDePlantillasDeV1 = z.object({
  plantillas: z
    .array(
      z.object({
        clave: esquemaDeClaveDePlantillaDeV1,
        nombre: z.string().min(1),
        frase: z.string(),
        lectura: esquemaDeLectura,
        avisos: z.array(z.string()),
        colores: z.discriminatedUnion('tipo', [
          z.object({ tipo: z.literal('caben'), crear: z.int().min(0) }),
          z.object({ tipo: z.literal('no_caben'), motivo: z.string() }),
        ]),
      }),
    )
    .max(CLAVES_DE_PLANTILLA_DE_V1.length),
  borradores: z.object({
    formula: z
      .object({ autor: z.string(), tuyo: z.boolean(), actualizadoEn: esquemaDeHora })
      .nullable(),
    tarjeta: z.object({ actualizadoEn: esquemaDeHora }).nullable(),
  }),
})
