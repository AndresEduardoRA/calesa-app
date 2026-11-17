import { z } from 'zod'
import {
  CLAVES_QUE_SE_PIDEN,
  LARGO_DEL_TITULO_DEL_PEDIDO,
} from '../../../entities/mover/pedido-de-requisito'

// Lo que cruza el límite de «Pedirlo»: a quién se le puede pedir (por una de las claves que se piden, en un vehículo) y la tarea que se le da. Lo demás lo exige la base.
export const esquemaLeerQuienesPueden = z.object({
  vehiculoId: z.guid(),
  clave: z.enum(CLAVES_QUE_SE_PIDEN),
  texto: z.string().max(100).optional(),
})

export const esquemaPedirLoQueFalta = z.object({
  // El id del intento: el mismo en cada reintento, una sola tarea.
  id: z.guid(),
  vehiculoId: z.guid(),
  responsableId: z.guid(),
  titulo: z.string().trim().min(1).max(LARGO_DEL_TITULO_DEL_PEDIDO),
})
