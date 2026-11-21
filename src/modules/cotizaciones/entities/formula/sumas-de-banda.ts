// Las filas que suman una banda (`SUMA(<banda>)`, `MAX(<banda>)`, `MIN(<banda>)`) guardan la lista de las filas que la banda tenía al compilarse
// (`expandirGrupo()`). Lo que pone o saca una fila de una banda (insertar, duplicar, arrastrar, «Banda ›», el tipo de celda, el panel de una banda) las
// vuelve a compilar con su texto: la suma es la de la banda que se ve. Con el texto reescrito tras un ⚙ se compila ése, así que el valor ajustado no se pisa.
// Si una no se puede (su texto ya no manda, o una fila de la banda quedaría debajo de ella), el cambio se rechaza con su motivo. Puro y nunca lanza.
import type { CatalogoDeTablas } from '../compilador'
import type { Formula } from '../formula'
import { compilarFilaBase } from './compilar-fila-base'
import { filasDe, type Fila } from './filas'
import { celdaDe, hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { nombrarConLaHoja } from './referencias-a1'
import { textoVigente } from './texto-vigente'

export type SumasDeBanda = { ok: true; formula: Formula } | { ok: false; mensaje: string }

// Las filas de cada banda, en el orden de la fórmula: el orden en que las suma `expandirGrupo()`.
function filasPorBanda(formula: Formula): Map<string, string> {
  const por = new Map<string, string[]>()
  for (const n of formula.definicion.nodos) {
    if (n.grupo === undefined) continue
    por.set(n.grupo, [...(por.get(n.grupo) ?? []), n.id])
  }
  return new Map([...por].map(([g, ids]) => [g, ids.join(' ')]))
}

function bandasQueCambian(antes: Formula, despues: Formula): string[] {
  const a = filasPorBanda(antes)
  const d = filasPorBanda(despues)
  return [...new Set([...a.keys(), ...d.keys()])].filter((g) => a.get(g) !== d.get(g))
}

// La banda que nombra el texto (un nombre suelto, sin distinguir mayúsculas, como el compilador), o nula.
function bandaNombrada(texto: string, bandas: readonly string[]): string | null {
  const nombres = new Set(texto.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [])
  return bandas.find((g) => nombres.has(g.toLowerCase())) ?? null
}

type Contexto = { antes: Formula; tablas: CatalogoDeTablas | undefined }

// El texto con que se vuelve a compilar: el de antes del cambio si estaba al día, el reescrito si un ⚙ lo cambió; nulo si ya no mandaba.
function textoParaCompilar(fila: Fila, texto: string, c: Contexto): string | null {
  const v = textoVigente(c.antes, fila.nodo.id, c.tablas === undefined ? {} : { tablas: c.tablas })
  if (v.estado === 'sin_texto') return texto
  return v.estado === 'no_manda' ? null : v.texto
}

// Vuelve a compilar una fila que nombra una banda que cambió, sobre la fórmula como va.
function alDia(formula: Formula, fila: Fila, banda: string, c: Contexto): SumasDeBanda {
  const hoja = hojaDeLaPlanilla(formula)
  const etiqueta = formula.definicion.grupos?.find((g) => g.id === banda)?.etiqueta ?? banda
  const quien = `${celdaDe(hoja, fila.nodo.id) ?? fila.nodo.etiqueta} suma la banda «${etiqueta}»`
  const texto = textoParaCompilar(fila, fila.texto ?? '', c)
  if (texto === null)
    return { ok: false, mensaje: `${quien} y su texto ya no manda: escríbelo otra vez antes.` }
  const r = compilarFilaBase(formula, {
    destino: { existente: fila.nodo.id },
    texto,
    nombrar: nombrarConLaHoja(hoja),
    ...(c.tablas === undefined ? {} : { tablas: c.tablas }),
  })
  if (r.ok) return { ok: true, formula: r.formula }
  const motivo =
    r.error.codigo === 'referencia_hacia_adelante'
      ? 'una fila de la banda quedaría debajo de ella.'
      : r.error.mensaje
  return { ok: false, mensaje: `${quien}: ${motivo}` }
}

export function sumasDeBandaAlDia(
  antes: Formula,
  despues: Formula,
  tablas?: CatalogoDeTablas,
): SumasDeBanda {
  const bandas = bandasQueCambian(antes, despues)
  if (bandas.length === 0) return { ok: true, formula: despues }
  const c: Contexto = { antes, tablas }
  let r: SumasDeBanda = { ok: true, formula: despues }
  for (const fila of filasDe(despues.definicion)) {
    const banda = fila.texto === undefined ? null : bandaNombrada(fila.texto, bandas)
    if (banda === null) continue
    r = alDia(r.formula, fila, banda, c)
    if (!r.ok) return r
  }
  return r
}
