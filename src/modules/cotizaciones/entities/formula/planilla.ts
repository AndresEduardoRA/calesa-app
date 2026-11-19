// Las bandas de la planilla de la fórmula (glosario: «Planilla de la fórmula», «Banda (de la planilla)»), en el orden de V1: «Tipo de cambio», «Unidad de ejemplo»,
// «Variante», un grupo por banda en el orden de `grupos` y «Sin grupo» al final. Cada fila de la fórmula aparece una sola vez: un tipo de cambio en su banda; lo que
// se tipea al cotizar (un `input`, un campo del vehículo, una bandera y la variante) en «Unidad de ejemplo», aunque tenga grupo; lo demás en su grupo o en «Sin
// grupo». «Variante» lista las opciones de la variante (no son nodos). Las filas se numeran 1…n en el orden en que se dibujan, sobre todas las filas (el número
// de una fila no cambia al buscar); las cabeceras no cuentan. Puro: se calcula una vez por fórmula de trabajo, O(filas).
import type { Formula, Grupo } from '../formula'
import type { Nodo, NodoOpcion } from '../nodos'

type ConNodo = { readonly id: string; readonly nodo: Nodo }

export type FilaNumerada<F> = { readonly numero: number; readonly fila: F }
export type OpcionNumerada = {
  readonly numero: number
  readonly clave: string
  readonly etiqueta: string
  readonly titulo: string
  readonly porDefecto: boolean
}

export type BandaDeLaPlanilla<F> =
  | { readonly tipo: 'tipo_cambio'; readonly filas: readonly FilaNumerada<F>[] }
  | { readonly tipo: 'unidad'; readonly filas: readonly FilaNumerada<F>[] }
  | {
      readonly tipo: 'variante'
      readonly nodo: NodoOpcion
      readonly opciones: readonly OpcionNumerada[]
    }
  | { readonly tipo: 'grupo'; readonly grupo: Grupo; readonly filas: readonly FilaNumerada<F>[] }
  | { readonly tipo: 'sin_grupo'; readonly filas: readonly FilaNumerada<F>[] }

// Lo que se tipea al cotizar va en la unidad de ejemplo.
export const esDeLaUnidad = (n: Nodo): boolean =>
  n.tipo === 'input' || n.tipo === 'campo_vehiculo' || n.tipo === 'bandera' || n.tipo === 'opcion'

type Opciones = {
  // Las filas que se dibujan (las de «Buscar fila» y el tope); sin él, todas.
  readonly visibles?: ReadonlySet<string>
  // Sin búsqueda, la banda de un grupo sin filas se dibuja igual (su «Editar grupo» es lo que lo arregla).
  readonly conGruposVacios?: boolean
}

type Repartidas<F> = {
  cambio: F[]
  unidad: F[]
  porGrupo: Map<string, F[]>
  sinGrupo: F[]
  variante: { id: string; nodo: NodoOpcion } | null
}

// Cada fila a su banda, en el orden de la fórmula.
function repartir<F extends ConNodo>(filas: readonly F[], grupos: readonly Grupo[]): Repartidas<F> {
  const r: Repartidas<F> = {
    cambio: [],
    unidad: [],
    porGrupo: new Map(grupos.map((g) => [g.id, []])),
    sinGrupo: [],
    variante: null,
  }
  for (const f of filas) {
    if (f.nodo.tipo === 'opcion') r.variante = { id: f.id, nodo: f.nodo }
    const delGrupo = f.nodo.grupo === undefined ? undefined : r.porGrupo.get(f.nodo.grupo)
    if (f.nodo.tipo === 'tipo_cambio') r.cambio.push(f)
    else if (esDeLaUnidad(f.nodo)) r.unidad.push(f)
    else if (delGrupo !== undefined) delGrupo.push(f)
    else r.sinGrupo.push(f)
  }
  return r
}

// El número de cada fila en el orden en que se dibuja, contando también las que no se ven.
function numerador<F extends ConNodo>(visibles: ReadonlySet<string> | undefined) {
  let numero = 0
  return {
    siguiente: () => (numero += 1),
    filas: (lista: readonly F[]): FilaNumerada<F>[] =>
      lista.flatMap((fila) => {
        numero += 1
        return visibles === undefined || visibles.has(fila.id) ? [{ numero, fila }] : []
      }),
  }
}

// Las opciones de la variante, numeradas. Cuentan aunque la variante no se vea (al buscar): el número de las filas de abajo no cambia.
function bandaDeLaVariante(
  variante: { id: string; nodo: NodoOpcion } | null,
  visibles: ReadonlySet<string> | undefined,
  siguiente: () => number,
): BandaDeLaPlanilla<never>[] {
  if (variante === null) return []
  const { nodo } = variante
  const opciones = nodo.opciones.map((o) => ({
    numero: siguiente(),
    clave: o.clave,
    etiqueta: o.etiqueta,
    titulo: o.titulo,
    porDefecto: o.clave === nodo.por_defecto,
  }))
  return visibles === undefined || visibles.has(variante.id)
    ? [{ tipo: 'variante', nodo, opciones }]
    : []
}

export function bandasDeLaPlanilla<F extends ConNodo>(
  formula: Formula,
  filas: readonly F[],
  opciones: Opciones = {},
): BandaDeLaPlanilla<F>[] {
  const grupos = formula.definicion.grupos ?? []
  const { visibles, conGruposVacios = true } = opciones
  const r = repartir(filas, grupos)
  const n = numerador<F>(visibles)
  const conFilas = (banda: BandaDeLaPlanilla<F> & { filas: readonly unknown[] }) =>
    banda.filas.length > 0 ? [banda] : []
  return [
    ...conFilas({ tipo: 'tipo_cambio', filas: n.filas(r.cambio) }),
    ...conFilas({ tipo: 'unidad', filas: n.filas(r.unidad) }),
    ...bandaDeLaVariante(r.variante, visibles, n.siguiente),
    ...grupos.flatMap((g): BandaDeLaPlanilla<F>[] => {
      const del = n.filas(r.porGrupo.get(g.id) ?? [])
      return del.length > 0 || conGruposVacios ? [{ tipo: 'grupo', grupo: g, filas: del }] : []
    }),
    ...conFilas({ tipo: 'sin_grupo', filas: n.filas(r.sinGrupo) }),
  ]
}

// La celda B de una fila: el porcentaje de un `porcentaje_de` (el `pct` del par o de la operación). Se edita en B si ese `pct` es una constante; si es otra cosa
// (un `input`), sólo se lee. Nula en cualquier otra fila.
export function celdaB(
  fila: ConNodo,
  nodos: ReadonlyMap<string, Nodo>,
): { readonly pct: string; readonly editable: boolean } | null {
  const n = fila.nodo
  if (n.tipo !== 'calculo' || n.op !== 'porcentaje_de') return null
  return { pct: n.pct, editable: nodos.get(n.pct)?.tipo === 'constante' }
}

// La celda C se edita en una constante raíz (su valor, como el ⚙); la unidad de ejemplo se edita aparte.
export const editableEnC = (fila: ConNodo): boolean => fila.nodo.tipo === 'constante'
