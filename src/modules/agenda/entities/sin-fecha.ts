// El grupo «Sin fecha» de los pendientes: lo que devuelve `agenda_tareas_sin_fecha` (mis tareas vivas, pendientes y sin vencimiento, la más nueva
// primero). Los pendientes la vuelven filas (`paginaDePendientes`). Puro: la respuesta de la RPC es un `jsonb` sin tipo, así que se **parsea** (Zod en todo límite).
import { z } from 'zod'

export type TareaSinFecha = {
  id: string
  titulo: string
  // La versión: «Completar» la manda (PT409 si otro la cambió).
  actualizadoEn: string
  // Tal como vino de la base (con su precisión): el cursor lo devuelve intacto.
  creadoEn: string
  mia: boolean
}

export type PaginaDeSinFecha = { tareas: TareaSinFecha[]; hayMas: boolean }

const esquema = z.object({
  tareas: z.array(
    z.object({
      id: z.guid(),
      titulo: z.string(),
      estado: z.string(),
      creado_en: z.iso.datetime({ offset: true }),
      actualizado_en: z.iso.datetime({ offset: true }),
      mia: z.boolean(),
    }),
  ),
  hay_mas: z.boolean(),
})

// De lo que devolvió la RPC a la página, o `null` si no tiene la forma esperada.
export function paginaDeSinFecha(datos: unknown): PaginaDeSinFecha | null {
  const leido = esquema.safeParse(datos)
  if (!leido.success) {
    return null
  }
  return {
    tareas: leido.data.tareas.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      actualizadoEn: t.actualizado_en,
      creadoEn: t.creado_en,
      mia: t.mia,
    })),
    hayMas: leido.data.hay_mas,
  }
}
