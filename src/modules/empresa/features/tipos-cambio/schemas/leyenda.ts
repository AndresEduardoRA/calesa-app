import { z } from 'zod'
import { caracteresDeLaLeyenda, LEYENDA_MAXIMA } from '../../../entities/compartir-tipos-cambio'

const MOTIVO_DEL_LARGO = `La leyenda admite hasta ${String(LEYENDA_MAXIMA)} caracteres.`

// Lo mismo que rechaza la base (22023), dicho antes de llegar a ella. Vacía = sin leyenda.
export const esquemaGuardarLeyendaDeTiposCambio = z.object({
  leyenda: z
    .string()
    .trim()
    .refine((texto) => caracteresDeLaLeyenda(texto) <= LEYENDA_MAXIMA, { error: MOTIVO_DEL_LARGO })
    .refine((texto) => !/\p{Cc}/u.test(texto), { error: 'La leyenda va en una sola línea.' }),
  // El `actualizado_en` que tenía en pantalla quien edita: detecta un cambio ajeno.
  actualizadoEnEsperado: z.string().min(1),
})

export type EntradaDeGuardarLeyendaDeTiposCambio = z.input<
  typeof esquemaGuardarLeyendaDeTiposCambio
>
