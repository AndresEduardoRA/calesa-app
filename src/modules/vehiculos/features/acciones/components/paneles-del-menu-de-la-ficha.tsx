'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { DatosDelPanelDeImagenes } from '../../../entities/paneles-de-la-lista'
import type { Vehiculo } from '../../../entities/vehiculo'
import { PANEL_ACTUALIZAR_LOS_DATOS, PANEL_DE_IMAGENES } from '../claves'
import { usePanelConVehiculo } from '../hooks/use-panel-con-vehiculo'
import {
  ActualizarLosDatosDeLaFichaDiferido,
  PanelDeImagenesDeLaFichaDiferido,
} from './diferidos-de-la-ficha'

type Props = {
  vehiculo: Vehiculo
  // Lo que leyó el servidor si la URL pide `?panel=imagenes`; null si no.
  imagenes: DatosDelPanelDeImagenes | null
  // «Actualizar los datos» se ofrece (subasta con apibara, edita y tiene con qué consultar); quien puede ir a Integraciones.
  actualizar: { puedeConfigurar: boolean } | null
}

// Los paneles del «⋯» de la ficha que no son la vitrina ni la edición: «Editar imágenes» (`?panel=imagenes`, leído en el servidor al abrirse) y
// «Actualizar los datos» (`?panel=actualizar-datos`; sin la acción, la URL a mano no abre nada). Su código llega al abrirse.
export function PanelesDelMenuDeLaFicha({ vehiculo, imagenes, actualizar }: Props) {
  const panelDeImagenes = usePanelConVehiculo(PANEL_DE_IMAGENES, { shallow: false })
  const panelActualizar = usePanelConVehiculo(PANEL_ACTUALIZAR_LOS_DATOS, { shallow: true })
  const montarImagenes = useAbiertoAlgunaVez(panelDeImagenes.abierto)
  const actualizarAbierto = panelActualizar.abierto && actualizar !== null
  const montarActualizar = useAbiertoAlgunaVez(actualizarAbierto)
  return (
    <>
      {montarImagenes ? (
        <PanelDeImagenesDeLaFichaDiferido
          abierto={panelDeImagenes.abierto}
          alCerrar={panelDeImagenes.cerrar}
          esperado={vehiculo.id}
          datos={imagenes}
        />
      ) : null}
      {montarActualizar && actualizar ? (
        <ActualizarLosDatosDeLaFichaDiferido
          abierto={actualizarAbierto}
          alCerrar={panelActualizar.cerrar}
          vehiculo={vehiculo}
          puedeConfigurar={actualizar.puedeConfigurar}
        />
      ) : null}
    </>
  )
}
