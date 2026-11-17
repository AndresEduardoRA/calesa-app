// Las marcas de «Revisar» sobre el diagrama y la lista de fases: cada aviso de `revisar_flujo` en su fase, en las salidas que señala o, sin fase, en lo
// «del flujo». Las arma el área `revisar` (`marcasDeRevision`) y las dibuja el núcleo, que no importa áreas: por eso el tipo vive aquí. Sin I/O.
import { formatearNumero } from '@/shared/lib/formato'

export type NivelDeMarca = 'error' | 'aviso' | 'info'

export type MarcaDelDiagrama = { nivel: NivelDeMarca; mensaje: string }

export type MarcasDelDiagrama = {
  // Mientras «Revisar» lee o si falló, una fase sin marcas no está «sin avisos»: no se sabe.
  estado: 'leyendo' | 'leido' | 'fallo'
  porFase: ReadonlyMap<string, readonly MarcaDelDiagrama[]>
  // Por id de transición: las salidas que señala un aviso.
  porSalida: ReadonlyMap<string, readonly MarcaDelDiagrama[]>
  delFlujo: readonly MarcaDelDiagrama[]
}

// Sin el área `revisar` (o fuera de su proveedor), nada que marcar.
export const SIN_MARCAS: MarcasDelDiagrama = {
  estado: 'leido',
  porFase: new Map(),
  porSalida: new Map(),
  delFlujo: [],
}

export type ResumenDeMarcas = { nivel: 'error' | 'aviso'; texto: string }

const contar = (n: number, singular: string, plural: string) =>
  `${formatearNumero(n)} ${n === 1 ? singular : plural}`

// «1 error y 2 avisos», «1 aviso»: lo que se dice de una fase. La información no cuenta (describe, no es un problema), como en la franja: sólo
// información, o nada, es `null`.
export function resumenDeMarcas(marcas: readonly MarcaDelDiagrama[]): ResumenDeMarcas | null {
  const errores = marcas.filter((m) => m.nivel === 'error').length
  const avisos = marcas.filter((m) => m.nivel === 'aviso').length
  if (errores + avisos === 0) return null
  const partes = [
    errores > 0 ? contar(errores, 'error', 'errores') : null,
    avisos > 0 ? contar(avisos, 'aviso', 'avisos') : null,
  ].filter((p) => p !== null)
  return { nivel: errores > 0 ? 'error' : 'aviso', texto: partes.join(' y ') }
}
