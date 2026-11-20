import { motivoParaNoEliminar, type OrigenConUso } from './origen'

// Las líneas del «⋯» de la página de un origen, en su orden: activar o desactivar (reversible, con «Deshacer») y eliminar (pide confirmar;
// con uso va apagada y una nota dice qué lo ata). Sin `origenes.gestionar` no hay «⋯»: quien lo dibuja no lo monta.
export type LineaDelOrigen =
  | { tipo: 'accion'; clave: 'activar' | 'desactivar'; etiqueta: string }
  | { tipo: 'separador'; clave: 'separador' }
  | { tipo: 'accion'; clave: 'eliminar'; etiqueta: string; deshabilitada: boolean }
  | { tipo: 'nota'; clave: 'motivo'; texto: string }

export function lineasDelOrigen(origen: OrigenConUso): LineaDelOrigen[] {
  const motivo = motivoParaNoEliminar(origen)
  return [
    origen.activo
      ? { tipo: 'accion', clave: 'desactivar', etiqueta: 'Desactivar' }
      : { tipo: 'accion', clave: 'activar', etiqueta: 'Activar' },
    { tipo: 'separador', clave: 'separador' },
    {
      tipo: 'accion',
      clave: 'eliminar',
      etiqueta: 'Eliminar origen',
      deshabilitada: motivo !== null,
    },
    ...(motivo === null ? [] : [{ tipo: 'nota', clave: 'motivo', texto: motivo } as const]),
  ]
}
