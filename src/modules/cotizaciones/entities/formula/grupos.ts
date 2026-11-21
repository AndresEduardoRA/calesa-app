// Los grupos de la fórmula en la planilla (las bandas; docs/UX.md › «Cotización: fórmula»): editar uno (etiqueta, plazo, color, su tipo de cambio y qué filas suman a
// él). Sumar, quitar una banda y mover una fila entre bandas están en `bandas.ts`; el bucket que da el tipo de cambio, en `buckets.ts`. Puro y nunca lanza: lo que no
// sirve es un error por campo. Lo que vale la fórmula entera lo dice después `validarFormula()` (un grupo vacío, el doble conteo), como tras aplicar una fila.
import type { Formula, Grupo } from '../formula'
import { TOPE_DE_COLORES } from '../colores'
import { daMonto, esMonto, type Nodo } from '../nodos'
import { bucketPara, sinBucketsSueltos, type ConModos } from './buckets'
import { filasDe } from './filas'

// El catálogo de colores (`tonos`) no pasa de 48: el tope de `_tonos_tope()` en la base, `TOPE_DE_COLORES` del núcleo.
export const TOPE_DE_TONOS_DEL_EDITOR = TOPE_DE_COLORES

const MAXIMO_DE_ETIQUETA = 60
const MAXIMO_DE_PLAZO = 40

export type CambiosDelGrupo = {
  etiqueta: string
  // Vacío quita el plazo.
  plazo: string
  tono: string
  // La fila «Tipo de cambio» que convierte la banda (`bucketPara()` elige o crea su bucket).
  tipoDeCambio: string
  // Los ids de las filas que quedan en el grupo; las demás que estaban salen sin grupo.
  miembros: readonly string[]
}

export type CampoDelGrupo =
  'grupo' | 'etiqueta' | 'plazo' | 'tono' | 'tipo_de_cambio' | 'miembros' | 'total_en'
export type ErrorDelGrupo = { campo: CampoDelGrupo; mensaje: string }

// Lo que hace falta para revisar una banda: los colores del catálogo y si la hoja tiene modos de tipo de cambio (D14).
export type ContextoDelGrupo = ConModos & { readonly tonos: ReadonlySet<string> }

// Lo que el «Aplicar» movió: la fila que entró (y la etiqueta del grupo de donde vino, o nula si no tenía) y la que quedó sin grupo.
export type FilaQueEntro = { id: string; etiqueta: string; desde: string | null }
export type FilaQuitada = { id: string; etiqueta: string }

export type ResultadoDelGrupo =
  | { ok: true; formula: Formula; entraron: FilaQueEntro[]; quitadas: FilaQuitada[] }
  | { ok: false; errores: ErrorDelGrupo[] }

export const MENSAJE_FILA_QUE_NO_SUMA =
  'Esa fila no puede sumar a un grupo: tiene que ser un monto y no una salida.'

// Lo que `validarFormula()` exige de un miembro (`miembro_no_es_monto`, `miembro_con_salida`).
export const puedeSumarAlGrupo = (n: Nodo): boolean =>
  daMonto(n) && esMonto(n) && n.salida === undefined

// Las filas (raíces, nunca una auxiliar) que pueden sumar a un grupo, en el orden de la fórmula.
export const filasQuePuedenSumar = (formula: Formula): Nodo[] =>
  filasDe(formula.definicion)
    .map((f) => f.nodo)
    .filter(puedeSumarAlGrupo)

export const miembrosDe = (formula: Formula, grupoId: string): Nodo[] =>
  formula.definicion.nodos.filter((n) => n.grupo === grupoId)

// El grupo de un rechazo de `validarFormula()` (`grupo_vacio`, `bucket_inexistente`…): `donde` es el id de un grupo. Se pregunta después de que no nombró una fila.
export function grupoDelRechazo(
  rechazo: { donde?: string | undefined },
  grupos: readonly Grupo[],
): string | null {
  const { donde } = rechazo
  if (donde === undefined) return null
  return grupos.some((g) => g.id === donde) ? donde : null
}

// Los errores de los campos y, si el tipo de cambio sirve, el bucket elegido con los `buckets` que quedan.
export type RevisionDelGrupo = {
  errores: ErrorDelGrupo[]
  bucket: string | null
  buckets: Record<string, string>
}

export function revisarCambiosDelGrupo(
  formula: Formula,
  cambios: CambiosDelGrupo,
  { tonos, conModos }: ContextoDelGrupo,
  preferido?: string,
): RevisionDelGrupo {
  const errores: ErrorDelGrupo[] = []
  const etiqueta = cambios.etiqueta.trim()
  if (etiqueta === '')
    errores.push({ campo: 'etiqueta', mensaje: 'Escribe cómo se llama el grupo.' })
  else if (etiqueta.length > MAXIMO_DE_ETIQUETA)
    errores.push({ campo: 'etiqueta', mensaje: 'La etiqueta pasa de 60 caracteres.' })
  if (cambios.plazo.trim().length > MAXIMO_DE_PLAZO)
    errores.push({ campo: 'plazo', mensaje: 'El plazo pasa de 40 caracteres.' })
  if (!tonos.has(cambios.tono))
    errores.push({ campo: 'tono', mensaje: 'Elige un color de la lista.' })
  const elegido = bucketPara(formula, cambios.tipoDeCambio, {
    conModos,
    ...(preferido === undefined ? {} : { preferido }),
  })
  if (!elegido.ok) errores.push({ campo: 'tipo_de_cambio', mensaje: elegido.mensaje })
  const pueden = new Set(filasQuePuedenSumar(formula).map((n) => n.id))
  if (cambios.miembros.some((id) => !pueden.has(id)))
    errores.push({ campo: 'miembros', mensaje: MENSAJE_FILA_QUE_NO_SUMA })
  return elegido.ok
    ? { errores, bucket: elegido.bucket, buckets: elegido.buckets }
    : { errores, bucket: null, buckets: { ...(formula.definicion.buckets ?? {}) } }
}

export function grupoNuevo(id: string, cambios: CambiosDelGrupo, bucket: string): Grupo {
  const plazo = cambios.plazo.trim()
  return {
    id,
    etiqueta: cambios.etiqueta.trim(),
    ...(plazo === '' ? {} : { plazo }),
    tono: cambios.tono,
    bucket,
  }
}

// Sólo cambia `grupo` del nodo raíz de cada fila movida: su texto, sus auxiliares y su lugar quedan igual.
export function nodoConGrupo(n: Nodo, grupo: string | null): Nodo {
  if (grupo !== null) return { ...n, grupo }
  const { grupo: _quitado, ...resto } = n
  return resto as Nodo
}

export function aplicarGrupo(
  formula: Formula,
  grupoId: string,
  cambios: CambiosDelGrupo,
  contexto: ContextoDelGrupo,
): ResultadoDelGrupo {
  const grupos = formula.definicion.grupos ?? []
  const grupo = grupos.find((g) => g.id === grupoId)
  if (grupo === undefined) {
    return {
      ok: false,
      errores: [{ campo: 'grupo', mensaje: 'Ese grupo ya no está en la fórmula.' }],
    }
  }
  const revision = revisarCambiosDelGrupo(formula, cambios, contexto, grupo.bucket)
  if (revision.errores.length > 0 || revision.bucket === null)
    return { ok: false, errores: revision.errores }
  const { bucket, buckets } = revision

  const etiquetas = new Map(grupos.map((g) => [g.id, g.etiqueta]))
  const quedan = new Set(cambios.miembros)
  const entraron: FilaQueEntro[] = []
  const quitadas: FilaQuitada[] = []
  const nodos = formula.definicion.nodos.map((n) => {
    if (quedan.has(n.id) && n.grupo !== grupoId) {
      entraron.push({
        id: n.id,
        etiqueta: n.etiqueta,
        desde: n.grupo === undefined ? null : (etiquetas.get(n.grupo) ?? n.grupo),
      })
      return nodoConGrupo(n, grupoId)
    }
    if (!quedan.has(n.id) && n.grupo === grupoId) {
      quitadas.push({ id: n.id, etiqueta: n.etiqueta })
      return nodoConGrupo(n, null)
    }
    return n
  })
  const definicion = {
    ...formula.definicion,
    nodos,
    buckets,
    grupos: grupos.map((g) => (g.id === grupoId ? grupoNuevo(g.id, cambios, bucket) : g)),
  }
  return {
    ok: true,
    formula: {
      ...formula,
      definicion: contexto.conModos ? definicion : sinBucketsSueltos(definicion),
    },
    entraron,
    quitadas,
  }
}
