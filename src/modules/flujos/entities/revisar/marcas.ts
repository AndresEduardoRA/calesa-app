// Los avisos de «Revisar» puestos sobre el diagrama y la lista (`MarcasDelDiagrama`, del núcleo): un aviso con fase va a su fase; un `salida_a_jubilada`
// marca además las salidas de esa fase hacia jubiladas; uno sin fase (o de una fase que no se leyó) es «del flujo». La base no dice de qué salida es un
// `rol_sin_personas`: queda en su fase (no se adivina por el texto). La información se conserva (el resumen no la cuenta). Sin I/O.
import type { FlujoParaConfigurar } from '../flujo'
import type { MarcaDelDiagrama, MarcasDelDiagrama } from '../marcas-del-diagrama'
import type { AvisoDeRevision } from './avisos'

export const CODIGO_SALIDA_A_JUBILADA = 'salida_a_jubilada'

function sumar(mapa: Map<string, MarcaDelDiagrama[]>, clave: string, marca: MarcaDelDiagrama) {
  mapa.set(clave, [...(mapa.get(clave) ?? []), marca])
}

export function marcasDeRevision(
  avisos: readonly AvisoDeRevision[],
  flujo: Pick<FlujoParaConfigurar, 'fases' | 'transiciones'>,
  estado: MarcasDelDiagrama['estado'] = 'leido',
): MarcasDelDiagrama {
  const fases = new Map(flujo.fases.map((f) => [f.id, f]))
  const porFase = new Map<string, MarcaDelDiagrama[]>()
  const porSalida = new Map<string, MarcaDelDiagrama[]>()
  const delFlujo: MarcaDelDiagrama[] = []
  for (const aviso of avisos) {
    const marca = { nivel: aviso.nivel, mensaje: aviso.mensaje }
    if (aviso.faseId === null || !fases.has(aviso.faseId)) {
      delFlujo.push(marca)
      continue
    }
    sumar(porFase, aviso.faseId, marca)
    if (aviso.codigo === CODIGO_SALIDA_A_JUBILADA) {
      for (const t of flujo.transiciones) {
        if (t.deFaseId === aviso.faseId && fases.get(t.aFaseId)?.activa === false) {
          sumar(porSalida, t.id, marca)
        }
      }
    }
  }
  return { estado, porFase, porSalida, delFlujo }
}
