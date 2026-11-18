// Lo que la pantalla de colores (nombre técnico heredado: `tonos`) decide sin I/O: qué panel abre la URL, si abre, si hay algo escrito y la firma con que se siembra la lista local.
import {
  HEX_DE_UN_COLOR_NUEVO,
  normalizarNombreDeTono,
  type ListaDeTonos,
  type Tono,
} from './tonos'

export const PANEL_NUEVO_TONO = 'nuevo-tono'
export const PANEL_EDITAR_TONO = 'editar-tono'
// La confirmación de eliminar uno (`?panel=eliminar-tono&tono=<id>`). Las URL conservan el nombre técnico.
export const PANEL_ELIMINAR_TONO = 'eliminar-tono'
// El id del color que se edita o se elimina, en la URL.
export const CLAVE_DE_TONO = 'tono'

export const MOTIVO_DE_TONO_NO_DISPONIBLE = 'Ese color ya no existe. Recarga para ver cómo quedó.'

export const tonoPorId = (tonos: readonly Tono[], id: string | null): Tono | null =>
  id === null ? null : (tonos.find((t) => t.id === id) ?? null)

export const alTopeDeTonos = (lista: ListaDeTonos): boolean => lista.tonos.length >= lista.tope

// El mismo texto que la base da al crear con el tope lleno.
export const textoDelTopeDeTonos = (tope: number): string =>
  `Ya hay ${String(tope)} colores, que es el máximo. Elimina uno que ningún grupo use.`

// Cambia si otra persona (o «Recargar») trae otra versión: la lista local se vuelve a sembrar.
export const firmaDeTonos = (lista: ListaDeTonos): string =>
  `${lista.tope}|${lista.tonos.map((t) => `${t.id}@${t.actualizadoEn}`).join('|')}`

// Por qué `?panel=nuevo-tono` o `?panel=editar-tono&tono=<id>` no abre (se revisa una vez, al llegar).
export function motivoParaNoAbrirTono(
  lista: ListaDeTonos,
  modo: 'nuevo' | 'editar' | null,
  id: string | null,
): string | null {
  if (modo === 'nuevo') return alTopeDeTonos(lista) ? textoDelTopeDeTonos(lista.tope) : null
  if (modo === 'editar') return tonoPorId(lista.tonos, id) ? null : MOTIVO_DE_TONO_NO_DISPONIBLE
  return null
}

export function motivoParaNoEliminarTono(tonos: readonly Tono[], id: string | null): string | null {
  return tonoPorId(tonos, id) ? null : MOTIVO_DE_TONO_NO_DISPONIBLE
}

// Si cerrar ahora perdería algo escrito: el nombre o un hex distinto del color (o, al crear, del color de partida).
export function hayCambiosEnElTono(original: Tono | null, nombre: string, hex: string): boolean {
  const base = original?.hex ?? HEX_DE_UN_COLOR_NUEVO
  return (
    normalizarNombreDeTono(nombre) !== (original?.nombre ?? '') || hex.trim().toLowerCase() !== base
  )
}
