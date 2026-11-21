import { z } from 'zod'

// «Empezar con las fases de…»: el flujo que se empieza y el de donde se copia, cada uno con su origen (la action exige `flujos.configurar` en los dos
// antes de escribir; la base vuelve a exigirlo). Sólo entre flujos de vehículos: los dos orígenes son obligatorios.
export const esquemaCopiarFases = z.object({
  flujoId: z.guid(),
  origenId: z.guid(),
  desdeFlujoId: z.guid(),
  desdeOrigenId: z.guid(),
  actualizadoEnEsperado: z.string().min(1),
})

export type EntradaDeCopiarFases = z.infer<typeof esquemaCopiarFases>
