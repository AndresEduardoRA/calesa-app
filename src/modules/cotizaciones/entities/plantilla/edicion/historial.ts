// Deshacer y rehacer del editor de la tarjeta: instantáneas inmutables en memoria (la plantilla y la selección de antes de cada paso), con el nombre del paso para
// «Deshacer: combinar». Tope de 100 pasos (se olvida el más viejo). Lo que se escribe en un campo del panel se junta en un solo paso por su clave
// (`texto:<celda>`, `ancho:<columna>`) hasta que cambia la selección (`cortar`). Elegir no es un paso. Puro.
export const TOPE_DEL_HISTORIAL = 100

export type PasoDelHistorial<E> = { readonly estado: E; readonly nombre: string }

export type Historial<E> = {
  // Los estados de antes de cada paso; el último es el del paso más reciente.
  readonly atras: readonly PasoDelHistorial<E>[]
  readonly adelante: readonly PasoDelHistorial<E>[]
  // La clave del último paso, mientras se pueda juntar con el siguiente.
  readonly clave: string | null
}

export function historialNuevo<E>(): Historial<E> {
  return { atras: [], adelante: [], clave: null }
}

// Un paso hecho: `antes` es el estado de antes. Con la misma clave que el último paso (y sin corte entre medio) se junta con él: deshacer vuelve a antes del primero.
export function registrar<E>(
  h: Historial<E>,
  antes: E,
  nombre: string,
  { clave }: { clave?: string } = {},
): Historial<E> {
  if (clave !== undefined && clave === h.clave && h.atras.length > 0) {
    return { ...h, adelante: [] }
  }
  const atras = [...h.atras, { estado: antes, nombre }]
  return {
    atras:
      atras.length > TOPE_DEL_HISTORIAL ? atras.slice(atras.length - TOPE_DEL_HISTORIAL) : atras,
    adelante: [],
    clave: clave ?? null,
  }
}

// Cambió la selección: lo que se escriba después es otro paso.
export const cortar = <E>(h: Historial<E>): Historial<E> =>
  h.clave === null ? h : { ...h, clave: null }

export type Vuelta<E> = {
  readonly historial: Historial<E>
  readonly estado: E
  readonly nombre: string
}

export function deshacer<E>(h: Historial<E>, actual: E): Vuelta<E> | null {
  const paso = h.atras[h.atras.length - 1]
  if (paso === undefined) return null
  return {
    historial: {
      atras: h.atras.slice(0, -1),
      adelante: [...h.adelante, { estado: actual, nombre: paso.nombre }],
      clave: null,
    },
    estado: paso.estado,
    nombre: paso.nombre,
  }
}

export function rehacer<E>(h: Historial<E>, actual: E): Vuelta<E> | null {
  const paso = h.adelante[h.adelante.length - 1]
  if (paso === undefined) return null
  return {
    historial: {
      atras: [...h.atras, { estado: actual, nombre: paso.nombre }],
      adelante: h.adelante.slice(0, -1),
      clave: null,
    },
    estado: paso.estado,
    nombre: paso.nombre,
  }
}

// El nombre de lo que deshacer o rehacer haría («combinar»), o nulo si no hay.
export const loQueSeDeshace = <E>(h: Historial<E>): string | null =>
  h.atras[h.atras.length - 1]?.nombre ?? null
export const loQueSeRehace = <E>(h: Historial<E>): string | null =>
  h.adelante[h.adelante.length - 1]?.nombre ?? null
