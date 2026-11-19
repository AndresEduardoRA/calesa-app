// Lo tipeado de una hoja en par (glosario: «Variante en par»): cada opción tiene sus entradas; lo que se tipea en una celda común vale para las dos y lo de una
// celda en par, sólo para su opción. Al abrir dos hermanas guardadas por separado, lo común puede haber quedado distinto: manda lo de la cotización que se abrió
// (y al guardar queda en las dos). Puro.
import type { Entradas } from './entradas'
import type { SeccionDeHoja } from './hoja'

// Los nodos que la hoja dibuja en par: las celdas (con el porcentaje de su par) y los subtotales con `enPar`.
export function nodosEnParDeLaHoja(secciones: readonly SeccionDeHoja[]): ReadonlySet<string> {
  const nodos = new Set<string>()
  for (const seccion of secciones) {
    for (const item of seccion.items) {
      if (item.tipo === 'celda' && item.enPar) {
        nodos.add(item.nodo)
        if (item.secundario) nodos.add(item.secundario.nodo)
      } else if (item.tipo === 'subtotal' && item.enPar) {
        nodos.add(item.nodo)
      }
    }
  }
  return nodos
}

const soloLoEnPar = <V>(mapa: ReadonlyMap<string, V>, enPar: ReadonlySet<string>) =>
  [...mapa].filter(([id]) => enPar.has(id))
const soloLoComun = <V>(mapa: ReadonlyMap<string, V>, enPar: ReadonlySet<string>) =>
  [...mapa].filter(([id]) => !enPar.has(id))

// Las entradas de una opción con lo común de otra: los nodos en par son los propios; los demás, el modo, las banderas y los atajos comunes, los de `comunes`.
export function conLoComunDe(
  propias: Entradas,
  comunes: Entradas,
  enPar: ReadonlySet<string>,
): Entradas {
  return {
    inputs: new Map([...soloLoComun(comunes.inputs, enPar), ...soloLoEnPar(propias.inputs, enPar)]),
    overrides: new Map([
      ...soloLoComun(comunes.overrides, enPar),
      ...soloLoEnPar(propias.overrides, enPar),
    ]),
    atajos: new Map([...soloLoComun(comunes.atajos, enPar), ...soloLoEnPar(propias.atajos, enPar)]),
    banderas: new Set(comunes.banderas),
    variante: propias.variante,
    modoTc: comunes.modoTc,
  }
}

const mismosMapas = <V>(a: [string, V][], b: [string, V][]) =>
  a.length === b.length && a.every(([id, v]) => b.some(([otro, w]) => otro === id && w === v))

// Si lo común de las dos opciones es lo mismo (el aviso al abrir un par guardado por separado).
export function comunesIguales(a: Entradas, b: Entradas, enPar: ReadonlySet<string>): boolean {
  return (
    mismosMapas(soloLoComun(a.inputs, enPar), soloLoComun(b.inputs, enPar)) &&
    mismosMapas(soloLoComun(a.overrides, enPar), soloLoComun(b.overrides, enPar)) &&
    a.banderas.size === b.banderas.size &&
    [...a.banderas].every((n) => b.banderas.has(n)) &&
    a.modoTc === b.modoTc
  )
}

export const AVISO_DE_LO_COMUN_DISTINTO =
  'Lo común de las dos versiones era distinto: se muestra el de esta y, al guardar, queda en las dos.'
