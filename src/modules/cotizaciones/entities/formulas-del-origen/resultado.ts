// Lo que se hace con la respuesta de `formula_del_origen_crear|renombrar|archivar|eliminar|activar()` (docs/COTIZADOR.md › «Fórmulas del origen»). Sólo el PT409
// llega tal cual (dice quién y cuándo); un 22023 que nombra un campo del formulario va junto a él (`porCampo`); uno que nombra otra cosa (el tope, los tipos de
// cambio, un nodo o un lugar de la tarjeta) viaja como `causa`, que la pantalla vuelve un destino o una acción. Lo que devuelve la base se valida con Zod.
import { z } from 'zod'
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import { conflicto, errorDePostgrest, fallo, ok } from '@/shared/lib/errores'
import { esquemaDeLosAvisos, type AvisoDeLaCopia } from './avisos-de-la-copia'

export type RespuestaDeLaBase = {
  data: unknown
  error: { code?: string | null; message: string; hint?: string | null } | null
}

export type FormulaCreada = { id: string; actualizadoEn: string; avisos: AvisoDeLaCopia[] }
export type FormulaCambiada = { actualizadoEn: string }
export type FormulaEliminada = { id: string }
export type FormulaActivada = {
  activa: string
  formula: string
  plantilla: string
  actualizadoEn: string
}

// Los campos de los formularios de la pestaña que un 22023 puede nombrar.
const CAMPOS = new Set(['nombre', 'pieza', 'nota'])

// La causa de una fórmula que ya se usó para cotizar o estuvo activa: se archiva.
export const CAUSA_USADA = 'usada'
// La causa de crear sin ningún tipo de cambio: se ofrece «Abrir Monedas».
export const CAUSA_SIN_TIPOS_DE_CAMBIO = 'tipos_cambio'

export const MENSAJE_USADA = 'Esta fórmula ya se usó para cotizar o estuvo activa: archívala.'
export const MENSAJE_DEL_TOPE =
  'Este origen ya tiene 50 fórmulas: archiva o elimina alguna para crear otra.'

const MENSAJE_SIN_RESPUESTA = 'No pudimos leer la respuesta. Recarga para ver cómo quedó.'

function rechazo(error: NonNullable<RespuestaDeLaBase['error']>): ResultadoDeAccion<never> {
  const { code, message, hint } = error
  if (code === 'PT409') return conflicto(message)
  if (code === '42501') return fallo('sin_permiso', message)
  if (code === '23505') {
    return {
      ok: false,
      error: { codigo: 'duplicado', mensaje: message },
      porCampo: { nombre: message },
    }
  }
  if (code === '23503') {
    return { ok: false, error: { codigo: 'regla', mensaje: MENSAJE_USADA, causa: CAUSA_USADA } }
  }
  if (code === '22023') {
    if (hint && CAMPOS.has(hint)) {
      return {
        ok: false,
        error: { codigo: 'regla', mensaje: message },
        porCampo: { [hint]: message },
      }
    }
    const mensaje = hint === 'formulas' ? MENSAJE_DEL_TOPE : message
    return { ok: false, error: { codigo: 'regla', mensaje, ...(hint ? { causa: hint } : {}) } }
  }
  return { ok: false, error: errorDePostgrest(error) }
}

function resultadoDe<Esquema extends z.ZodType, Dato>(
  { data, error }: RespuestaDeLaBase,
  esquema: Esquema,
  convertir: (leido: z.infer<Esquema>) => Dato,
): ResultadoDeAccion<Dato> {
  if (error) return rechazo(error)
  const leida = esquema.safeParse(data)
  if (!leida.success) return fallo('inesperado', MENSAJE_SIN_RESPUESTA)
  return ok(convertir(leida.data))
}

const HORA = z.string().min(1)

export const resultadoDeCrear = (respuesta: RespuestaDeLaBase) =>
  resultadoDe(
    respuesta,
    z.object({ id: z.guid(), actualizado_en: HORA, avisos: esquemaDeLosAvisos }),
    (d): FormulaCreada => ({ id: d.id, actualizadoEn: d.actualizado_en, avisos: d.avisos }),
  )

// Renombrar y archivar devuelven la `actualizado_en` nueva.
export const resultadoDeCambio = (respuesta: RespuestaDeLaBase) =>
  resultadoDe(respuesta, HORA, (d): FormulaCambiada => ({ actualizadoEn: d }))

// Eliminar no devuelve nada: entró.
export const resultadoDeEliminar = (respuesta: RespuestaDeLaBase, id: string) =>
  resultadoDe(respuesta, z.unknown(), (): FormulaEliminada => ({ id }))

export const resultadoDeActivar = (respuesta: RespuestaDeLaBase) =>
  resultadoDe(
    respuesta,
    z.object({ activa: z.guid(), formula: z.guid(), plantilla: z.guid(), actualizado_en: HORA }),
    (d): FormulaActivada => ({
      activa: d.activa,
      formula: d.formula,
      plantilla: d.plantilla,
      actualizadoEn: d.actualizado_en,
    }),
  )

export const MOTIVO_SIN_PERMISO_DE_FORMULAS =
  'No tienes permiso para configurar las fórmulas de este origen.'
export const MOTIVO_SIN_PERMISO_DE_LA_COPIA =
  'No configuras el cotizador del origen de esa fórmula: no se puede copiar.'
