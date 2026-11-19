import 'server-only'
import { z } from 'zod'
import { MAXIMO_DE_PAGINA_DE_COTIZACIONES } from '../../entities/listado/listado'
import type { PaginaDelListado, PedidoDelListado } from '../../entities/listado/listado'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { armarPagina } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { esquemaDeFila, filaDesde } from './fila-del-listado'

// Una página del listado `/cotizaciones` (4.16-1): UNA llamada a `cotizaciones_listado()`, que corre como quien mira (la RLS decide) y lee cada ruta por su
// índice (`cotizaciones_listado_idx`, `_finales_idx`, `_origen_creado_idx`, `_origen_finales_idx`, `_creador_idx`, `_lead_creado_idx` y `_vehiculo_creado_idx`; con 250.000 en
// `supabase/tests/medir-cotizaciones-listado.sql`). Pide `tamano + 1` (la base suma la de más) y `armarPagina` dice si hay otra hacia cada lado.
export const esquemaDelPedido = z.object({
  origenId: z.guid().optional(),
  clase: z.enum(['preventa', 'final']).optional(),
  mias: z.boolean().optional(),
  vehiculoId: z.guid().optional(),
  leadId: z.guid().optional(),
  texto: z.string().min(1).max(100).optional(),
  cursor: z
    .object({
      instante: z.string().min(1),
      id: z.guid(),
      sentido: z.enum(['siguiente', 'anterior']),
    })
    .nullable(),
  tamano: z.int().min(1).max(MAXIMO_DE_PAGINA_DE_COTIZACIONES),
})

// La búsqueda suma a cada fila si alguna fuente se pasó del tope (la misma en todas).
const esquemaDeFilaBuscada = esquemaDeFila.extend({ acotada: z.boolean().optional() })

// Los filtros y el cursor de la RPC: un filtro vacío no se manda (la base lo toma nulo); el instante del cursor va tal como lo
// devolvió la base (por `Date` perdería los microsegundos).
function filtrosDe({
  origenId,
  clase,
  mias,
  vehiculoId,
  leadId,
  cursor,
}: z.infer<typeof esquemaDelPedido>) {
  return {
    p_origen: origenId ?? undefined,
    p_clase: clase ?? undefined,
    p_mias: mias ?? false,
    p_vehiculo: vehiculoId ?? undefined,
    p_lead: leadId ?? undefined,
    p_cursor_en: cursor?.instante ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
    p_hacia_atras: cursor?.sentido === 'anterior',
  }
}

export async function getListadoDeCotizaciones(
  pedido: PedidoDelListado,
): Promise<Resultado<PaginaDelListado>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', 'Ese filtro del listado no es válido.')
  }
  const supabase = await createClient()
  const texto = valido.data.texto
  // El tamaño, del pedido validado (nunca escrito a mano: `scripts/guardas/paginas.test.ts`).
  const { data, error } =
    texto === undefined
      ? await supabase.rpc('cotizaciones_listado', {
          p_tamano: valido.data.tamano,
          ...filtrosDe(valido.data),
        })
      : // Con texto, la búsqueda: sus propias rutas por índice (`cotizaciones_buscar()`).
        await supabase.rpc('cotizaciones_buscar', {
          p_texto: texto,
          p_tamano: valido.data.tamano,
          ...filtrosDe(valido.data),
        })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = z.array(esquemaDeFilaBuscada).safeParse(data)
  if (!filas.success) {
    return fallo('inesperado', 'No pudimos leer el listado. Recarga para volver a intentar.')
  }
  const pagina = armarPagina(filas.data.map(filaDesde), valido.data.tamano, valido.data.cursor)
  return ok({ ...pagina, acotada: filas.data.some((fila) => fila.acotada === true) })
}
