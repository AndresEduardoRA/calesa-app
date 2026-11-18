// Lo que la forma 2 cruza con la fórmula, espejo de `_plantilla_cuadricula_nodos()`, en su orden: `tono_inexistente` (sólo con el catálogo),
// `nodo_de_fila_inexistente`, `nodo_inexistente`, `mostrar_no_admitido`, `nodo_restringido` (los nodos de las filas en orden, después los de las celdas en
// orden; de un `porcentaje`, también su `pct`; no figurar cuenta como restringido) y `tipo_de_cambio_restringido` (por cada celda `tc_*` en orden, el nodo del
// bucket de su grupo por omisión y después el de cada modo). Todo `donde` nombra la fila o la celda, nunca el nodo. Todo lo que se busca por id va por `Map`/`Set`.
import { COLOR_AUTOMATICO, type PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { rechazoDePlantilla, type RechazoDePlantilla } from './motivos-de-plantilla'
import { esDeTodos, type ContextoDeNodos, type NodoParaPlantilla } from './nodos-de-plantilla'

type DatoDeNodo = { readonly nodo: string; readonly mostrar: string }
type CeldaConNodo = { readonly id: string; readonly dato: DatoDeNodo }

const DEL_GRUPO = new Set(['tc_nombre', 'tc_valor', 'plazo'])
const DEL_TIPO_DE_CAMBIO = new Set(['tc_nombre', 'tc_valor'])

// Las celdas que muestran un nodo, en orden.
function celdasConNodo(p: PlantillaEnCuadricula): CeldaConNodo[] {
  return p.celdas.flatMap((c) =>
    c.contenido.tipo === 'dato' && 'nodo' in c.contenido
      ? [{ id: c.id, dato: { nodo: c.contenido.nodo, mostrar: c.contenido.mostrar } }]
      : [],
  )
}

// El `pct` del par porcentaje-monto de un nodo: el suyo si es el `porcentaje_de`, él mismo si es el `pct` de uno. Nulo si no es de un par.
export function pctDelPar(
  nodo: NodoParaPlantilla | undefined,
  pctsDeUnPar: ReadonlySet<string>,
): string | null {
  if (nodo === undefined) return null
  if (nodo.tipo === 'calculo' && nodo.op === 'porcentaje_de' && nodo.pct != null) return nodo.pct
  return pctsDeUnPar.has(nodo.id) ? nodo.id : null
}

export const pctsDeLosPares = (nodos: readonly NodoParaPlantilla[]): ReadonlySet<string> =>
  new Set(
    nodos.flatMap((n) =>
      n.tipo === 'calculo' && n.op === 'porcentaje_de' && n.pct != null ? [n.pct] : [],
    ),
  )

function tonoQueNoEsta(p: PlantillaEnCuadricula, tonos: readonly string[]): string | undefined {
  const catalogo = new Set(tonos)
  const fuera = (clave: string | undefined) =>
    clave !== undefined && clave !== COLOR_AUTOMATICO && !catalogo.has(clave)
  return p.celdas.find((c) => fuera(c.estilo?.fondo) || fuera(c.estilo?.texto))?.id
}

function mostrarNoAdmitido(
  celdas: readonly CeldaConNodo[],
  { definicion }: ContextoDeNodos,
): string | undefined {
  const nodos = new Map((definicion.nodos ?? []).map((n) => [n.id, n]))
  const grupos = new Set((definicion.grupos ?? []).map((g) => g.id))
  const pcts = pctsDeLosPares(definicion.nodos ?? [])
  return celdas.find(({ dato }) => {
    const nodo = nodos.get(dato.nodo)
    if (dato.mostrar === 'porcentaje') return pctDelPar(nodo, pcts) === null
    if (!DEL_GRUPO.has(dato.mostrar)) return false
    return nodo?.grupo == null || !grupos.has(nodo.grupo)
  })?.id
}

function restringido(
  p: PlantillaEnCuadricula,
  celdas: readonly CeldaConNodo[],
  { definicion, visibilidad }: ContextoDeNodos,
): string | undefined {
  const vis = visibilidad ?? {}
  const fila = p.filas.find((f) => f.nodo !== undefined && !esDeTodos(vis, f.nodo))
  if (fila !== undefined) return `filas.${fila.id}`
  const nodos = new Map((definicion.nodos ?? []).map((n) => [n.id, n]))
  const pcts = pctsDeLosPares(definicion.nodos ?? [])
  const celda = celdas.find(({ dato }) => {
    const pct = dato.mostrar === 'porcentaje' ? pctDelPar(nodos.get(dato.nodo), pcts) : null
    return !esDeTodos(vis, dato.nodo) || (pct !== null && !esDeTodos(vis, pct))
  })
  return celda === undefined ? undefined : `celdas.${celda.id}`
}

// Los nodos que dan el tipo de cambio de un bucket: el de omisión y, después, el de cada modo del diseño que lo nombra, en su orden.
export function nodosDelTipoDeCambio(
  { definicion, diseno }: Pick<ContextoDeNodos, 'definicion' | 'diseno'>,
  bucket: string,
): string[] {
  const buckets = definicion.buckets ?? {}
  const porOmision = Object.hasOwn(buckets, bucket) ? [buckets[bucket]] : []
  const deLosModos = (diseno?.cabecera?.modos ?? []).flatMap((m) =>
    (m.buckets ?? []).flatMap((b) => (b.bucket === bucket ? [b.nodo] : [])),
  )
  return [...porOmision, ...deLosModos].filter((n): n is string => typeof n === 'string')
}

function tipoDeCambioRestringido(
  celdas: readonly CeldaConNodo[],
  contexto: ContextoDeNodos,
): string | undefined {
  const vis = contexto.visibilidad ?? {}
  const nodos = new Map((contexto.definicion.nodos ?? []).map((n) => [n.id, n]))
  const grupos = new Map((contexto.definicion.grupos ?? []).map((g) => [g.id, g]))
  return celdas.find(({ dato }) => {
    if (!DEL_TIPO_DE_CAMBIO.has(dato.mostrar)) return false
    const grupo = nodos.get(dato.nodo)?.grupo
    const bucket = grupo == null ? null : grupos.get(grupo)?.bucket
    if (bucket == null) return false
    return nodosDelTipoDeCambio(contexto, bucket).some((n) => !esDeTodos(vis, n))
  })?.id
}

export function revisarNodosDeCuadricula(
  p: PlantillaEnCuadricula,
  contexto: ContextoDeNodos & { readonly tonos: readonly string[] | null },
): RechazoDePlantilla | null {
  if (contexto.tonos !== null) {
    const tono = tonoQueNoEsta(p, contexto.tonos)
    if (tono !== undefined) return rechazoDePlantilla('tono_inexistente', `celdas.${tono}`)
  }
  const ids = new Set((contexto.definicion.nodos ?? []).map((n) => n.id))
  const fila = p.filas.find((f) => f.nodo !== undefined && !ids.has(f.nodo))
  if (fila !== undefined) return rechazoDePlantilla('nodo_de_fila_inexistente', `filas.${fila.id}`)
  const celdas = celdasConNodo(p)
  const inexistente = celdas.find((c) => !ids.has(c.dato.nodo))
  if (inexistente !== undefined)
    return rechazoDePlantilla('nodo_inexistente', `celdas.${inexistente.id}`)
  const noAdmitido = mostrarNoAdmitido(celdas, contexto)
  if (noAdmitido !== undefined)
    return rechazoDePlantilla('mostrar_no_admitido', `celdas.${noAdmitido}`)
  const donde = restringido(p, celdas, contexto)
  if (donde !== undefined) return rechazoDePlantilla('nodo_restringido', donde)
  const tc = tipoDeCambioRestringido(celdas, contexto)
  return tc === undefined ? null : rechazoDePlantilla('tipo_de_cambio_restringido', `celdas.${tc}`)
}
