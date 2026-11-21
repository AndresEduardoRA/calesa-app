// Las cotizaciones de la ficha del lead desde el navegador, con la sesión de quien mira: las últimas `TARJETAS_EN_LA_FICHA` por `cotizaciones_listado(p_lead)` (invocadora: la RLS decide;
// por `cotizaciones_lead_creado_idx`, una de más para saber si hay otras) y, en paralelo y sólo de esas, quién hizo cada una (`perfiles` por la PK), el nombre de su modo
// (`cotizaciones_modos_de()`) y cuáles son la aprobada de su vehículo (`cotizaciones_aprobadas` por `cotizacion_id`). Sin cursor: «Ver más» va al listado filtrado.
import { z } from 'zod'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TARJETAS_EN_LA_FICHA } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import type { DatosDeLaTarjeta } from '../../entities/tarjetas-de-la-ficha'
import { esquemaDeFila, filaDesde } from './fila-del-listado'
import { leerAutoresYModos } from './grupo-del-listado.client'

const NO_PUDIMOS = 'No pudimos cargar las cotizaciones.'
const esquemaDeAprobadas = z.array(z.object({ cotizacion_id: z.guid() }))

export type TarjetasDelLead = { filas: DatosDeLaTarjeta[]; hayMas: boolean }

export async function leerTarjetasDelLead(leadId: string): Promise<Resultado<TarjetasDelLead>> {
  if (!z.guid().safeParse(leadId).success) {
    return fallo('validacion', NO_PUDIMOS)
  }
  const supabase = createClient()
  const { data, error } = await supabase.rpc('cotizaciones_listado', {
    p_tamano: TARJETAS_EN_LA_FICHA,
    p_lead: leadId,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidas = z.array(esquemaDeFila).safeParse(data)
  if (!leidas.success) {
    return fallo('inesperado', NO_PUDIMOS)
  }
  const filas = leidas.data.map(filaDesde)
  const deLaFicha = filas.slice(0, TARJETAS_EN_LA_FICHA)
  const ids = deLaFicha.map((fila) => fila.id)
  const [{ autores, modos }, aprobadas] = await Promise.all([
    leerAutoresYModos(supabase, deLaFicha),
    ids.length === 0
      ? null
      : supabase
          .from('cotizaciones_aprobadas')
          .select('cotizacion_id')
          .in('cotizacion_id', ids)
          .limit(ids.length),
  ])
  const lasAprobadas = esquemaDeAprobadas.safeParse(aprobadas?.error ? null : aprobadas?.data)
  const aprobadasIds = new Set(
    (lasAprobadas.success ? lasAprobadas.data : []).map((a) => a.cotizacion_id),
  )
  return ok({
    filas: deLaFicha.map((fila) => ({
      id: fila.id,
      numero: fila.numero,
      titulo: fila.titulo,
      vehiculo: null,
      clase: fila.clase,
      aprobada: aprobadasIds.has(fila.id),
      totalBase: fila.totalBase,
      modo: modos.get(fila.id) ?? null,
      autor: autores.get(fila.creadoPor) ?? 'Sin nombre',
      creadoEn: fila.creadoEn,
      venceEl: fila.venceEl,
      vencida: fila.vencida,
      cliente: null,
      leadId: fila.leadId,
      privada: fila.privada,
    })),
    hayMas: filas.length > TARJETAS_EN_LA_FICHA,
  })
}
