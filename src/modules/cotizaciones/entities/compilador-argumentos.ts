// Lo que comparten las funciones del texto al cerrarse (`compilador-funciones.ts`, `compilador-condiciones.ts`): qué pide cada tipo
// de argumento, armar la operación y expandir un grupo en sus miembros.
import {
  argumentoInvalido,
  demasiadosTerminos,
  errorEn,
  type Arbol,
  type Calculo,
  type Campos,
  type Clave,
  type ErrorCrudo,
  type OpDeArbol,
  type Rango,
  type Referencia,
} from './compilador-arbol'
import type { Nombres } from './compilador-nombres'
import { buscar, esta, recorrer } from './medidor'

// Cuenta términos de más; false si pasa el tope.
export type Contar = (n: number) => boolean

const NECESITA: Record<string, string> = {
  grupo: 'el nombre de un grupo',
  condicion: 'una condición: una bandera, una comparación como a>b, Y u O',
  nodo: 'el nombre de un nodo',
  clave: 'un id en minúsculas (letras, números y _)',
  entero: 'un número entero de 0 a 6',
  pct: 'un porcentaje: un nodo con formato pct o un número como 4%',
  texto: 'un nombre entre comillas, como "fletes"',
  logico: 'VERDADERO (buscar por tramo) o FALSO (buscar el valor exacto)',
}

export const invalido = (a: Rango, tipo: string) => argumentoInvalido(a, NECESITA[tipo])

export const calculo = (
  op: OpDeArbol,
  r: Rango,
  hijos: Arbol[],
  extra: { campos?: Campos; pct?: Arbol } = {},
): Calculo => ({
  k: 'calc',
  op,
  hijos,
  campos: extra.campos ?? {},
  deFuncion: true,
  paren: false,
  desde: r.desde,
  hasta: r.hasta,
  ...(extra.pct === undefined ? {} : { pct: extra.pct }),
})

// Los miembros de un grupo, en su orden, como referencias (SUMA, MAX y MIN de un grupo): el grupo tiene que existir (el parser sólo
// lo toma por grupo si existe), no ser el de la fila, no tener miembros más abajo ni estar vacío.
export function expandirGrupo(
  arg: Clave,
  nombres: Nombres,
  contar: Contar,
): Referencia[] | ErrorCrudo {
  const g = arg.texto
  const dato = { nombre: g }
  if (!esta(nombres.grupos, g, nombres.m)) return errorEn(arg, 'nombre_desconocido', dato)
  if (nombres.destino.grupo === g) return errorEn(arg, 'ciclo', { nombre: nombres.destino.id })
  if (esta(nombres.conMiembrosPosteriores, g, nombres.m))
    return errorEn(arg, 'referencia_hacia_adelante', dato)
  const miembros = buscar(nombres.miembros, g, nombres.m) ?? []
  if (miembros.length === 0) return errorEn(arg, 'grupo_vacio', dato)
  if (!contar(miembros.length)) return demasiadosTerminos(arg)
  const hijos: Referencia[] = []
  for (const nodo of recorrer(miembros, nombres.m)) {
    hijos.push({ k: 'ref', nodo, paren: false, desde: arg.desde, hasta: arg.hasta })
  }
  return hijos
}
