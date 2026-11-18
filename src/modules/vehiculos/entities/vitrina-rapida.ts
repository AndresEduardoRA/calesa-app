// Sacar de la web desde la lista (y su «Deshacer»): lo que se manda a `vehiculo_vitrina` a partir de lo que la fila ya tiene guardado. Publicar desde la
// lista abre el panel completo de la vitrina. Sin I/O.
import type { Vehiculo } from './vehiculo'
import type { DatosDeVitrina } from './vitrina'

export type DeLaFila = Pick<
  Vehiculo,
  | 'id'
  | 'titulo'
  | 'actualizadoEn'
  | 'publicadoWeb'
  | 'precioWeb'
  | 'precioWebHasta'
  | 'precioWebNota'
  | 'destacadoWeb'
>

// Lo que la fila ya tiene guardado de la vitrina, con el interruptor como se pide (sacar, o volver a publicar al deshacer). Sacar apaga también el
// destacado, como el panel; el precio, el «hasta» y la nota quedan para la próxima vez.
export function datosDeLaFila(vehiculo: DeLaFila, publicado: boolean): DatosDeVitrina {
  const precio = vehiculo.precioWeb
  return {
    publicado,
    precio,
    precioHasta: precio === null ? null : vehiculo.precioWebHasta,
    nota: vehiculo.precioWebNota,
    destacado: publicado ? vehiculo.destacadoWeb : false,
  }
}
