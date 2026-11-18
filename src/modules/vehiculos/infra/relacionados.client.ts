// Lo que leen los relacionados en el navegador, con la sesión de quien mira (el resumen de un lead, «Ver todos» y el historial del vínculo): las RPC son
// `security definer` con el predicado de las policies, así que lo que quien mira no ve llega contado y sin datos aunque la llamada salga del navegador.
import { errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/browser'
import { PRIMEROS_DE_RELACIONADOS, TAMANO_DE_RELACIONADOS } from '../entities/relacionados'
import {
  paginaDeLeadsDesde,
  paginaDeVehiculosDesde,
  relacionadosDelLeadDesde,
} from '../entities/relacionados-lectura'
import type {
  LectorDePaginaDeLeads,
  LectorDePaginaDeVehiculos,
  LectorDeRelacionadosDelLead,
  LectorDeVinculos,
} from '../entities/repositorios'
import { vinculosDesde } from '../entities/vinculo'

const NO_SE_LEYO = 'No pudimos leer los relacionados.'

export const leerRelacionadosDelLeadEnElNavegador: LectorDeRelacionadosDelLead = async (leadId) => {
  const { data, error } = await createClient().rpc('lead_relacionados', {
    p_lead: leadId,
    p_primeros: PRIMEROS_DE_RELACIONADOS,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const leidos = relacionadosDelLeadDesde(leadId, data)
  return leidos ? ok(leidos) : fallo('inesperado', NO_SE_LEYO)
}

// «Ver todos»: de a `TAMANO_DE_RELACIONADOS` (la base trae uno de más: la página que sigue), tras el cursor de la última fila que se dibujó.
export const leerPaginaDeLeadsDelVehiculo: LectorDePaginaDeLeads = async ({
  vehiculoId,
  tipo,
  cursor,
}) => {
  const { data, error } = await createClient().rpc('vehiculo_relacionados_pagina', {
    p_vehiculo: vehiculoId,
    p_tipo: tipo,
    ...(cursor ? { p_cursor_en: cursor.en, p_cursor_id: cursor.id } : {}),
    p_tamano: TAMANO_DE_RELACIONADOS,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeLeadsDesde(tipo, data)
  return pagina ? ok(pagina) : fallo('inesperado', NO_SE_LEYO)
}

export const leerPaginaDeVehiculosDelLead: LectorDePaginaDeVehiculos = async ({
  leadId,
  tipo,
  cursor,
}) => {
  const { data, error } = await createClient().rpc('lead_relacionados_pagina', {
    p_lead: leadId,
    p_tipo: tipo,
    ...(cursor ? { p_cursor_en: cursor.en, p_cursor_id: cursor.id } : {}),
    p_tamano: TAMANO_DE_RELACIONADOS,
  })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  const pagina = paginaDeVehiculosDesde(tipo, data)
  return pagina ? ok(pagina) : fallo('inesperado', NO_SE_LEYO)
}

// El vínculo vigente y sus anteriores (el «Ver todos» de Vinculado en un vehículo): `vehiculo_vinculos()`, con la RLS de quien llama.
export const leerVinculosDelVehiculo: LectorDeVinculos = async (vehiculoId) => {
  const { data, error } = await createClient().rpc('vehiculo_vinculos', { p_vehiculo: vehiculoId })
  if (error) {
    return { ok: false, error: errorDePostgrest(error) }
  }
  return ok(vinculosDesde(data))
}
