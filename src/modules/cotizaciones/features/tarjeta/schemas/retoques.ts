import { z } from 'zod'
import { ES_ID } from '../../../entities/json-de-la-base'
import { MAXIMO_DE_CELDAS, MAXIMO_DE_FILAS } from '../../../entities/cuadricula-de-la-tarjeta'

// Lo que manda el modo «Retocar»: la cotización, la versión que tenía en pantalla (el texto de la base, nunca por `Date`) y los retoques (nulos: volver a la
// plantilla). Los ids con la forma de un id; las celdas y las filas, con los topes de la cuadrícula. Los textos (largo, bytes) los valida la base.
export const esquemaDeRetoques = z.object({
  cotizacionId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
  retoques: z
    .strictObject({
      celdas: z
        .record(z.string().regex(ES_ID), z.string())
        .refine((celdas) => Object.keys(celdas).length <= MAXIMO_DE_CELDAS, {
          error: 'Hay demasiados retoques.',
        })
        .readonly()
        .optional(),
      filas_ocultas: z.array(z.string().regex(ES_ID)).max(MAXIMO_DE_FILAS).readonly().optional(),
    })
    .nullable(),
})

export type EntradaDeRetoques = z.infer<typeof esquemaDeRetoques>
