// §1b de `validarDiseno()`: lo que la cabecera trae por defecto (docs/GLOSARIO.md › «Modo por defecto», «Modos visibles»), cruzado con sus
// modos (los de §1, ya sin claves repetidas). El espejo de `_diseno_cabecera()`, en el mismo orden: el modo por defecto existe; cada modo
// visible, en orden, existe y no se repite; el modo por defecto efectivo (el escrito o, sin él, el primero) está entre los visibles si la lista
// existe (también vacía); «Ver total» por defecto encendido sólo si la cabecera lo ofrece. Todo rechazo lleva `donde` = `cabecera`.
import type { CabeceraDeDiseno, Diseno } from './diseno'
import { esta, recorrer } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import type { Indice } from './validar-diseno-contexto'

const donde = 'cabecera'

export function revisarCabecera(ix: Indice, d: Diseno): FalloDeDiseno | undefined {
  const cab = d.cabecera
  const claves = new Set<string>()
  for (const m of recorrer(cab.modos, ix.m)) claves.add(m.clave)
  const porDefecto = cab.modo_por_defecto
  if (porDefecto !== undefined && !esta(claves, porDefecto, ix.m)) {
    return fallo('modo_por_defecto_inexistente', { donde, ref: porDefecto })
  }
  const visibles = revisarVisibles(ix, cab, claves)
  if (visibles !== undefined) return visibles
  if (cab.ver_total_bs_por_defecto === true && !cab.ver_total_bs) {
    return fallo('ver_total_bs_por_defecto_no_ofrecido', { donde })
  }
  return undefined
}

function revisarVisibles(
  ix: Indice,
  cab: CabeceraDeDiseno,
  claves: ReadonlySet<string>,
): FalloDeDiseno | undefined {
  if (cab.modos_visibles === undefined) return undefined
  const vistos = new Set<string>()
  for (const c of recorrer(cab.modos_visibles, ix.m)) {
    if (!esta(claves, c, ix.m)) return fallo('modo_visible_inexistente', { donde, ref: c })
    if (esta(vistos, c, ix.m)) return fallo('modo_visible_repetido', { donde, ref: c })
    vistos.add(c)
  }
  const efectivo = cab.modo_por_defecto ?? cab.modos[0]?.clave
  if (efectivo !== undefined && !esta(vistos, efectivo, ix.m)) {
    return fallo('modo_por_defecto_oculto', { donde, ref: efectivo })
  }
  return undefined
}
