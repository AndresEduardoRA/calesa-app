'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelDeFila } from '@/shared/ui/use-panel-de-fila'
import { useUltimo } from '@/shared/ui/use-ultimo'
import {
  CLAVE_DE_LA_FILA,
  MENSAJE_DE_LA_FILA_NO_DISPONIBLE,
} from '../../../entities/accion-de-fila-en-la-url'
import {
  CLAVE_DE_ACCION,
  PANEL_MODERAR,
  PANEL_REPORTAR,
} from '../../../entities/comentarios/marcas-url'
import type { AccionDeModerar } from '../../../entities/comentarios/moderacion'
import { ConfirmarModeracionDiferido, ModalDeReportarDiferido } from './diferidos-de-marcas'

// Lo que se sabe de una cotización de la página para reportarla o moderarla; el mapa lo arma `src/app` una vez por lectura (las mismas referencias entre renders: `useUltimo`).
export type DatosDeMarcasDeUnaFila = {
  numero: number
  actualizadoEn: string
  // El motivo del reporte de quien mira; nulo si no la reportó.
  miMotivo: string | null
  // Lo que quien mira puede moderar de ella (vacío si no modera).
  acciones: readonly AccionDeModerar[]
}

type Props = { datos: ReadonlyMap<string, DatosDeMarcasDeUnaFila> }

function ReportarDeLaFila({ datos }: Props) {
  const panel = usePanelDeFila(PANEL_REPORTAR, CLAVE_DE_LA_FILA, [], (id) =>
    id !== null && datos.has(id) ? null : MENSAJE_DE_LA_FILA_NO_DISPONIBLE,
  )
  const fila = panel.fila === null ? null : (datos.get(panel.fila) ?? null)
  // Lo último nombrado se conserva mientras el diálogo se cierra (`useUltimo` pide datos estables: el mapa los da).
  const mostrada = useUltimo(panel.abierto ? fila : null)
  const idMostrado = useUltimo(panel.abierto ? panel.fila : null)
  const montar = useAbiertoAlgunaVez(panel.abierto)
  if (!montar || mostrada === null || idMostrado === null) {
    return null
  }
  return (
    <ModalDeReportarDiferido
      abierto={panel.abierto}
      alCerrar={panel.cerrar}
      cotizacionId={idMostrado}
      numero={mostrada.numero}
      miMotivo={mostrada.miMotivo}
    />
  )
}

// La acción de moderar que pide la URL, si la cotización nombrada la ofrece.
function accionPosible(
  datos: Props['datos'],
  id: string | null,
  pedida: string | null,
): AccionDeModerar | null {
  const fila = id === null ? undefined : datos.get(id)
  return fila?.acciones.find((accion) => accion === pedida) ?? null
}

function ModerarDeLaFila({ datos }: Props) {
  const panel = usePanelDeFila(PANEL_MODERAR, CLAVE_DE_LA_FILA, [CLAVE_DE_ACCION], (id, valor) =>
    accionPosible(datos, id, valor(CLAVE_DE_ACCION)) === null
      ? MENSAJE_DE_LA_FILA_NO_DISPONIBLE
      : null,
  )
  const accion = panel.abierto
    ? accionPosible(datos, panel.fila, panel.valor(CLAVE_DE_ACCION))
    : null
  const fila = panel.fila === null ? null : (datos.get(panel.fila) ?? null)
  const mostrada = useUltimo(accion !== null ? fila : null)
  const idMostrado = useUltimo(accion !== null ? panel.fila : null)
  const montar = useAbiertoAlgunaVez(accion !== null)
  if (!montar || mostrada === null || idMostrado === null) {
    return null
  }
  return (
    <ConfirmarModeracionDiferido
      accion={accion}
      alCerrar={panel.cerrar}
      cotizacionId={idMostrado}
      numero={mostrada.numero}
      actualizadoEn={mostrada.actualizadoEn}
    />
  )
}

// Los diálogos de «Reportar…» y de moderar del listado: uno de cada uno por pantalla, en `?panel=reportar&para=<id>` y `?panel=moderar&accion=…&para=<id>`. Son los mismos de la
// guardada, y se piden al abrirse por primera vez. Se revisan una vez al llegar: una cotización que no está en la página, o una acción que ya no se ofrece, avisa y limpia la URL.
export function DialogosDeMarcasDeLaFila({ datos }: Props) {
  return (
    <>
      <ReportarDeLaFila datos={datos} />
      <ModerarDeLaFila datos={datos} />
    </>
  )
}
