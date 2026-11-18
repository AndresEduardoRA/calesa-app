import 'server-only'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import { createClient } from '@/shared/lib/supabase/server'
import { oportunidadDesde } from '../entities/oportunidad'
import { CAUSA_OPORTUNIDAD_ABIERTA } from '../entities/oportunidad-unica'
import type {
  FalloDeOportunidad,
  RepositorioDeOportunidades,
  ResultadoDeOportunidad,
} from '../entities/repositorios-de-oportunidades'

// Las oportunidades se escriben sólo por estas RPC (clase 1: su dueña, con el lead en la cartera y
// `leads.editar`). Lo que no se ve —ajena, inexistente, un lead que ya no se tiene— responde igual.

// El `hint` de la base es la clave del formulario.
const CAMPO_DEL_HINT: Record<string, string> = {
  titulo: 'titulo',
  notas: 'notas',
  monto_estimado: 'monto_estimado',
  vehiculo_id: 'vehiculo',
  embudo_id: 'embudo',
  etapa_id: 'etapa',
  motivo_perdida: 'motivo',
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// «Una abierta por lead y embudo» (`_oportunidad_abierta_unica`): 22023 con `hint` `embudo_id` y el id de la abierta en `detail`. Viaja como
// `causa` y `abierta`, para que la interfaz ofrezca «Abrir esa».
function fallo(error: {
  code?: string | null
  message: string
  hint?: string | null
  details?: string | null
}): FalloDeOportunidad {
  const campo = error.hint ? CAMPO_DEL_HINT[error.hint] : undefined
  const base = errorDePostgrest(error)
  const abierta =
    error.code === '22023' && error.hint === 'embudo_id' && GUID.test(error.details ?? '')
      ? (error.details ?? undefined)
      : undefined
  return {
    ok: false as const,
    error: abierta ? { ...base, causa: CAUSA_OPORTUNIDAD_ABIERTA } : base,
    ...(campo ? { campo } : {}),
    ...(abierta ? { abierta } : {}),
  }
}

const RESULTADOS = [
  'creada',
  'repetido',
  'guardada',
  'movida',
  'eliminada',
  'restaurada',
  'sin_cambios',
] as const

function respuesta(data: unknown) {
  const crudo = data as { resultado?: unknown; oportunidad?: unknown } | null
  const resultado = RESULTADOS.find((uno) => uno === crudo?.resultado)
  const oportunidad = oportunidadDesde(crudo?.oportunidad)
  if (!resultado || !oportunidad) {
    return falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
  }
  const data_: ResultadoDeOportunidad = { resultado, oportunidad }
  return { ok: true as const, data: data_ }
}

export const oportunidadesSupabase: RepositorioDeOportunidades = {
  crear: async ({ id, leadId, datos }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('oportunidad_crear', {
      p_id: id,
      p_lead: leadId,
      p_datos: datos,
    })
    return error ? fallo(error) : respuesta(data)
  },
  guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('oportunidad_guardar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
      p_cambios: cambios,
    })
    return error ? fallo(error) : respuesta(data)
  },
  mover: async ({ id, etapaEsperada, etapa, motivoPerdida }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('oportunidad_mover', {
      p_id: id,
      p_etapa_esperada: etapaEsperada,
      p_etapa: etapa,
      ...(motivoPerdida ? { p_motivo_perdida: motivoPerdida } : {}),
    })
    return error ? fallo(error) : respuesta(data)
  },
  eliminar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('oportunidad_eliminar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
  restaurar: async ({ id, actualizadoEnEsperado }) => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('oportunidad_restaurar', {
      p_id: id,
      p_actualizado_en_esperado: actualizadoEnEsperado,
    })
    return error ? fallo(error) : respuesta(data)
  },
}
