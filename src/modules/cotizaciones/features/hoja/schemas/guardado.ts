import { z } from 'zod'
import { largoDelTitulo, TOPE_DEL_TITULO } from '../../../entities/titulo-de-la-cotizacion'

// Lo que manda la hoja al guardar (`PedidoDeGuardado`). Los ids son de la base (`z.guid()`); la hoja abierta es opaca y acotada (`<fórmula>.<µs>.<huella>.<firma>`); las entradas
// tienen la forma que acepta `cotizacion_crear()` y la base las valida otra vez contra la fórmula.
export const esquemaDeEntradas = z.object({
  inputs: z.record(z.string().max(200), z.number()),
  banderas: z.record(z.string().max(200), z.boolean()),
  overrides: z.record(z.string().max(200), z.number()),
  variante: z.string().max(200).optional(),
})

// El título de la cotización: hasta 120 puntos de código, como los cuenta la base (`char_length`), ya sin espacios a los costados. Nulo: automático.
export const esquemaDelTitulo = z
  .string()
  .min(1)
  .max(TOPE_DEL_TITULO * 2)
  .refine((titulo) => largoDelTitulo(titulo) <= TOPE_DEL_TITULO, {
    error: `El título tiene como máximo ${String(TOPE_DEL_TITULO)} caracteres.`,
  })
  .nullable()

export const esquemaDeGuardado = z.object({
  intento: z.guid(),
  origenId: z.guid(),
  leadId: z.guid().nullable(),
  vehiculoId: z.guid().nullable(),
  abierta: z.string().min(1).max(300),
  entradas: esquemaDeEntradas,
  modoTc: z.string().min(1).max(200).nullable(),
  verTotalBs: z.boolean(),
  conLaAbierta: z.boolean(),
  titulo: esquemaDelTitulo,
  tituloManual: z.boolean(),
})
