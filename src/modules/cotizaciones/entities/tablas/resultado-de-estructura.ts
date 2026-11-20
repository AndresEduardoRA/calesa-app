// Lo que se hace con la respuesta de `tabla_referencia_crear()`, `tabla_referencia_columnas()` y `tabla_referencia_desactivar()` (docs/COTIZADOR.md › «Crear, columnas
// y desactivar»). Los mensajes de la base llegan tal cual: nombran una fórmula, un origen o una columna, y `errorDePostgrest` cambiaría cualquiera que diga «column» por
// el texto técnico genérico. Un 22023 con `hint` va además junto a su campo (`nombre`, `origen`, `version`, `columnas`, `columnas.<i>.clave|etiqueta|tipo`).
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { conflicto, errorDePostgrest, fallo, ok, type CodigoError } from '@/shared/lib/errores'

export type RespuestaDeEstructura = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

export type TablaCreada = { id: string; clave: string; version: number; repetido: boolean }
export type ColumnasCambiadas = { version: number }
export type TablaDesactivada = { id: string }

const HINT_DE_CAMPO = /^(nombre|origen|version|columnas(\..+)?)$/

const CODIGO_DE_LA_BASE: Record<string, CodigoError> = {
  '22023': 'regla',
  '23503': 'regla',
  '23505': 'duplicado',
  '42501': 'sin_permiso',
}

const MENSAJE_SIN_RESPUESTA = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

function rechazo(error: NonNullable<RespuestaDeEstructura['error']>): ResultadoDeAccion<never> {
  if (error.code === 'PT409') return conflicto(error.message)
  const codigo = error.code ? CODIGO_DE_LA_BASE[error.code] : undefined
  if (!codigo) return { ok: false, error: errorDePostgrest(error) }
  const campo =
    error.code === '23505'
      ? 'nombre'
      : error.code === '22023' && error.hint && HINT_DE_CAMPO.test(error.hint)
        ? error.hint
        : null
  return {
    ok: false,
    error: { codigo, mensaje: error.message },
    ...(campo ? { porCampo: { [campo]: error.message } } : {}),
  }
}

function resultadoDe<Esquema extends z.ZodType, Dato>(
  { data, error }: RespuestaDeEstructura,
  esquema: Esquema,
  convertir: (leido: z.infer<Esquema>) => Dato,
): ResultadoDeAccion<Dato> {
  if (error) return rechazo(error)
  const leida = esquema.safeParse(data)
  if (!leida.success) return fallo('inesperado', MENSAJE_SIN_RESPUESTA)
  return ok(convertir(leida.data))
}

const esquemaDeCrear = z.object({
  id: z.guid(),
  clave: z.string(),
  version: z.int(),
  repetido: z.boolean(),
})

export const resultadoDeCrear = (respuesta: RespuestaDeEstructura) =>
  resultadoDe(respuesta, esquemaDeCrear, (d): TablaCreada => d)

export const resultadoDeColumnas = (respuesta: RespuestaDeEstructura) =>
  resultadoDe(respuesta, z.object({ version: z.int() }), (d): ColumnasCambiadas => d)

export const resultadoDeDesactivar = (respuesta: RespuestaDeEstructura) =>
  resultadoDe(respuesta, z.object({ id: z.guid() }), (d): TablaDesactivada => d)
