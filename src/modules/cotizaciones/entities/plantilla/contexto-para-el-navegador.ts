// Lo que el editor de la plantilla lleva al navegador (4.19-3b): del contexto de `validarPlantilla()` sólo lo que ese validador y el editor necesitan. La `definicion`
// entera de la fórmula pesa decenas de KB y no se dibuja; aquí quedan los nodos con lugar en la tarjeta (o que dan el tipo de cambio de un bucket), con su etiqueta,
// su grupo y su salida; los buckets; los grupos; del diseño los modos y los secundarios, y de la visibilidad sólo el `ver` de esos ids. Nunca el cuerpo de un nodo.
// Todo lo que se arma por id va por `Object.fromEntries`/`Map`: `__proto__` y `constructor` son ids legales.
import {
  lugaresDe,
  type DefinicionParaPlantilla,
  type DisenoParaPlantilla,
  type NodoParaPlantilla,
  type VisibilidadParaPlantilla,
} from './nodos-de-plantilla'
import type { ContextoDePlantilla } from './validar-plantilla'
import { FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA } from '../vista-previa-de-la-plantilla'
import { esDeTodos } from './nodos-de-plantilla'

// La descripción (la leyenda de la vista previa) sólo de los miembros que dibuja (los primeros de cada grupo) y de lo aparte: el HTML no crece con 500 miembros.
function conDescripcionDe({ definicion, diseno }: ContextoDePlantilla): ReadonlySet<string> {
  const ids = new Set(diseno?.tarjeta_total?.secundarios ?? [])
  const porGrupo = new Map<string, number>()
  for (const n of definicion.nodos ?? []) {
    if (n.grupo == null) continue
    const vistos = porGrupo.get(n.grupo) ?? 0
    if (vistos < FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA) ids.add(n.id)
    porGrupo.set(n.grupo, vistos + 1)
  }
  return ids
}

// La variante, sólo si es del nivel «todos»: el título de la opción en la vista previa.
const varianteDeTodos = ({ definicion, visibilidad }: ContextoDePlantilla) =>
  (definicion.nodos ?? []).find(
    (n) => n.tipo === 'opcion' && visibilidad !== null && esDeTodos(visibilidad, n.id),
  )

// Lo que viaja de un nodo: su etiqueta, su grupo y su salida; la descripción si se dibuja, y de la variante sus opciones con su título.
function nodoReducido(
  n: NodoParaPlantilla,
  conDescripcion: ReadonlySet<string>,
  opcion: string | undefined,
): NodoParaPlantilla {
  return {
    id: n.id,
    etiqueta: n.etiqueta ?? null,
    grupo: n.grupo ?? null,
    salida: n.salida ?? null,
    ...(conDescripcion.has(n.id) && typeof n.descripcion === 'string'
      ? { descripcion: n.descripcion }
      : {}),
    ...(n.id === opcion
      ? {
          tipo: 'opcion',
          opciones: (n.opciones ?? []).map((o) => ({ clave: o.clave, titulo: o.titulo })),
        }
      : {}),
  }
}

export function contextoParaElNavegador(contexto: ContextoDePlantilla): ContextoDePlantilla {
  const { definicion, diseno, visibilidad } = contexto
  const { lugar } = lugaresDe(contexto)
  const buckets = definicion.buckets ?? {}
  const deLosModos = (diseno?.cabecera?.modos ?? []).map((m) => ({
    clave: m.clave ?? null,
    nombre: m.nombre ?? null,
    buckets: (m.buckets ?? []).map(({ bucket, nodo }) => ({ bucket, nodo })),
  }))
  // Los nodos que da el tipo de cambio de un bucket (el de omisión y los de cada modo): `tipoDeCambioRestringido()` los juzga por su visibilidad.
  const deTipoDeCambio = new Set([
    ...Object.values(buckets),
    ...deLosModos.flatMap((m) => m.buckets.map((b) => b.nodo)),
  ])
  const conDescripcion = conDescripcionDe(contexto)
  const opcion = varianteDeTodos(contexto)
  const nodos: NodoParaPlantilla[] = (definicion.nodos ?? [])
    .filter((n) => lugar.has(n.id) || deTipoDeCambio.has(n.id) || n.id === opcion?.id)
    .map((n) => nodoReducido(n, conDescripcion, opcion?.id))
  const reducida: DefinicionParaPlantilla = {
    nodos,
    buckets: Object.fromEntries(Object.entries(buckets)),
    grupos: (definicion.grupos ?? []).map((g) => ({
      id: g.id,
      etiqueta: g.etiqueta ?? null,
      tono: g.tono ?? null,
      bucket: g.bucket ?? null,
      plazo: typeof g.plazo === 'string' ? g.plazo : null,
    })),
  }
  const disenoReducido: DisenoParaPlantilla | null =
    diseno === null
      ? null
      : {
          cabecera: { modos: deLosModos },
          tarjeta_total: { secundarios: [...(diseno.tarjeta_total?.secundarios ?? [])] },
        }
  return {
    definicion: reducida,
    diseno: disenoReducido,
    visibilidad: visibilidadReducida(visibilidad, [
      ...nodos.map((n) => n.id),
      ...deTipoDeCambio,
      ...lugar,
      ...(opcion === undefined ? [] : [opcion.id]),
    ]),
    tonos: contexto.tonos,
  }
}

// Sólo `{ ver }` de cada id que se queda; un id que no figura sigue sin figurar (para `esDeTodos()` es restringido).
function visibilidadReducida(
  visibilidad: VisibilidadParaPlantilla | null,
  ids: readonly string[],
): VisibilidadParaPlantilla | null {
  if (visibilidad === null) return null
  const entradas = [...new Set(ids)].flatMap((id): [string, { ver?: unknown }][] => {
    if (!Object.hasOwn(visibilidad, id)) return []
    const v = visibilidad[id]
    if (typeof v !== 'object' || v === null || Array.isArray(v)) return [[id, {}]]
    return [[id, Object.hasOwn(v, 'ver') ? { ver: (v as { ver?: unknown }).ver } : {}]]
  })
  return Object.fromEntries(entradas)
}
