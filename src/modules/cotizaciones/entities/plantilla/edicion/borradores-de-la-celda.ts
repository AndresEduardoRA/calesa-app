// Lo que el panel del editor arma antes de mandarlo a la cuadrícula: la lista de respaldo (con huecos), las ramas de unas condiciones (con condiciones y contenidos a
// medio armar) y las condiciones de una fila. Se arman desde lo que la celda o la fila tiene y vuelven a la cuadrícula sólo enteras (`completar…()`): lo incompleto
// queda en el panel con su motivo en su lugar y la celda no cambia (glosario: «Lista de respaldo», «Condiciones de la tarjeta»). Las operaciones respetan los topes
// de la forma 2: hasta 5 datos, 4 ramas más el «si no» y 3 condiciones por rama o fila. Puro.
import {
  DATOS_DEL_RESPALDO,
  MAXIMO_DE_CONDICIONES,
  MAXIMO_DE_RAMAS,
  type CondicionDeLaTarjeta,
  type ContenidoDeLaCelda,
  type ContenidoSimple,
  type DatoDeLaCelda,
  type RamaDeLaTarjeta,
} from '../../cuadricula-de-la-tarjeta'
import {
  borradorDeLaCondicion,
  CONDICION_VACIA,
  condicionCompleta,
  MOTIVOS_DE_LAS_CONDICIONES,
  primerDato,
  MINIMOS_DE_LAS_CONDICIONES,
  TOPES_DE_LAS_CONDICIONES,
  type Completado,
  type CondicionEnBorrador,
} from './condiciones'
import { motivoDelTexto } from './contenido'

export type RespaldoEnBorrador = { readonly datos: readonly (DatoDeLaCelda | null)[] }

// Lo que muestra una rama o el «si no»: un texto, un dato (o el hueco de uno) o nada.
export type SimpleEnBorrador =
  | { readonly tipo: 'texto'; readonly texto: string }
  | { readonly tipo: 'dato'; readonly dato: DatoDeLaCelda | null }
  | { readonly tipo: 'vacio' }

export type RamaEnBorrador = {
  readonly si: readonly CondicionEnBorrador[]
  readonly contenido: SimpleEnBorrador
}

export type CondicionesEnBorrador = {
  readonly ramas: readonly RamaEnBorrador[]
  readonly si_no: SimpleEnBorrador
}

// Las ramas antes del «si no»: con él, hasta 5.
export const MAXIMO_DE_RAMAS_CON_SI = MAXIMO_DE_RAMAS - 1

// Mover, quitar y cambiar un elemento de una lista; fuera de rango, la lista igual.
export function moverEn<T>(xs: readonly T[], i: number, hacia: -1 | 1): readonly T[] {
  const j = i + hacia
  const x = xs[i]
  const y = xs[j]
  if (x === undefined || y === undefined) return xs
  return xs.map((z, k) => (k === i ? y : k === j ? x : z))
}
export const quitarDe = <T>(xs: readonly T[], i: number): readonly T[] =>
  xs.filter((_, k) => k !== i)
export const cambiarEn = <T>(xs: readonly T[], i: number, x: T): readonly T[] =>
  xs.map((z, k) => (k === i ? x : z))

// Todos o ninguno: los valores si ninguno es nulo.
function todos<T>(xs: readonly (T | null)[]): T[] | null {
  const llenos = xs.filter((x): x is T => x !== null)
  return llenos.length === xs.length ? llenos : null
}

// La lista de lo que la celda tiene: la suya o, desde otro contenido, su primer dato y un hueco.
export function borradorDeRespaldo(c: ContenidoDeLaCelda | null): RespaldoEnBorrador {
  if (c?.tipo === 'respaldo') return { datos: c.datos }
  return { datos: [primerDato(c), null] }
}

export const motivoParaSumarDato = (b: RespaldoEnBorrador): string | null =>
  b.datos.length >= DATOS_DEL_RESPALDO.maximo ? TOPES_DE_LAS_CONDICIONES.datos : null

export const sumarDato = (b: RespaldoEnBorrador): RespaldoEnBorrador =>
  motivoParaSumarDato(b) === null ? { datos: [...b.datos, null] } : b

// Quitar un dato: la lista lleva al menos dos.
export const motivoParaQuitarDato = (b: RespaldoEnBorrador): string | null =>
  b.datos.length <= DATOS_DEL_RESPALDO.minimo ? MINIMOS_DE_LAS_CONDICIONES.datos : null

export const quitarDato = (b: RespaldoEnBorrador, i: number): RespaldoEnBorrador =>
  motivoParaQuitarDato(b) === null ? { datos: quitarDe(b.datos, i) } : b

export function completarRespaldo(b: RespaldoEnBorrador): Completado<ContenidoDeLaCelda> {
  const motivos = new Map<string, string>()
  b.datos.forEach((d, i) => {
    if (d === null) motivos.set(`datos.${String(i)}`, MOTIVOS_DE_LAS_CONDICIONES.dato)
  })
  if (b.datos.length < DATOS_DEL_RESPALDO.minimo)
    motivos.set('datos', MOTIVOS_DE_LAS_CONDICIONES.dosDatos)
  const datos = todos(b.datos)
  if (motivos.size > 0 || datos === null) return { ok: false, motivos }
  return { ok: true, valor: { tipo: 'respaldo', datos } }
}

const simpleEnBorrador = (c: ContenidoSimple): SimpleEnBorrador =>
  c.tipo === 'dato' ? { tipo: 'dato', dato: c } : c

const RAMA_NUEVA: RamaEnBorrador = {
  si: [CONDICION_VACIA],
  contenido: { tipo: 'texto', texto: '' },
}

// Las condiciones de lo que la celda tiene: las suyas o, desde otro contenido, una rama sin condición que muestra su primer dato (o un texto) y «si no», nada.
export function borradorDeCondiciones(
  c: ContenidoDeLaCelda | null,
  locale: string,
): CondicionesEnBorrador {
  if (c?.tipo === 'condiciones')
    return {
      ramas: c.ramas.map((r) => ({
        si: r.si.map((x) => borradorDeLaCondicion(x, locale)),
        contenido: simpleEnBorrador(r.contenido),
      })),
      si_no: simpleEnBorrador(c.si_no),
    }
  const dato = primerDato(c)
  return {
    ramas: [dato === null ? RAMA_NUEVA : { ...RAMA_NUEVA, contenido: { tipo: 'dato', dato } }],
    si_no: { tipo: 'vacio' },
  }
}

export const motivoParaSumarRama = (b: CondicionesEnBorrador): string | null =>
  b.ramas.length >= MAXIMO_DE_RAMAS_CON_SI ? TOPES_DE_LAS_CONDICIONES.ramas : null

export const sumarRama = (b: CondicionesEnBorrador): CondicionesEnBorrador =>
  motivoParaSumarRama(b) === null ? { ...b, ramas: [...b.ramas, RAMA_NUEVA] } : b

// Quitar una rama: siempre queda una.
export const motivoParaQuitarRama = (b: CondicionesEnBorrador): string | null =>
  b.ramas.length <= 1 ? MINIMOS_DE_LAS_CONDICIONES.ramas : null

export const quitarRama = (b: CondicionesEnBorrador, j: number): CondicionesEnBorrador =>
  motivoParaQuitarRama(b) === null ? { ...b, ramas: quitarDe(b.ramas, j) } : b

export const motivoParaSumarCondicion = (si: readonly CondicionEnBorrador[]): string | null =>
  si.length >= MAXIMO_DE_CONDICIONES ? TOPES_DE_LAS_CONDICIONES.condiciones : null

export const sumarCondicion = (
  si: readonly CondicionEnBorrador[],
): readonly CondicionEnBorrador[] =>
  motivoParaSumarCondicion(si) === null ? [...si, CONDICION_VACIA] : si

// Quitar una condición: siempre queda una.
export const motivoParaQuitarCondicion = (si: readonly CondicionEnBorrador[]): string | null =>
  si.length <= 1 ? MINIMOS_DE_LAS_CONDICIONES.condiciones : null

export const quitarCondicion = (
  si: readonly CondicionEnBorrador[],
  m: number,
): readonly CondicionEnBorrador[] => (motivoParaQuitarCondicion(si) === null ? quitarDe(si, m) : si)

// Lo que muestra una rama, entero: un texto vacío vale (la celda queda en blanco); un dato, elegido.
function simpleCompleto(
  c: SimpleEnBorrador,
  lugar: string,
  motivos: Map<string, string>,
): ContenidoSimple | null {
  if (c.tipo === 'vacio') return c
  if (c.tipo === 'dato') {
    if (c.dato === null) motivos.set(lugar, MOTIVOS_DE_LAS_CONDICIONES.dato)
    return c.dato
  }
  const motivo = motivoDelTexto(c.texto)
  if (motivo !== null) motivos.set(lugar, motivo)
  return motivo === null ? c : null
}

function condicionesCompletas(
  si: readonly CondicionEnBorrador[],
  locale: string,
  lugar: string,
  motivos: Map<string, string>,
): CondicionDeLaTarjeta[] | null {
  return todos(si.map((c, m) => condicionCompleta(c, locale, `${lugar}.${String(m)}`, motivos)))
}

export function completarCondiciones(
  b: CondicionesEnBorrador,
  locale: string,
): Completado<ContenidoDeLaCelda> {
  const motivos = new Map<string, string>()
  const ramas = todos(
    b.ramas.map((r, j): RamaDeLaTarjeta | null => {
      const lugar = `ramas.${String(j)}`
      const si = condicionesCompletas(r.si, locale, `${lugar}.si`, motivos)
      const contenido = simpleCompleto(r.contenido, `${lugar}.contenido`, motivos)
      return si === null || contenido === null ? null : { si, contenido }
    }),
  )
  const siNo = simpleCompleto(b.si_no, 'si_no', motivos)
  if (ramas === null || siNo === null) return { ok: false, motivos }
  return { ok: true, valor: { tipo: 'condiciones', ramas, si_no: siNo } }
}

// Las condiciones de una fila (motivos en `si.<m>.…`).
export function completarSi(
  si: readonly CondicionEnBorrador[],
  locale: string,
): Completado<CondicionDeLaTarjeta[]> {
  const motivos = new Map<string, string>()
  const completas = condicionesCompletas(si, locale, 'si', motivos)
  return completas === null ? { ok: false, motivos } : { ok: true, valor: completas }
}
