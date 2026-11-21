// Por qué una fila no se dibuja con la referencia, como lo dice «Ocultas con esta referencia (N)». Puro.
import type { OcultaParaEditar } from '../../vista-previa-de-la-plantilla'

export function textoDeLaOculta(o: Pick<OcultaParaEditar, 'motivo' | 'variante'>): string {
  switch (o.motivo) {
    case 'no_aplica':
      return o.variante === null
        ? 'No aplica en esta cotización'
        : `No aplica en esta cotización: la variante es ${o.variante}`
    case 'cero':
      return 'Vale 0'
    case 'fuera_de_la_version':
      return 'Su nodo no está en la versión de la referencia'
    case 'condicion':
      return 'Se cumplen sus condiciones'
  }
}

export const PARA_EDITAR_UNA_OCULTA = 'Cambia a «Cifras de ejemplo» para verla en el lienzo.'
