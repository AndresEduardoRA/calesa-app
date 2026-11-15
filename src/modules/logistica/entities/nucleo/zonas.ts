import { ORDEN_DE_HUECOS } from './hueco'

// Las zonas de la unidad en su página (T20): dónde se dibuja cada hueco en escritorio. El orden lo sigue dando `ORDEN_DE_HUECOS`; la zona es el mismo tipo de dato y usa la misma clave, por eso vive
// junto al orden y no en la declaración de cada área (así `repuestos` no conoce los nombres de las zonas de `logistica`). El `Record` obliga a ponerle zona a toda clave nueva.
//   principal: lo que se mira para mover, siempre a la vista.
//   pestanas:  lo que se consulta de vez en cuando, una pestaña a la vez (cada una con su desplazamiento).
//   lateral:   notas e historial, al lado.
export const ZONAS_DE_LA_UNIDAD = ['principal', 'pestanas', 'lateral'] as const
export type ZonaDeLaUnidad = (typeof ZONAS_DE_LA_UNIDAD)[number]

type ClaveDeHueco = (typeof ORDEN_DE_HUECOS)[number]

// «Dinero» junta gastos, pagos y margen en una sola pestaña, apilados en el orden de `ORDEN_DE_HUECOS`: es la palabra de la persona y caben cinco pestañas a 1280 px.
export const PESTANA_DE_DINERO = { clave: 'dinero', titulo: 'Dinero' } as const

export const ZONA_DEL_HUECO: Record<ClaveDeHueco, { zona: ZonaDeLaUnidad; pestana: string }> = {
  'que-falta': { zona: 'principal', pestana: 'que-falta' },
  documentos: { zona: 'pestanas', pestana: 'documentos' },
  transporte: { zona: 'pestanas', pestana: 'transporte' },
  repuestos: { zona: 'pestanas', pestana: 'repuestos' },
  aduana: { zona: 'pestanas', pestana: 'aduana' },
  gastos: { zona: 'pestanas', pestana: PESTANA_DE_DINERO.clave },
  pagos: { zona: 'pestanas', pestana: PESTANA_DE_DINERO.clave },
  margen: { zona: 'pestanas', pestana: PESTANA_DE_DINERO.clave },
  notas: { zona: 'lateral', pestana: 'notas' },
  historial: { zona: 'lateral', pestana: 'historial' },
}

type ConClave = { clave: string; titulo: string }

export type PestanaDeLaUnidad<H extends ConClave> = {
  clave: string
  titulo: string
  huecos: H[]
}

export type ZonasDeLaUnidad<H extends ConClave> = {
  principal: H[]
  pestanas: PestanaDeLaUnidad<H>[]
  lateral: PestanaDeLaUnidad<H>[]
}

const esClaveConocida = (clave: string): clave is ClaveDeHueco =>
  (ORDEN_DE_HUECOS as readonly string[]).includes(clave)

/** La pestaña que contiene ese hueco (`dinero` para gastos, pagos y margen); nula si la clave no es de un hueco conocido. */
export function pestanaDelHueco(clave: string | null | undefined): string | null {
  return clave !== null && clave !== undefined && esClaveConocida(clave)
    ? ZONA_DEL_HUECO[clave].pestana
    : null
}

/** La zona de un hueco; nula si la clave no es de un hueco conocido. */
export function zonaDelHueco(clave: string | null | undefined): ZonaDeLaUnidad | null {
  return clave !== null && clave !== undefined && esClaveConocida(clave)
    ? ZONA_DEL_HUECO[clave].zona
    : null
}

/**
 * Reparte los huecos que se dibujan (ya filtrados por permisos y reglas) en las tres zonas, cada hueco en su pestaña y cada pestaña en el orden de `ORDEN_DE_HUECOS`. Un hueco de clave
 * desconocida no aparece. Una zona sin huecos queda vacía (la página no la dibuja). La pestaña de un solo hueco lleva su título; «Dinero», siempre el suyo, aunque sólo traiga el margen.
 */
export function zonasDeLaUnidad<H extends ConClave>(huecos: readonly H[]): ZonasDeLaUnidad<H> {
  const ordenados = ORDEN_DE_HUECOS.flatMap((clave) => huecos.filter((h) => h.clave === clave))
  const zonas: ZonasDeLaUnidad<H> = { principal: [], pestanas: [], lateral: [] }
  for (const hueco of ordenados) {
    if (!esClaveConocida(hueco.clave)) continue
    const { zona, pestana } = ZONA_DEL_HUECO[hueco.clave]
    if (zona === 'principal') {
      zonas.principal.push(hueco)
      continue
    }
    const lista = zonas[zona]
    const existente = lista.find((p) => p.clave === pestana)
    if (existente) {
      existente.huecos.push(hueco)
    } else {
      lista.push({
        clave: pestana,
        titulo: pestana === PESTANA_DE_DINERO.clave ? PESTANA_DE_DINERO.titulo : hueco.titulo,
        huecos: [hueco],
      })
    }
  }
  return zonas
}

/**
 * La pestaña con la que abre una zona: la de «subir» (`?subir=documentos`) si la zona tiene Documentos (el drawer necesita su hueco montado); si no, la del hueco de la URL (`?hueco=`) cuando es de
 * esta zona; si no, la primera. Nula si la zona no tiene pestañas.
 */
export function pestanaInicial(
  pestanas: readonly { clave: string }[],
  huecoDeLaUrl: string | null,
  subir: boolean,
): string | null {
  if (subir && pestanas.some((p) => p.clave === 'documentos')) return 'documentos'
  const delHueco = pestanaDelHueco(huecoDeLaUrl)
  if (delHueco !== null && pestanas.some((p) => p.clave === delHueco)) return delHueco
  return pestanas[0]?.clave ?? null
}

/** Todos los huecos de las zonas, otra vez en el orden del panel (`ORDEN_DE_HUECOS`): lo que dibujan los bloques del celular. */
export function enOrdenDelPanel<H extends ConClave>(zonas: ZonasDeLaUnidad<H>): H[] {
  const todos = [
    ...zonas.principal,
    ...zonas.pestanas.flatMap((p) => p.huecos),
    ...zonas.lateral.flatMap((p) => p.huecos),
  ]
  return ORDEN_DE_HUECOS.flatMap((clave) => todos.filter((h) => h.clave === clave))
}
