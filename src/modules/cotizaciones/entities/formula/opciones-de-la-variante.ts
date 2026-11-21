// Las opciones de una variante tal como se editan en «Tipo de celda › Variante» y como se guardan. Una opción que ya estaba conserva su clave (los textos que la
// nombran siguen valiendo); una nueva (clave vacía) la saca de su etiqueta sin chocar con las otras. El título vacío es la etiqueta. Puro.
import { idDeFilaNueva } from './fila-nueva'
import type { OpcionDeLaVariante } from './tipo-de-celda-nodos'

export type OpcionEnBorrador = {
  readonly clave: string
  readonly etiqueta: string
  readonly titulo: string
}

export type VarianteEnBorrador = {
  readonly opciones: readonly OpcionEnBorrador[]
  // La posición de la opción por defecto (una nueva aún no tiene clave), o nula.
  readonly porDefecto: number | null
  readonly enPar: boolean
}

export const OPCION_NUEVA: OpcionEnBorrador = { clave: '', etiqueta: '', titulo: '' }

// «Se cotiza en par» (glosario: «Variante en par»): sólo una variante de dos opciones (`par_sin_dos_opciones`). Desmarcada, el nodo no lleva la clave.
export const MOTIVO_SIN_DOS_OPCIONES = 'Sólo una variante de dos opciones se cotiza en par.'

// La clave de una opción nueva: como el id de una fila, pero sin el prefijo `fila_` (si no empieza por una letra, `opcion_`).
const claveDe = (etiqueta: string, ocupadas: ReadonlySet<string>) =>
  idDeFilaNueva(/^\p{L}/u.test(etiqueta) ? etiqueta : `opcion ${etiqueta}`, ocupadas)

export function opcionesParaGuardar(opciones: readonly OpcionEnBorrador[]): OpcionDeLaVariante[] {
  const ocupadas = new Set(opciones.map((o) => o.clave).filter((c) => c !== ''))
  return opciones.map((o) => {
    const etiqueta = o.etiqueta.trim()
    const titulo = o.titulo.trim() === '' ? etiqueta : o.titulo.trim()
    if (o.clave !== '') return { clave: o.clave, etiqueta, titulo }
    const clave = claveDe(etiqueta, ocupadas)
    ocupadas.add(clave)
    return { clave, etiqueta, titulo }
  })
}

// El pedido de «Variante» (la opción por defecto, por su clave ya resuelta).
export function pedidoDeLaVariante(v: VarianteEnBorrador) {
  const opciones = opcionesParaGuardar(v.opciones)
  const porDefecto = v.porDefecto === null ? undefined : opciones[v.porDefecto]?.clave
  return {
    tipo: 'variante' as const,
    opciones,
    ...(porDefecto === undefined ? {} : { porDefecto }),
    ...(v.enPar ? { enPar: true } : {}),
  }
}

// Lo que el panel muestra al abrir: las opciones de la variante de antes o dos vacías.
export function varianteInicial(nodo: {
  tipo: string
  opciones?: readonly OpcionDeLaVariante[]
  por_defecto?: string
  en_par?: boolean
}): VarianteEnBorrador {
  if (nodo.tipo !== 'opcion' || nodo.opciones === undefined)
    return { opciones: [OPCION_NUEVA, OPCION_NUEVA], porDefecto: null, enPar: false }
  const i = nodo.opciones.findIndex((o) => o.clave === nodo.por_defecto)
  return {
    opciones: nodo.opciones.map((o) => ({ ...o })),
    porDefecto: i === -1 ? null : i,
    enPar: nodo.en_par === true,
  }
}
