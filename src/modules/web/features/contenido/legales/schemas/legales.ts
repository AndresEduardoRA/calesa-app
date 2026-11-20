import { z } from 'zod'

// Un documento llega tal como lo emite el editor (`unknown`): `cambiosDeLegales` lo reduce a la lista blanca y la base lo valida. Cada modal manda
// el suyo: el otro no viaja, y la base conserva lo guardado (y su fecha).
const legal = z.object({ titulo: z.string(), doc: z.unknown() })

export const esquemaGuardarLegales = z
  .object({
    actualizadoEnEsperado: z.string().min(1),
    terminos: legal.optional(),
    privacidad: legal.optional(),
  })
  .refine((entrada) => entrada.terminos !== undefined || entrada.privacidad !== undefined, {
    error: 'Falta el documento que se guarda.',
  })
