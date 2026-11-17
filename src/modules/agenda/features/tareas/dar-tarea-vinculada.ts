import 'server-only'
import { revalidatePath } from 'next/cache'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { repositorioDeTareas } from '../../composicion'
import type { ResultadoDeEscritura } from '../../entities/escritura'
import { comoResultado } from '../como-resultado'

export type PedidoDeTareaVinculada = {
  // El id del intento: repetirlo no crea dos tareas (`tarea_crear` es idempotente por id para quien la creó).
  id: string
  titulo: string
  responsableId: string
  vehiculoId: string
}

// Da una tarea sin fecha ni descripción a otra persona, vinculada a un vehículo, desde otro módulo (`logistica`: «Pedirlo» de «Qué falta»). Con la sesión
// de quien la da: la base exige `agenda.tareas.asignar`, que el responsable pueda recibir (23514 hint `responsable_id`) y que quien la da vea el vehículo;
// avisa a quien la recibe (`tarea_asignada`).
export async function darTareaVinculada({
  id,
  titulo,
  responsableId,
  vehiculoId,
}: PedidoDeTareaVinculada): Promise<ResultadoDeAccion<ResultadoDeEscritura>> {
  const resultado = comoResultado(
    await repositorioDeTareas.crear({
      id,
      datos: { titulo, responsable_id: responsableId, vehiculo_id: vehiculoId },
    }),
  )
  if (resultado.ok) {
    revalidatePath('/agenda')
  }
  return resultado
}
