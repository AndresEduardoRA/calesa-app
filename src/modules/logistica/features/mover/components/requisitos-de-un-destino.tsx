import {
  detalleDeRequisito,
  etiquetaDeRequisito,
  type RequisitoVista,
} from '@/modules/flujos/client'
import { accionesADibujar } from '../../../entities/mover/acciones-a-dibujar'
import type { AccionesDeQueFalta } from '../hooks/use-acciones-de-que-falta'
import { BotonesDelRequisito } from './botones-del-requisito'

// Lo que la fase de destino pide, requisito por requisito. El estado se dice con texto («Cumplido» / «Falta»), no sólo con un color o un icono; cada falta lleva lo que la destraba
// (`BotonesDelRequisito`): hacerlo ahí, ir a donde se hace o pedírselo a quien puede.
export function RequisitosDeUnDestino({
  requisitos,
  acciones,
}: {
  requisitos: readonly RequisitoVista[]
  acciones: AccionesDeQueFalta
}) {
  if (requisitos.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">No pide nada para entrar.</p>
    )
  }
  return (
    <ul className="grid gap-2" aria-label="Lo que pide esta fase">
      {requisitos.map((r) => {
        const detalle = detalleDeRequisito(r)
        const etiqueta = etiquetaDeRequisito(r)
        return (
          <li
            key={r.requisitoId}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-sm)"
            data-requisito={r.cumplido ? 'cumplido' : 'falta'}
          >
            <span
              className={
                r.cumplido
                  ? 'font-medium text-(--color-positivo-ink)'
                  : 'font-medium text-(--color-peligro-ink)'
              }
            >
              {r.cumplido ? 'Cumplido' : 'Falta'}
            </span>
            <span className="min-w-0 break-words text-(--color-ink)">{etiqueta}</span>
            {detalle ? <span className="text-(--color-ink-soft)">{detalle}</span> : null}
            <span className="text-(--color-ink-faint)">
              {r.bloqueante ? 'Obligatorio' : 'Informativo'}
            </span>
            {r.cumplido ? null : (
              <BotonesDelRequisito
                dibujar={accionesADibujar(acciones.resueltas[r.requisitoId], acciones.lugar)}
                etiqueta={etiqueta}
                requisitoId={r.requisitoId}
                hacer={acciones.hacer}
                idSinConexion={acciones.idSinConexion}
              />
            )}
          </li>
        )
      })}
    </ul>
  )
}
