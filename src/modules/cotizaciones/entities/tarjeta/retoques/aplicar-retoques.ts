// Los retoques de una cotización aplicados a la cuadrícula, antes de la geometría (docs/COTIZADOR.md › «Retoques de la tarjeta»). Pura: cambia el texto de las
// celdas de texto que están y, con `ocultarFilas`, quita las filas ocultas reparando las combinaciones (una celda que empieza en una fila oculta pasa a la
// primera que le queda; la que cruza una oculta se acorta; la que se queda sin filas se va). Lo que no aplica (una celda que ya no está o dejó de ser de texto,
// una fila que ya no está) se ignora y se cuenta. Todo se busca por `Map` o `Set`: «constructor» es un id legal.
import type {
  CeldaDeLaTarjeta,
  PlantillaEnCuadricula,
  RetoquesDeLaTarjeta,
} from '../../cuadricula-de-la-tarjeta'
import type { LecturaDeLaTarjeta } from '../lectura-de-la-tarjeta'

export type OpcionesDeAplicar = {
  // Falso en el modo «Retocar»: las filas ocultas se dibujan (atenuadas) para poder mostrarlas otra vez.
  ocultarFilas?: boolean
}

export type RetoquesAplicados = {
  plantilla: PlantillaEnCuadricula
  // Los que aplican, en la forma en que se guardan; nulo si ninguno.
  aplican: RetoquesDeLaTarjeta | null
  // Cuántos no aplican (celdas y filas).
  noAplican: number
}

// Cuántos retoques hay: las celdas y las filas.
export const cuantosRetoques = (r: RetoquesDeLaTarjeta | null): number =>
  r === null ? 0 : Object.keys(r.celdas ?? {}).length + (r.filas_ocultas ?? []).length

// Las celdas de texto con su texto nuevo; las que no aplican, aparte.
function celdasQueAplican(
  plantilla: PlantillaEnCuadricula,
  retoques: RetoquesDeLaTarjeta,
): { textos: Map<string, string>; fuera: number } {
  const tipos = new Map(plantilla.celdas.map((c) => [c.id, c.contenido.tipo]))
  const textos = new Map<string, string>()
  let fuera = 0
  for (const [id, texto] of Object.entries(retoques.celdas ?? {})) {
    if (tipos.get(id) === 'texto') textos.set(id, texto)
    else fuera++
  }
  return { textos, fuera }
}

// Las filas ocultas que están, en el orden de la plantilla (sin repetir); las que no, aparte.
function filasQueAplican(
  plantilla: PlantillaEnCuadricula,
  retoques: RetoquesDeLaTarjeta,
): { ocultas: Set<string>; fuera: number } {
  const pedidas = new Set(retoques.filas_ocultas ?? [])
  const ocultas = new Set(plantilla.filas.filter((f) => pedidas.has(f.id)).map((f) => f.id))
  return { ocultas, fuera: pedidas.size - ocultas.size }
}

// Una celda sin las filas ocultas: su primera fila que queda y cuántas abarca de las que quedan; nula si no le queda ninguna (o nombra una fila que no está).
function sinFilasOcultas(
  c: CeldaDeLaTarjeta,
  filas: PlantillaEnCuadricula['filas'],
  indice: ReadonlyMap<string, number>,
  ocultas: ReadonlySet<string>,
): CeldaDeLaTarjeta | null {
  const desde = indice.get(c.fila)
  if (desde === undefined) return null
  const quedan = filas.slice(desde, desde + (c.abarca_filas ?? 1)).filter((f) => !ocultas.has(f.id))
  const [primera] = quedan
  if (primera === undefined) return null
  const { abarca_filas: _antes, ...resto } = c
  void _antes
  return {
    ...resto,
    fila: primera.id,
    ...(quedan.length > 1 ? { abarca_filas: quedan.length } : {}),
  }
}

function conTexto(c: CeldaDeLaTarjeta, textos: ReadonlyMap<string, string>): CeldaDeLaTarjeta {
  const texto = textos.get(c.id)
  return texto === undefined || c.contenido.tipo !== 'texto'
    ? c
    : { ...c, contenido: { tipo: 'texto', texto } }
}

export function aplicarRetoques(
  plantilla: PlantillaEnCuadricula,
  retoques: RetoquesDeLaTarjeta | null,
  { ocultarFilas = true }: OpcionesDeAplicar = {},
): RetoquesAplicados {
  if (retoques === null) return { plantilla, aplican: null, noAplican: 0 }
  const { textos, fuera: celdasFuera } = celdasQueAplican(plantilla, retoques)
  const { ocultas, fuera: filasFuera } = filasQueAplican(plantilla, retoques)
  const aplican: RetoquesDeLaTarjeta = {
    ...(textos.size > 0 ? { celdas: Object.fromEntries(textos) } : {}),
    ...(ocultas.size > 0 ? { filas_ocultas: [...ocultas] } : {}),
  }
  const conTextos = plantilla.celdas.map((c) => conTexto(c, textos))
  const indice = new Map(plantilla.filas.map((f, i) => [f.id, i]))
  const celdas =
    ocultarFilas && ocultas.size > 0
      ? conTextos.flatMap((c) => {
          const queda = sinFilasOcultas(c, plantilla.filas, indice, ocultas)
          return queda === null ? [] : [queda]
        })
      : conTextos
  return {
    plantilla: {
      ...plantilla,
      filas: ocultarFilas ? plantilla.filas.filter((f) => !ocultas.has(f.id)) : plantilla.filas,
      celdas,
    },
    aplican: textos.size + ocultas.size > 0 ? aplican : null,
    noAplican: celdasFuera + filasFuera,
  }
}

export type LecturaRetocada = {
  lectura: LecturaDeLaTarjeta
  aplican: RetoquesDeLaTarjeta | null
  noAplican: number
}

// La lectura de la tarjeta con los retoques aplicados. La tarjeta por omisión no tiene textos ni filas: todos no aplican.
export function lecturaRetocada(
  lectura: LecturaDeLaTarjeta,
  retoques: RetoquesDeLaTarjeta | null,
  opciones: OpcionesDeAplicar = {},
): LecturaRetocada {
  if (retoques === null) return { lectura, aplican: null, noAplican: 0 }
  if (lectura.estado !== 'lista') {
    return { lectura, aplican: null, noAplican: cuantosRetoques(retoques) }
  }
  const { plantilla, aplican, noAplican } = aplicarRetoques(lectura.definicion, retoques, opciones)
  return { lectura: { ...lectura, definicion: plantilla }, aplican, noAplican }
}
