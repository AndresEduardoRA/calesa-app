// El despliegue de un grupo de la lista agrupada desde el navegador, con la sesión de quien mira: las cotizaciones del vehículo que coinciden con los filtros (y la
// búsqueda, si hay), de a `TAMANO_DE_ESTE_VEHICULO` por cursor (una de más para saber si hay otra). Sin texto, `cotizaciones_listado(p_vehiculo)`
// (`cotizaciones_vehiculo_creado_idx`); con texto, `cotizaciones_buscar(p_texto, p_vehiculo)`. Las dos son invocadoras: la RLS decide. Después, quién hizo cada una
// por la clave primaria de `perfiles` (sólo los de la página). Va por el navegador porque se lee al desplegar, sin ir al servidor.
import { z } from 'zod'
import { autorVisible } from '../../entities/historial-del-vehiculo'
import type { LineaDelGrupo, PedidoDelGrupo } from '../../entities/listado/grupos-del-listado'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { armarPagina, TAMANO_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import { esquemaDeFila, filaDesde } from './fila-del-listado'

const NO_PUDIMOS = 'No pudimos cargar las cotizaciones de este vehículo.'
const esquemaDePerfiles = z.array(z.object({ id: z.guid(), nombre: z.string(), email: z.string() }))
const esquemaDelPedido = z.object({
  vehiculoId: z.guid(),
  origenId: z.guid().optional(),
  clase: z.enum(['preventa', 'final']).optional(),
  mias: z.boolean().optional(),
  leadId: z.guid().optional(),
  texto: z.string().min(1).max(100).optional(),
})

export async function leerGrupoDelListado({
  cursor,
  ...pedido
}: PedidoDelGrupo): Promise<Resultado<{ filas: LineaDelGrupo[]; siguiente: string | null }>> {
  const valido = esquemaDelPedido.safeParse(pedido)
  if (!valido.success) {
    return fallo('validacion', NO_PUDIMOS)
  }
  const { vehiculoId, origenId, clase, mias, leadId, texto } = valido.data
  const supabase = createClient()
  const filtros = {
    p_tamano: TAMANO_DE_ESTE_VEHICULO,
    p_vehiculo: vehiculoId,
    p_origen: origenId,
    p_clase: clase,
    p_mias: mias ?? false,
    p_lead: leadId,
    p_cursor_en: cursor?.instante,
    p_cursor_id: cursor?.id,
  }
  const { data, error } =
    texto === undefined
      ? await supabase.rpc('cotizaciones_listado', filtros)
      : await supabase.rpc('cotizaciones_buscar', { ...filtros, p_texto: texto })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = z.array(esquemaDeFila).safeParse(data)
  if (!leidas.success) {
    return fallo('inesperado', NO_PUDIMOS)
  }
  const { filas, siguiente } = armarPagina(
    leidas.data.map(filaDesde),
    TAMANO_DE_ESTE_VEHICULO,
    cursor,
  )
  const ids = [...new Set(filas.map((fila) => fila.creadoPor))]
  const autores = new Map<string, string>()
  if (ids.length > 0) {
    const perfiles = await supabase
      .from('perfiles')
      .select('id, nombre, email')
      .in('id', ids)
      .limit(ids.length)
    const leidos = esquemaDePerfiles.safeParse(perfiles.data)
    // Sin los nombres la página igual sirve: «Sin nombre», como el listado.
    for (const persona of leidos.success ? leidos.data : []) {
      autores.set(persona.id, autorVisible(persona))
    }
  }
  return ok({
    filas: filas.map((fila) => ({ ...fila, autor: autores.get(fila.creadoPor) ?? 'Sin nombre' })),
    siguiente,
  })
}
