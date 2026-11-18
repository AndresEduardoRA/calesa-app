import 'server-only'
import { cache } from 'react'
import { z } from 'zod'
import { conteoAcotado, type ConteoAcotado } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { POR_ALTA, TOPE_DE_ESTE_VEHICULO } from '@/shared/lib/paginacion'
import { ordenarPorCursor } from '@/shared/lib/supabase/consultas'
import { createClient } from '@/shared/lib/supabase/server'

const esquema = z.object({ vehiculoId: z.guid(), actualId: z.guid() })

// Cuántas otras cotizaciones del vehículo ve quien mira (sin la que mira): la línea bajo la cabecera de la guardada y si se dibuja «De este vehículo».
// Con `tope + 1` filas, nunca un `count`; la RLS de quien mira decide cuáles cuentan, como en la lista del bloque. La forma es la de «Cotizado (n)»
// (`contarCotizacionesDelVehiculo`): `cotizaciones_vehiculo_creado_idx (vehiculo_id, creado_en desc, id desc)`, medida en `medir-historial-del-vehiculo.sql`.
// Con `cache()`: la línea y el bloque la piden en el mismo render.
export const getOtrasDelVehiculo = cache(
  async (vehiculoId: string, actualId: string): Promise<Resultado<ConteoAcotado>> => {
    const pedido = esquema.safeParse({ vehiculoId, actualId })
    if (!pedido.success) {
      return fallo('validacion', 'Ese vehículo no es válido.')
    }
    const supabase = await createClient()
    const { data, error } = await ordenarPorCursor(
      supabase
        .from('cotizaciones')
        .select('id')
        .eq('vehiculo_id', pedido.data.vehiculoId)
        .neq('id', pedido.data.actualId),
      null,
      POR_ALTA,
    ).limit(TOPE_DE_ESTE_VEHICULO + 1)
    if (error) {
      return { ok: false, error: errorDePostgrest(error) }
    }
    return ok(conteoAcotado(data.length, TOPE_DE_ESTE_VEHICULO))
  },
)
