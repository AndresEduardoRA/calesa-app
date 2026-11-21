import { z } from 'zod'

// Hacer privada o pública una cotización: su id, cómo queda y la versión que se tenía en pantalla (el texto de la base, con sus microsegundos: se valida su forma y
// nunca pasa por `Date`).
export const esquemaCambiarPrivada = z.object({
  id: z.guid(),
  privada: z.boolean(),
  actualizadoEn: z.iso.datetime({ offset: true }),
})
