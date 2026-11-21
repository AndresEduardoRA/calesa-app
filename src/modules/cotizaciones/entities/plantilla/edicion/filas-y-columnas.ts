// El tamaño y el orden de las piezas del editor de la tarjeta: el ancho de una columna (24 a 640 px; el total, hasta 1.600, lo mide el tope), el alto de una fila (16
// a 240 px), cuándo se oculta una fila (según el nodo que la decide o según sus condiciones) y moverla de lugar. Una fila que es parte de una combinación vertical no se mueve, ni va a caer
// dentro de una: la partiría. Puro.
import {
  ALTO_DE_FILA,
  ANCHO_DE_COLUMNA,
  MAXIMO_DE_CONDICIONES,
  type CondicionDeLaTarjeta,
  type FilaDeLaTarjeta,
  type OcultarPorNodo,
  type OcultarSi,
  type PlantillaEnCuadricula,
} from '../../cuadricula-de-la-tarjeta'
import { letraDeColumna } from './columnas'
import { medido } from './limites'
import { mapaDeLaGrilla, rectDeLaCelda } from './mapa-de-la-grilla'
import { rechazo, type ResultadoDeEdicion } from './tipos'

export const MOTIVO_DEL_ANCHO = 'El ancho va de 24 a 640 px.'
export const MOTIVO_DEL_ALTO = 'El alto va de 16 a 240 px.'
export const MOTIVO_SIN_NODO = 'Elige el nodo que decide si la fila se oculta.'
export const MOTIVO_DE_LAS_CONDICIONES_DE_LA_FILA = 'Una fila se oculta con 1 a 3 condiciones.'

const enRango = (n: number, { minimo, maximo }: { minimo: number; maximo: number }) =>
  Number.isFinite(n) && n >= minimo && n <= maximo

export function anchoDeColumna(
  p: PlantillaEnCuadricula,
  k: number,
  ancho: number,
): ResultadoDeEdicion {
  const columna = p.columnas[k]
  if (columna === undefined) return rechazo('Esa columna no está en la tarjeta.')
  const nuevo = Math.round(ancho)
  if (!enRango(nuevo, ANCHO_DE_COLUMNA)) return rechazo(MOTIVO_DEL_ANCHO)
  const anuncio = `La columna ${letraDeColumna(k)} mide ${String(nuevo)} px.`
  if (nuevo === columna.ancho) return { ok: true, plantilla: p, anuncio }
  const columnas = p.columnas.map((c, i) => (i === k ? { ...c, ancho: nuevo } : c))
  return medido(p, { ok: true, plantilla: { ...p, columnas }, anuncio })
}

export function altoDeFila(p: PlantillaEnCuadricula, f: number, alto: number): ResultadoDeEdicion {
  const fila = p.filas[f]
  if (fila === undefined) return rechazo('Esa fila no está en la tarjeta.')
  const nuevo = Math.round(alto)
  if (!enRango(nuevo, ALTO_DE_FILA)) return rechazo(MOTIVO_DEL_ALTO)
  const anuncio = `La fila ${String(f + 1)} mide ${String(nuevo)} px.`
  if (nuevo === fila.alto) return { ok: true, plantilla: p, anuncio }
  const filas = p.filas.map((x, i) => (i === f ? { ...x, alto: nuevo } : x))
  return medido(p, { ok: true, plantilla: { ...p, filas }, anuncio })
}

const ANUNCIO_DE_OCULTAR: Readonly<Record<OcultarSi, string>> = {
  nunca: 'no se oculta',
  no_aplica: 'se oculta si no aplica',
  no_aplica_o_cero: 'se oculta si no aplica o vale 0',
  condiciones: 'se oculta si se cumplen sus condiciones',
}

// Cuándo se oculta una fila. Con «nunca» la fila no lleva `nodo` (la base lo rechaza aunque sea nulo); con las otras dos, el nodo que la decide es obligatorio.
export function ocultarSi(
  p: PlantillaEnCuadricula,
  f: number,
  ocultar: OcultarPorNodo,
  nodo: string | null,
): ResultadoDeEdicion {
  const fila = p.filas[f]
  if (fila === undefined) return rechazo('Esa fila no está en la tarjeta.')
  if (ocultar !== 'nunca' && (nodo === null || nodo === '')) return rechazo(MOTIVO_SIN_NODO)
  const nueva: FilaDeLaTarjeta =
    ocultar === 'nunca' || nodo === null
      ? { id: fila.id, alto: fila.alto, ocultar_si: 'nunca' }
      : { id: fila.id, alto: fila.alto, ocultar_si: ocultar, nodo }
  const anuncio = `La fila ${String(f + 1)} ${ANUNCIO_DE_OCULTAR[ocultar]}.`
  if (JSON.stringify(nueva) === JSON.stringify(fila)) return { ok: true, plantilla: p, anuncio }
  const filas = p.filas.map((x, i) => (i === f ? nueva : x))
  return medido(p, { ok: true, plantilla: { ...p, filas }, anuncio })
}

// Ocultar una fila según sus condiciones (de 1 a 3, unidas con Y): sin el nodo que la decidía.
export function ocultarSegun(
  p: PlantillaEnCuadricula,
  f: number,
  si: readonly CondicionDeLaTarjeta[],
): ResultadoDeEdicion {
  const fila = p.filas[f]
  if (fila === undefined) return rechazo('Esa fila no está en la tarjeta.')
  if (si.length === 0 || si.length > MAXIMO_DE_CONDICIONES)
    return rechazo(MOTIVO_DE_LAS_CONDICIONES_DE_LA_FILA)
  const nueva: FilaDeLaTarjeta = { id: fila.id, alto: fila.alto, ocultar_si: 'condiciones', si }
  const anuncio = `La fila ${String(f + 1)} ${ANUNCIO_DE_OCULTAR.condiciones}.`
  if (JSON.stringify(nueva) === JSON.stringify(fila)) return { ok: true, plantilla: p, anuncio }
  const filas = p.filas.map((x, i) => (i === f ? nueva : x))
  return medido(p, { ok: true, plantilla: { ...p, filas }, anuncio })
}

// Las combinaciones verticales (más de una fila), con sus filas `[a, b]`.
function combinacionesVerticales(p: PlantillaEnCuadricula): [number, number][] {
  const mapa = mapaDeLaGrilla(p)
  return p.celdas.flatMap((c): [number, number][] => {
    const r = rectDeLaCelda(mapa, c)
    return r !== null && r.f1 > r.f0 ? [[r.f0, r.f1]] : []
  })
}

// Mover una fila (con sus celdas, que la nombran por id) al lugar `hasta`.
export function moverFila(
  p: PlantillaEnCuadricula,
  desde: number,
  hasta: number,
): ResultadoDeEdicion {
  const fila = p.filas[desde]
  if (fila === undefined || hasta < 0 || hasta >= p.filas.length)
    return rechazo('Esa fila no está en la tarjeta.')
  const n = desde + 1
  const verticales = combinacionesVerticales(p)
  const suya = verticales.find(([a, b]) => a <= desde && desde <= b)
  if (suya !== undefined)
    return rechazo(
      `La fila ${String(n)} es parte de una combinación de ${String(suya[1] - suya[0] + 1)} filas: sepárala para moverla.`,
    )
  const anuncio = `La fila ${String(n)} pasó al lugar ${String(hasta + 1)}.`
  if (desde === hasta) return { ok: true, plantilla: p, anuncio }
  // En las filas sin la que se mueve, una combinación `[a, b]` se parte si la fila entra en `a < hasta ≤ b`.
  const sinElla = (i: number) => (i < desde ? i : i - 1)
  const partida = verticales.find(([a, b]) => sinElla(a) < hasta && hasta <= sinElla(b))
  if (partida !== undefined)
    return rechazo(
      `La fila ${String(n)} no puede ir dentro de una combinación de ${String(partida[1] - partida[0] + 1)} filas.`,
    )
  const resto = p.filas.filter((_, i) => i !== desde)
  const filas = [...resto.slice(0, hasta), fila, ...resto.slice(hasta)]
  return medido(p, {
    ok: true,
    plantilla: { ...p, filas },
    anuncio,
    seleccion: { tipo: 'filas', desde: hasta, hasta },
  })
}
