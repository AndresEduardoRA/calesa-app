import { proximoComprobante, type SerieVigente } from '../../../entities/comprobantes/serie'

// La serie vigente y el próximo comprobante, de sólo lectura, arriba del campo para cambiarla.
export function DatosDeLaSerie({ vigente }: { vigente: SerieVigente }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
      <dt className="text-(--color-ink-soft)">Serie vigente</dt>
      <dd className="font-medium text-(--color-ink)" data-serie-vigente="">
        {vigente.serie}
      </dd>
      <dt className="text-(--color-ink-soft)">Próximo comprobante</dt>
      <dd className="font-medium text-(--color-ink)" data-proximo-comprobante="">
        {proximoComprobante(vigente.serie, vigente.ultimo)}
      </dd>
    </dl>
  )
}
