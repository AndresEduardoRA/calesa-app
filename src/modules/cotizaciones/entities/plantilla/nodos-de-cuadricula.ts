// Lo que la forma 2 cruza con la fórmula, espejo de `_plantilla_cuadricula_nodos()`, sobre los datos que nombra (`datosNombrados()`: las filas y después las
// celdas, en orden), en su orden: `tono_inexistente` (sólo con el catálogo), `nodo_de_fila_inexistente` (un nodo de una fila), `nodo_inexistente` (uno de una
// celda), `mostrar_no_admitido`, `nodo_restringido` (de un `porcentaje`, también su `pct`; no figurar cuenta como restringido), `tipo_de_cambio_restringido` (por
// cada dato `tc_*`, el nodo del bucket de su grupo por omisión y después el de cada modo) y `condicion_invalida` (una condición que el nodo no puede responder:
// `opcion` sobre lo que no es la variante o con una clave que no tiene, `encendido` o `apagado` sobre lo que no es una bandera, un número sobre la variante). Todo
// `donde` nombra la fila o la celda, nunca el nodo. Todo lo que se busca por id va por `Map`/`Set`.
import { COLOR_AUTOMATICO, type PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import {
  conNodoYMostrar,
  datosNombrados,
  dondeDelDato,
  type DatoNombrado,
} from './datos-de-la-cuadricula'
import { rechazoDePlantilla, type RechazoDePlantilla } from './motivos-de-plantilla'
import { esDeTodos, type ContextoDeNodos, type NodoParaPlantilla } from './nodos-de-plantilla'

type DatoDeNodo = ReturnType<typeof conNodoYMostrar>[number]

const DEL_GRUPO = new Set(['tc_nombre', 'tc_valor', 'plazo'])
const DEL_TIPO_DE_CAMBIO = new Set(['tc_nombre', 'tc_valor'])

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
  datos: readonly DatoDeNodo[],
  { definicion }: ContextoDeNodos,
): DatoDeNodo | undefined {
  const nodos = new Map((definicion.nodos ?? []).map((n) => [n.id, n]))
  const grupos = new Set((definicion.grupos ?? []).map((g) => g.id))
  const pcts = pctsDeLosPares(definicion.nodos ?? [])
  return datos.find((dato) => {
    const nodo = nodos.get(dato.nodo)
    if (dato.mostrar === 'porcentaje') return pctDelPar(nodo, pcts) === null
    if (!DEL_GRUPO.has(dato.mostrar)) return false
    return nodo?.grupo == null || !grupos.has(nodo.grupo)
  })
}

function restringido(
  datos: readonly DatoNombrado[],
  { definicion, visibilidad }: ContextoDeNodos,
): DatoNombrado | undefined {
  const vis = visibilidad ?? {}
  const nodos = new Map((definicion.nodos ?? []).map((n) => [n.id, n]))
  const pcts = pctsDeLosPares(definicion.nodos ?? [])
  return datos.find(({ nodo, mostrar }) => {
    if (nodo === null) return false
    const pct = mostrar === 'porcentaje' ? pctDelPar(nodos.get(nodo), pcts) : null
    return !esDeTodos(vis, nodo) || (pct !== null && !esDeTodos(vis, pct))
  })
}

// Lo que pregunta por un número (también «es 0» y «no es 0»): no lo responde la variante.
const NUMERICAS: ReadonlySet<string> = new Set(['cero', 'no_cero', 'mayor', 'menor', 'igual'])

// Si un nodo no puede responder una condición: la opción, de la variante y con una clave suya; encendido o apagado, de una bandera; un número, de lo que no es la variante.
function noResponde(d: DatoNombrado, nodo: NodoParaPlantilla | undefined): boolean {
  if (d.es === 'opcion')
    return nodo?.tipo !== 'opcion' || !(nodo.opciones ?? []).some((o) => o.clave === d.opcion)
  if (d.es === 'encendido' || d.es === 'apagado') return nodo?.tipo !== 'bandera'
  return d.es !== null && NUMERICAS.has(d.es) && nodo?.tipo === 'opcion'
}

function condicionInvalida(
  datos: readonly DatoNombrado[],
  { definicion }: ContextoDeNodos,
): DatoNombrado | undefined {
  const nodos = new Map((definicion.nodos ?? []).map((n) => [n.id, n]))
  return datos.find(
    (d) => d.nodo !== null && d.mostrar === null && noResponde(d, nodos.get(d.nodo)),
  )
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
  datos: readonly DatoDeNodo[],
  contexto: ContextoDeNodos,
): DatoDeNodo | undefined {
  const vis = contexto.visibilidad ?? {}
  const nodos = new Map((contexto.definicion.nodos ?? []).map((n) => [n.id, n]))
  const grupos = new Map((contexto.definicion.grupos ?? []).map((g) => [g.id, g]))
  return datos.find((dato) => {
    if (!DEL_TIPO_DE_CAMBIO.has(dato.mostrar)) return false
    const grupo = nodos.get(dato.nodo)?.grupo
    const bucket = grupo == null ? null : grupos.get(grupo)?.bucket
    if (bucket == null) return false
    return nodosDelTipoDeCambio(contexto, bucket).some((n) => !esDeTodos(vis, n))
  })
}

// El primer rechazo de una de las reglas que miran los datos, con su `donde`.
const primero = (
  regla: Parameters<typeof rechazoDePlantilla>[0],
  d: { lugar: 'filas' | 'celdas'; id: string } | undefined,
) => (d === undefined ? null : rechazoDePlantilla(regla, dondeDelDato(d)))

export function revisarNodosDeCuadricula(
  p: PlantillaEnCuadricula,
  contexto: ContextoDeNodos & { readonly tonos: readonly string[] | null },
): RechazoDePlantilla | null {
  if (contexto.tonos !== null) {
    const tono = tonoQueNoEsta(p, contexto.tonos)
    if (tono !== undefined) return rechazoDePlantilla('tono_inexistente', `celdas.${tono}`)
  }
  const ids = new Set((contexto.definicion.nodos ?? []).map((n) => n.id))
  const datos = datosNombrados(p)
  const inexistente = (lugar: DatoNombrado['lugar']) =>
    datos.find((d) => d.lugar === lugar && d.nodo !== null && !ids.has(d.nodo))
  const conMostrar = conNodoYMostrar(datos)
  return (
    primero('nodo_de_fila_inexistente', inexistente('filas')) ??
    primero('nodo_inexistente', inexistente('celdas')) ??
    primero('mostrar_no_admitido', mostrarNoAdmitido(conMostrar, contexto)) ??
    primero('nodo_restringido', restringido(datos, contexto)) ??
    primero('tipo_de_cambio_restringido', tipoDeCambioRestringido(conMostrar, contexto)) ??
    primero('condicion_invalida', condicionInvalida(datos, contexto))
  )
}
