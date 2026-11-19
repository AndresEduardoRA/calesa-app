import 'server-only'
import { cache } from 'react'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_LA_APROBADA } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/server'
import {
  paginaDeEsteVehiculoDesde,
  type FilaDeEsteVehiculo,
} from '../../entities/aprobada/de-este-vehiculo'
import {
  COLUMNAS_DE_LA_MARCA,
  aprobadasDelVehiculoDesde,
  idsAprobadosDesde,
  marcaDeLaGuardadaDesde,
} from '../../entities/aprobada/lectura'
import type {
  CotizacionAprobadaDelVehiculo,
  MarcaDeLaGuardada,
} from '../../entities/aprobada/tipos'

// Las lecturas de la aprobada, con el cliente de quien mira: la policy de `cotizaciones_aprobadas` espeja la de `cotizaciones`, así que cada quien lee sólo las de las
// cotizaciones que ve. Siempre por una página ya cortada (≤ 100 ids): una consulta, ninguna por fila.

const NO_SE_LEYO = 'No se pudo leer la cotización aprobada.'

// La aprobada de cada vehículo de una página del inventario con el nombre del modo de su cotización: la RPC `cotizaciones_aprobadas_de_vehiculos` (corre como quien
// mira, ≤ 100 ids) por `cotizaciones_aprobadas_pkey (vehiculo_id)` y `cotizaciones_pkey`, y `_nombre_del_modo()` una vez por versión y modo. Un vehículo sin fila no sale: «—».
export async function getAprobadasDeVehiculos(
  vehiculoIds: readonly string[],
): Promise<Resultado<CotizacionAprobadaDelVehiculo[]>> {
  if (vehiculoIds.length === 0) {
    return ok([])
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('cotizaciones_aprobadas_de_vehiculos', {
    p_vehiculos: [...vehiculoIds],
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = aprobadasDelVehiculoDesde(data)
  return filas ? ok(filas) : fallo('inesperado', NO_SE_LEYO)
}

// Cuáles de las cotizaciones de una página del listado son la aprobada de su vehículo, por el único `cotizaciones_aprobadas_cotizacion_id_key`.
export async function getAprobadasDeCotizaciones(
  cotizacionIds: readonly string[],
): Promise<Resultado<ReadonlySet<string>>> {
  if (cotizacionIds.length === 0) {
    return ok(new Set<string>())
  }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cotizaciones_aprobadas')
    .select('cotizacion_id')
    .in('cotizacion_id', [...cotizacionIds])
    .limit(cotizacionIds.length)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const ids = idsAprobadosDesde(data)
  return ids ? ok(ids) : fallo('inesperado', NO_SE_LEYO)
}

// El estado de una guardada y si es la aprobada: una lectura por `cotizaciones_pkey` con el embebido por el único de `cotizaciones_aprobadas`. La usa el hueco de la
// guardada en el mismo render, por eso `cache`.
export const getMarcaDeLaGuardada = cache(
  async (cotizacionId: string): Promise<Resultado<MarcaDeLaGuardada>> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cotizaciones')
      .select(COLUMNAS_DE_LA_MARCA)
      .eq('id', cotizacionId)
      .limit(1)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const marca = marcaDeLaGuardadaDesde(data)
    return marca ? ok(marca) : fallo('inesperado', NO_SE_LEYO)
  },
)

// La aprobada de un vehículo como la muestra la ficha (n.º, título, total con su moneda y el nombre del modo, autor y fecha): la fijada de
// `cotizaciones_de_este_vehiculo()` (invocadora: la RLS de quien mira decide; una aprobada que no ve no llega). Sin cursor la fijada sale por
// `cotizaciones_aprobadas_pkey` + `cotizaciones_pkey`, y la página de 1 (+1) por `cotizaciones_vehiculo_creado_idx`, que se descarta. Nula = sin aprobada
// que quien mira vea. `cache`: una lectura por pedido.
export const getAprobadaDelVehiculo = cache(
  async (vehiculoId: string): Promise<Resultado<FilaDeEsteVehiculo | null>> => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('cotizaciones_de_este_vehiculo', {
      p_vehiculo: vehiculoId,
      p_tamano: TAMANO_DE_LA_APROBADA,
    })
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    const pagina = paginaDeEsteVehiculoDesde(data)
    return pagina ? ok(pagina.fijada) : fallo('inesperado', NO_SE_LEYO)
  },
)
