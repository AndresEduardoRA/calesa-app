// Combinar y separar celdas del editor de la tarjeta, como Excel: combinar deja la celda de arriba a la izquierda (su id, su contenido y su estilo) abarcando todo
// el rango y quita las demás; separar le quita `abarca_*` y las casillas que libera quedan sin celda. Un rango que corta una combinación no se combina. Puro.
import type { CeldaDeLaTarjeta, PlantillaEnCuadricula } from '../../cuadricula-de-la-tarjeta'
import { idNuevo } from './ids-nuevos'
import { medido } from './limites'
import { celdasConAnclaEn, combinacionesCortadas, mapaDeLaGrilla } from './mapa-de-la-grilla'
import { celdaNueva, combinada, conAbarca, enPlural, idsDeCeldas } from './piezas'
import { rechazo, type Rect, type ResultadoDeEdicion } from './tipos'

export const MOTIVO_DE_LA_COMBINACION_CORTADA =
  'El rango corta una combinación: elige uno que la contenga entera.'

export function combinar(p: PlantillaEnCuadricula, r: Rect): ResultadoDeEdicion {
  if (r.f0 === r.f1 && r.k0 === r.k1) return rechazo('Elige más de una celda para combinar.')
  const mapa = mapaDeLaGrilla(p)
  if (combinacionesCortadas(mapa, p, r).length > 0) return rechazo(MOTIVO_DE_LA_COMBINACION_CORTADA)
  const enR = celdasConAnclaEn(mapa, p, r)
  const queda = enR.find((c) => c.rect.f0 === r.f0 && c.rect.k0 === r.k0)
  const quitadas = new Set(enR.filter((c) => c !== queda).map((c) => c.indice))
  const conContenido = enR.filter((c) => c !== queda && c.celda.contenido.tipo !== 'vacio').length
  const filas = r.f1 - r.f0 + 1
  const columnas = r.k1 - r.k0 + 1
  const base =
    queda?.celda ??
    celdaNueva(
      p,
      idNuevo('c', idsDeCeldas(p)),
      { f: r.f0, k: r.k0 },
      { contenido: { tipo: 'vacio' } },
    )
  const nueva = conAbarca(base, filas, columnas)
  const celdas = p.celdas.flatMap((c, i): CeldaDeLaTarjeta[] => {
    if (quitadas.has(i)) return []
    return queda !== undefined && i === queda.indice ? [nueva] : [c]
  })
  const casillas = filas * columnas
  const anuncio =
    conContenido === 0
      ? `Se combinaron ${String(casillas)} celdas.`
      : `Se combinaron ${String(casillas)} celdas. Se quitó el contenido de ${String(conContenido)}.`
  return medido(p, {
    ok: true,
    plantilla: { ...p, celdas: queda === undefined ? [...celdas, nueva] : celdas },
    anuncio,
    seleccion: { tipo: 'celdas', ancla: { f: r.f0, k: r.k0 }, foco: { f: r.f0, k: r.k0 } },
  })
}

export function separar(p: PlantillaEnCuadricula, r: Rect): ResultadoDeEdicion {
  const mapa = mapaDeLaGrilla(p)
  const aSeparar = new Set(
    celdasConAnclaEn(mapa, p, r)
      .filter((c) => combinada(c.celda))
      .map((c) => c.indice),
  )
  if (aSeparar.size === 0) return rechazo('No hay celdas combinadas en lo elegido.')
  const celdas = p.celdas.map((c, i) => (aSeparar.has(i) ? conAbarca(c, 1, 1) : c))
  return medido(p, {
    ok: true,
    plantilla: { ...p, celdas },
    anuncio: enPlural(aSeparar.size, 'Se separó la celda.', 'Se separaron N celdas.'),
  })
}
