// La lectura de la vista previa del editor (4.19-4): la plantilla de trabajo convertida a la cuadrícula como la convertiría la base al leerla
// (`convertirPlantilla()`, con el contexto reducido y el catálogo), con lo que esa cuadrícula nombra, como `cotizacion_tarjeta`. Corta cada grupo en
// `FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA` antes de convertir: lo que cuesta no crece con los miembros. Los nombres de los tipos de cambio son la etiqueta de su nodo
// (nombres de ejemplo: la base nombra el de `tipos_cambio`). Puro y plano. Todo por id va por `Map`.
import type { LecturaEnCuadricula, PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import {
  FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA,
  type LecturaParaLaVistaPrevia,
} from '../vista-previa-de-la-plantilla'
import { convertirPlantilla } from './convertir-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import { btrim } from '../json-de-la-base'
import type { TonoDelCatalogo } from './lectura-de-la-plantilla'
import { esDeTodos, type NodoParaPlantilla } from './nodos-de-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'

// La definición con a lo sumo 4 miembros por grupo, y cuántos quedaron fuera.
function recortada(contexto: ContextoDePlantilla) {
  const porGrupo = new Map<string, number>()
  let deMas = 0
  const nodos = (contexto.definicion.nodos ?? []).filter((n) => {
    if (n.grupo == null) return true
    const vistos = porGrupo.get(n.grupo) ?? 0
    porGrupo.set(n.grupo, vistos + 1)
    if (vistos < FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA) return true
    deMas += 1
    return false
  })
  return { contexto: { ...contexto, definicion: { ...contexto.definicion, nodos } }, deMas }
}

function datosDe(p: PlantillaEnCuadricula) {
  return p.celdas.flatMap((c) =>
    c.contenido.tipo === 'dato' && 'nodo' in c.contenido
      ? [{ nodo: c.contenido.nodo, mostrar: c.contenido.mostrar }]
      : [],
  )
}

const variablesDe = (p: PlantillaEnCuadricula) =>
  new Set(
    p.celdas.flatMap((c) =>
      c.contenido.tipo === 'dato' && 'variable' in c.contenido ? [c.contenido.variable] : [],
    ),
  )

function tiposDeCambio(
  datos: readonly { nodo: string; mostrar: string }[],
  contexto: ContextoDePlantilla,
  nodos: ReadonlyMap<string, NodoParaPlantilla>,
): LecturaEnCuadricula['tiposDeCambio'] {
  const grupos = new Map((contexto.definicion.grupos ?? []).map((g) => [g.id, g]))
  const buckets = new Set(
    datos.flatMap((d) => {
      if (d.mostrar !== 'tc_nombre' && d.mostrar !== 'tc_valor') return []
      const grupo = nodos.get(d.nodo)?.grupo
      const bucket = grupo == null ? null : grupos.get(grupo)?.bucket
      return bucket == null ? [] : [bucket]
    }),
  )
  const nombre = (nodo: string | null) =>
    nodo === null ? null : (nodos.get(nodo)?.etiqueta ?? nodo)
  const deOmision = contexto.definicion.buckets ?? {}
  return {
    buckets: [...buckets].map((bucket) => {
      const nodo = Object.hasOwn(deOmision, bucket) ? (deOmision[bucket] ?? null) : null
      return { bucket, nombre: nombre(nodo), nodo }
    }),
    modos: (contexto.diseno?.cabecera?.modos ?? []).flatMap((m) =>
      (m.buckets ?? []).flatMap((b) =>
        buckets.has(b.bucket) && m.clave != null
          ? [{ modo: m.clave, bucket: b.bucket, nombre: nombre(b.nodo), nodo: b.nodo }]
          : [],
      ),
    ),
  }
}

// Al tipear, la etiqueta del total en blanco (que la forma rechaza) se ve como «Total».
const conTotal = (p: Plantilla): Plantilla =>
  btrim(p.total.etiqueta) === '' ? { ...p, total: { ...p.total, etiqueta: 'Total' } } : p

// La variante con sus títulos, sólo si la cuadrícula muestra `titulo_opcion` y es del nivel «todos».
function varianteDe(
  definicion: PlantillaEnCuadricula,
  contexto: ContextoDePlantilla,
  nodos: readonly NodoParaPlantilla[],
): LecturaEnCuadricula['variante'] {
  const opcion = nodos.find((n) => n.tipo === 'opcion')
  if (opcion === undefined || !variablesDe(definicion).has('titulo_opcion')) return null
  if (!esDeTodos(contexto.visibilidad ?? {}, opcion.id)) return null
  return {
    nodo: opcion.id,
    opciones: (opcion.opciones ?? []).map((o) => ({ clave: o.clave, titulo: o.titulo })),
  }
}

// Los nodos que nombran las filas y las celdas, con lo que la tarjeta dibuja de ellos.
function nodosNombrados(
  definicion: PlantillaEnCuadricula,
  nodos: ReadonlyMap<string, NodoParaPlantilla>,
): LecturaEnCuadricula['nodos'] {
  const ids = new Set([
    ...definicion.filas.flatMap((f) => (f.nodo === undefined ? [] : [f.nodo])),
    ...datosDe(definicion).map((d) => d.nodo),
  ])
  return [...ids].map((id) => {
    const n = nodos.get(id)
    return {
      id,
      etiqueta: n?.etiqueta || id,
      descripcion: n?.descripcion ?? null,
      grupo: n?.grupo ?? null,
      pct: null,
    }
  })
}

// Los grupos de un nodo con `tc_*` o `plazo`.
function gruposNombrados(
  definicion: PlantillaEnCuadricula,
  contexto: ContextoDePlantilla,
  nodos: ReadonlyMap<string, NodoParaPlantilla>,
): LecturaEnCuadricula['grupos'] {
  const conGrupo = new Set(
    datosDe(definicion).flatMap((d) => {
      const grupo = nodos.get(d.nodo)?.grupo
      return ['tc_nombre', 'tc_valor', 'plazo'].includes(d.mostrar) && grupo != null ? [grupo] : []
    }),
  )
  return (contexto.definicion.grupos ?? [])
    .filter((g) => conGrupo.has(g.id))
    .map((g) => ({
      id: g.id,
      etiqueta: g.etiqueta || g.id,
      plazo: typeof g.plazo === 'string' && g.plazo !== '' ? g.plazo : null,
      bucket: g.bucket ?? null,
    }))
}

export function lecturaParaLaVistaPrevia(entrada: {
  plantilla: Plantilla
  contexto: ContextoDePlantilla
  tonos: readonly TonoDelCatalogo[]
}): LecturaParaLaVistaPrevia {
  const { tonos } = entrada
  const { contexto, deMas } = recortada(entrada.contexto)
  const definicion = convertirPlantilla(
    conTotal(entrada.plantilla),
    contexto,
    tonos.map((t) => t.clave),
  )
  const lista = contexto.definicion.nodos
  const nodos = new Map(lista.map((n) => [n.id, n]))
  const usados = new Set(definicion.celdas.flatMap((c) => [c.estilo?.fondo, c.estilo?.texto]))
  return {
    lectura: {
      definicion,
      nodos: nodosNombrados(definicion, nodos),
      grupos: gruposNombrados(definicion, contexto, nodos),
      tiposDeCambio: tiposDeCambio(datosDe(definicion), contexto, nodos),
      modos: [],
      variante: varianteDe(definicion, contexto, lista),
      colores: tonos.flatMap((t) =>
        usados.has(t.clave) && t.hex !== undefined ? [{ clave: t.clave, hex: t.hex }] : [],
      ),
      total: { nodo: lista.find((n) => n.salida === 'total')?.id ?? null },
    },
    filasDeMas: deMas,
  }
}
