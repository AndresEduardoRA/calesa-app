// Los comprobantes de una cotización desde el navegador, con la sesión de quien mira (el resumen de `/cotizaciones`): lo mismo que lee la guardada en el servidor (`leer.ts`), sin el
// estado de la cotización. La RLS deja leerlos a quien ve la cotización (base, «comprobantes: leer»); no se lee `datos`.
import { cortarAlTope } from '@/shared/lib/conteo'
import { errorDePostgrest, fallo, ok, type Resultado } from '@/shared/lib/errores'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { createClient } from '@/shared/lib/supabase/browser'
import type { ComprobanteDeLaCotizacion } from '../../entities/comprobantes/comprobante'
import { COLUMNAS_DE_COMPROBANTES, comprobantesDesde } from '../../entities/comprobantes/lectura'

export const NO_SE_CARGARON_LOS_COMPROBANTES = 'No se pudieron cargar los comprobantes.'

// Del más nuevo al más viejo, por `comprobantes_cotizacion_id_idx`: una cotización tiene un vigente y tantos anulados como veces se anuló, así que se lee uno de más que el
// tope para decir si hay más.
export async function leerComprobantesDelResumen(
  cotizacionId: string,
): Promise<Resultado<{ filas: ComprobanteDeLaCotizacion[]; hayMas: boolean }>> {
  const { data, error } = await createClient()
    .from('comprobantes')
    .select(COLUMNAS_DE_COMPROBANTES)
    .eq('cotizacion_id', cotizacionId)
    .order('emitido_en', { ascending: false })
    .order('numero', { ascending: false })
    .limit(TAMANO_DE_VER_MAS + 1)
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const filas = comprobantesDesde(data)
  return filas === null
    ? fallo('inesperado', NO_SE_CARGARON_LOS_COMPROBANTES)
    : ok(cortarAlTope(filas, TAMANO_DE_VER_MAS))
}
