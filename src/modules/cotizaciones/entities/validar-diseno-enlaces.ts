// §7 de `validarDiseno()`: la URL de cada enlace de la ayuda de una celda (docs/GLOSARIO.md › «Ayuda (de una celda)») empieza con `https://`
// y sigue con ASCII imprimible sin espacios. El espejo de `_diseno_enlaces()`: el primero que falla, en el orden del diseño, con `donde` = el
// nodo de la celda.
import { URL_DE_ENLACE, type Diseno } from './diseno'
import { recorrer } from './medidor'
import { fallo, type FalloDeDiseno } from './motivos-de-diseno'
import type { Indice } from './validar-diseno-contexto'

export function revisarEnlaces(ix: Indice, d: Diseno): FalloDeDiseno | undefined {
  for (const s of recorrer(d.secciones, ix.m)) {
    for (const it of recorrer(s.items, ix.m)) {
      if (it.tipo !== 'celda' || it.ayuda === undefined || !('texto' in it.ayuda)) continue
      for (const e of recorrer(it.ayuda.enlaces ?? [], ix.m)) {
        if (!URL_DE_ENLACE.test(e.url)) return fallo('ayuda_enlace_no_https', { donde: it.nodo })
      }
    }
  }
  return undefined
}
