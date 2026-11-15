import 'server-only'
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { PRIMEROS_DE_RELACIONADOS } from '../../entities/relacionados'
import {
  relacionadosDelLeadDesde,
  relacionadosDelVehiculoDesde,
} from '../../entities/relacionados-lectura'
import type {
  LectorDeRelacionadosDelLead,
  LectorDeRelacionadosDelVehiculo,
} from '../../entities/repositorios'

const NO_SE_LEYO = 'No pudimos leer los relacionados.'

// Los relacionados de un vehículo: una RPC `security definer` con el predicado de las policies (lo que quien llama no ve llega contado, sin datos).
export const getRelacionadosDelVehiculo: LectorDeRelacionadosDelVehiculo = async (vehiculoId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('vehiculo_relacionados', {
    p_vehiculo: vehiculoId,
    p_primeros: PRIMEROS_DE_RELACIONADOS,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidos = relacionadosDelVehiculoDesde(vehiculoId, data)
  return leidos ? ok(leidos) : fallo('inesperado', NO_SE_LEYO)
}

export const getRelacionadosDelLead: LectorDeRelacionadosDelLead = async (leadId) => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('lead_relacionados', {
    p_lead: leadId,
    p_primeros: PRIMEROS_DE_RELACIONADOS,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidos = relacionadosDelLeadDesde(leadId, data)
  return leidos ? ok(leidos) : fallo('inesperado', NO_SE_LEYO)
}
