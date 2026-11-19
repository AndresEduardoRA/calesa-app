// Lo que el lienzo del editor de la plantilla le da a la capa del editor (el hueco de `entities/vista-previa-de-la-plantilla.ts`): de la geometría, sólo el tamaño de la
// tarjeta, las filas que se dibujan con su banda y las ocultas con su motivo. Las celdas dibujadas no cruzan: la capa se posiciona con los anchos de la plantilla y las
// bandas de las filas, y así no repite la regla de qué fila se oculta. Pura.
import type { GeometriaParaEditar } from '../vista-previa-de-la-plantilla'
import type { Geometria } from './geometria-de-la-tarjeta'

export function paraEditar(g: Geometria): GeometriaParaEditar {
  return {
    ancho: g.ancho,
    alto: g.alto,
    filas: g.filas.map((f) => ({ id: f.id, y: f.y, alto: f.alto })),
    ocultas: g.ocultas.map((o) => ({
      fila: o.fila,
      etiqueta: o.etiqueta,
      delNodo: o.delNodo,
      motivo: o.motivo,
      variante: o.variante,
    })),
  }
}
