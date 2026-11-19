import 'server-only'
import { z } from 'zod'
import {
  conteoDelGrupo,
  type EntradaDelListado,
  type PaginaAgrupada,
} from '../../entities/listado/grupos-del-listado'
import type { FilaDelListado, PedidoDelListado } from '../../entities/listado/listado'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { armarPaginaPor, codificarCursor, type Cursor } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import { esquemaDeFila, filaDesde } from './fila-del-listado'
import { esquemaDelPedido } from './listado'

// Una página de la lista agrupada por vehículo (`docs/UX.md` › «Cotizaciones»): UNA llamada a `cotizaciones_listado_por_vehiculo()`, que corre como quien mira (la
// RLS decide) y recorre las rutas del listado (`cotizaciones_listado_idx`, `_finales_idx`, `_origen_creado_idx`, `_origen_finales_idx`, `_creador_idx`,
// `_lead_creado_idx`) con una sonda por `cotizaciones_vehiculo_creado_idx`; la cabeza, por `cotizaciones_pkey` y `cotizaciones_aprobadas_pkey`
// (`supabase/tests/medir-cotizaciones-listado-por-vehiculo.sql`). Pide `tamano + 1` entradas (la base suma la de más). Sin búsqueda ni vehículo: con texto la
// página agrupa lo que devuelve la búsqueda, y con `?vehiculo=` no se agrupa.
const esquemaDeLaCabeza = esquemaDeFila.extend({ orden_en: z.string(), orden_id: z.guid() })

const esquemaDeEntrada = z.discriminatedUnion('tipo', [
  esquemaDeLaCabeza.extend({
    tipo: z.literal('grupo'),
    vehiculo_id: z.guid(),
    grupo_n: z.int().min(1),
  }),
  esquemaDeLaCabeza.extend({ tipo: z.literal('suelta'), vehiculo_id: z.null(), grupo_n: z.null() }),
  // Dónde siguió la base al llegar a su tope de recorrido sin completar la página.
  z.object({ tipo: z.literal('cortada'), orden_en: z.string(), orden_id: z.guid() }),
])

type Leida = z.infer<typeof esquemaDeEntrada>

function entradaDesde(e: Exclude<Leida, { tipo: 'cortada' }>): EntradaDelListado<FilaDelListado> {
  const cotizacion = filaDesde(e)
  return e.tipo === 'grupo'
    ? {
        tipo: 'grupo',
        ordenEn: e.orden_en,
        ordenId: e.orden_id,
        vehiculoId: e.vehiculo_id,
        cabeza: cotizacion,
        conteo: conteoDelGrupo(e.grupo_n),
      }
    : { tipo: 'suelta', ordenEn: e.orden_en, ordenId: e.orden_id, cotizacion }
}

// La página con su cortada: «Seguir buscando» sigue en el mismo sentido desde donde quedó la base, y es también el paso a la página de ese lado.
export function paginaAgrupadaDesde(
  leidas: readonly Leida[],
  tamano: number,
  cursor: Cursor | null,
): PaginaAgrupada<FilaDelListado> {
  const entradas = leidas.flatMap((e) => (e.tipo === 'cortada' ? [] : [entradaDesde(e)]))
  const pagina = armarPaginaPor(entradas, tamano, cursor, {
    instanteDe: (e) => e.ordenEn,
    idDe: (e) => e.ordenId,
  })
  const corte = leidas.find((e) => e.tipo === 'cortada')
  if (corte === undefined) {
    return { ...pagina, cortada: null }
  }
  const sentido = cursor?.sentido ?? 'siguiente'
  const cortada = codificarCursor({ instante: corte.orden_en, id: corte.orden_id, sentido })
  return sentido === 'siguiente'
    ? { ...pagina, siguiente: cortada, cortada }
    : { ...pagina, anterior: cortada, cortada }
}

type PedidoValido = z.infer<typeof esquemaDelPedido>

// Los filtros y el cursor de la RPC: un filtro vacío no se manda (la base lo toma nulo) y el instante del cursor va tal como lo devolvió la base (por `Date`
// perdería los microsegundos).
function filtrosDe({ origenId, clase, mias, leadId, cursor }: PedidoValido) {
  return {
    p_origen: origenId ?? undefined,
    p_clase: clase ?? undefined,
    p_mias: mias ?? false,
    p_lead: leadId ?? undefined,
    p_cursor_en: cursor?.instante ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
    p_hacia_atras: cursor?.sentido === 'anterior',
  }
}

export async function getListadoPorVehiculo(
  pedido: PedidoDelListado,
): Promise<Resultado<PaginaAgrupada<FilaDelListado>>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success || valido.data.texto !== undefined || valido.data.vehiculoId !== undefined) {
    return fallo('validacion', 'Ese filtro del listado no es válido.')
  }
  const supabase = await createClient()
  // El tamaño, del pedido validado (nunca escrito a mano: `scripts/guardas/paginas.test.ts`).
  const { data, error } = await supabase.rpc('cotizaciones_listado_por_vehiculo', {
    p_tamano: valido.data.tamano,
    ...filtrosDe(valido.data),
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = z.array(esquemaDeEntrada).safeParse(data)
  if (!leidas.success) {
    return fallo('inesperado', 'No pudimos leer el listado. Recarga para volver a intentar.')
  }
  return ok(paginaAgrupadaDesde(leidas.data, valido.data.tamano, valido.data.cursor))
}
