// Las escrituras del catálogo de colores (nombre técnico heredado: `tonos`) sobre el cliente que recibe: `tono_crear|guardar|eliminar`, con `cotizaciones.configurar` (sin
// origen). Cada una devuelve la lista entera con las versiones nuevas: la pantalla no vuelve a leer. Los textos de la base llegan tal cual: el hex mal escrito (`hint = hex`), el
// nombre repetido (23505, con `hint = nombre`), el conflicto de versión (PT409) y un color que una fórmula usa (23503, que dice cuál). El `hint` que es un campo del formulario
// viaja como `campo`.
import type { SupabaseClient } from '@supabase/supabase-js'
import { errorDePostgrest, fallo as falloDe } from '@/shared/lib/errores'
import type { Database, Json } from '@/shared/types/database.types'
import {
  respuestaDeTonosDesde,
  type FalloDeTono,
  type RepositorioDeTonos,
} from '../../entities/diseno/respuesta-de-tonos'

// `colores` es el campo de un pedido con la forma de antes (los seis colores): la base lo rechaza con ese hint.
const CAMPOS = new Set<string>(['nombre', 'hex', 'colores'])

function fallo(error: {
  code?: string | null
  message: string
  hint?: string | null
}): FalloDeTono {
  const campo = error.hint && CAMPOS.has(error.hint) ? error.hint : undefined
  return { ok: false, error: errorDePostgrest(error), ...(campo ? { campo } : {}) }
}

function respuesta(data: unknown) {
  const leida = respuestaDeTonosDesde(data)
  return leida
    ? { ok: true as const, data: leida }
    : falloDe('inesperado', 'No pudimos leer la respuesta. Recarga para ver cómo quedó.')
}

export function escrituraDeTonosSobre(cliente: SupabaseClient<Database>): RepositorioDeTonos {
  return {
    crear: async ({ id, nombre, hex }) => {
      const { data, error } = await cliente.rpc('tono_crear', {
        p_id: id,
        p_nombre: nombre,
        p_hex: hex,
      })
      return error ? fallo(error) : respuesta(data)
    },
    guardar: async ({ id, actualizadoEnEsperado, cambios }) => {
      const { data, error } = await cliente.rpc('tono_guardar', {
        p_id: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
        p_cambios: cambios as unknown as Json,
      })
      return error ? fallo(error) : respuesta(data)
    },
    eliminar: async ({ id, actualizadoEnEsperado }) => {
      const { data, error } = await cliente.rpc('tono_eliminar', {
        p_id: id,
        p_actualizado_en_esperado: actualizadoEnEsperado,
      })
      return error ? fallo(error) : respuesta(data)
    },
  }
}
