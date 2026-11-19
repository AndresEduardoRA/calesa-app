import { z } from 'zod'
import { esquemaId } from '../../../entities/nodos'

// Lo que manda el ⚙ de la cabecera: el origen, las tres claves por defecto (siempre las tres) y la publicada que se leyó, que no puede faltar.
export const esquemaDeCambiarCabecera = z.object({
  origenId: z.guid(),
  modoPorDefecto: esquemaId,
  verTotalBsPorDefecto: z.boolean(),
  modosVisibles: z.array(esquemaId).min(1).max(100),
  publicadaEsperada: z.guid(),
})

export type EntradaDeCambiarCabecera = z.infer<typeof esquemaDeCambiarCabecera>
