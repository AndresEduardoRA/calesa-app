'use client'

import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useApertura } from '@/shared/ui/use-apertura'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { CLAVE_DE_VEHICULO } from '../../../entities/ruta-de-la-hoja'
import {
  MENSAJE_DEL_VEHICULO_NO_VALIDO,
  PANEL_DE_COTIZACIONES_DEL_VEHICULO,
  idDelVehiculoDelModal,
} from '../../../entities/listado/grupos-del-listado'

// El modal de las cotizaciones de un vehículo, en la URL (`?panel=cotizaciones-del-vehiculo&vehiculo=<id>`): sobrevive a recargar, se cierra con «atrás» y se comparte. Se
// revisa una vez, al llegar: un `vehiculo` que no es un id no abre, avisa y limpia la URL. Que el grupo esté o no en la página no lo decide la URL: quien dibuja lo busca.
export function useModalDelGrupo() {
  const url = usePanelPorUrl(PANEL_DE_COTIZACIONES_DEL_VEHICULO, [CLAVE_DE_VEHICULO])
  const apertura = useApertura(url.abierto)
  const vehiculoId = idDelVehiculoDelModal(url.valor(CLAVE_DE_VEHICULO))
  const motivo = vehiculoId === null ? MENSAJE_DEL_VEHICULO_NO_VALIDO : null
  const rechazada = useRevisionAlAbrir(
    url.abierto ? `${String(apertura)}:${vehiculoId ?? ''}` : null,
    motivo,
    url.cerrar,
  )
  return {
    abierto: url.abierto && !rechazada && motivo === null,
    // Cada apertura empieza de cero (la lectura, las casillas): es la `key` de lo que vive dentro.
    apertura,
    vehiculoId,
    abrir: (id: string) => {
      url.abrir({ [CLAVE_DE_VEHICULO]: id })
    },
    cerrar: url.cerrar,
  }
}
