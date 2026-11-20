import type { FilaDeValores } from '@/shared/ui/tarjetas-de-ajustes'
import { proximoComprobante, type SerieVigente } from '../../../entities/comprobantes/serie'

// La serie vigente y el próximo comprobante, como valores de la tarjeta (los `data-*` los leen las pruebas).
export function filasDeLaSerie(vigente: SerieVigente): FilaDeValores[] {
  return [
    {
      etiqueta: 'Serie vigente',
      valor: (
        <span className="font-medium" data-serie-vigente="">
          {vigente.serie}
        </span>
      ),
    },
    {
      etiqueta: 'Próximo comprobante',
      valor: (
        <span className="font-medium" data-proximo-comprobante="">
          {proximoComprobante(vigente.serie, vigente.ultimo)}
        </span>
      ),
    },
  ]
}
