import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { leadVinculadoDe, type LeadVinculado } from '../../../entities/vinculo'

export const NO_SE_LEYO_EL_LEAD_VINCULADO = 'No pudimos leer el lead del vehículo.'

// El lead vinculado a un vehículo, leído en el navegador al elegirlo (`vehiculo_vinculos`, invocadora: bajo la RLS de quien mira). Nulo si no tiene o si
// quien mira no lo ve. El código de la lectura (y supabase-js) se pide al usarse. Nunca lanza: un fallo es un valor.
export async function leerLeadVinculado(
  vehiculoId: string,
): Promise<Resultado<LeadVinculado | null>> {
  try {
    const { leerVinculosDelVehiculo } = await import('../../../composicion-vinculo.client')
    const leidos = await leerVinculosDelVehiculo(vehiculoId)
    return leidos.ok ? ok(leadVinculadoDe(leidos.data)) : leidos
  } catch {
    return fallo('inesperado', NO_SE_LEYO_EL_LEAD_VINCULADO)
  }
}
