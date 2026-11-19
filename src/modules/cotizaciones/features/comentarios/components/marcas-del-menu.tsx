'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { ETIQUETA_DE_REPORTAR_SI_YA_REPORTO } from '../../../entities/acciones-de-cotizacion'
import { PANEL_REPORTAR } from '../../../entities/comentarios/marcas-url'
import type { AccionDeModerar } from '../../../entities/comentarios/moderacion'
import { useAporteAlMenu, type AporteAlMenu } from '../../hoja/components/menu-de-la-guardada'
import { useModeracionPorUrl } from '../hooks/use-moderacion-por-url'
import { ConfirmarModeracionDiferido, ModalDeReportarDiferido } from './diferidos-de-marcas'

type Props = {
  cotizacionId: string
  numero: number
  // La versión de la página (el texto de la base): moderar la manda tal cual.
  actualizadoEn: string
  // El motivo del reporte de quien mira; nulo si no la reportó.
  miMotivo: string | null
  // Lo que quien mira puede moderar (vacío si no modera), calculado en el servidor.
  acciones: readonly AccionDeModerar[]
}

// «Reportar…» y las acciones de moderar de la guardada (4.27-4): sus líneas en el «⋯» de la cabecera y sus diálogos. Cada una abre el suyo por la URL (`?panel=reportar`,
// `?panel=moderar&accion=…`); el modal y el Confirmar se cargan la primera vez que se abren.
export function MarcasDelMenu({ cotizacionId, numero, actualizadoEn, miMotivo, acciones }: Props) {
  const reportar = usePanelPorUrl(PANEL_REPORTAR)
  const moderacion = useModeracionPorUrl(acciones)
  const reportarMontado = useAbiertoAlgunaVez(reportar.abierto)
  const moderarMontado = useAbiertoAlgunaVez(moderacion.accion !== null)
  const aporte: AporteAlMenu = {
    reportar: {
      tipo: 'accion',
      abre: true,
      ...(miMotivo === null ? {} : { etiqueta: ETIQUETA_DE_REPORTAR_SI_YA_REPORTO }),
      alElegir: () => {
        reportar.abrir()
      },
    },
    ...Object.fromEntries(
      acciones.map((accion) => [
        accion,
        {
          tipo: 'accion',
          abre: true,
          alElegir: () => {
            moderacion.abrir(accion)
          },
        },
      ]),
    ),
  }
  useAporteAlMenu(aporte)
  return (
    <>
      {reportarMontado ? (
        <ModalDeReportarDiferido
          abierto={reportar.abierto}
          alCerrar={reportar.cerrar}
          cotizacionId={cotizacionId}
          numero={numero}
          miMotivo={miMotivo}
        />
      ) : null}
      {moderarMontado ? (
        <ConfirmarModeracionDiferido
          accion={moderacion.accion}
          alCerrar={moderacion.cerrar}
          cotizacionId={cotizacionId}
          numero={numero}
          actualizadoEn={actualizadoEn}
        />
      ) : null}
    </>
  )
}
