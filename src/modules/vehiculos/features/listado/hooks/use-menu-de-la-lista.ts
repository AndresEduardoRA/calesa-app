'use client'

import { PANEL_ACTUALIZAR_LOS_DATOS, PANEL_DE_IMAGENES } from '../../acciones/claves'
import { usePanelConVehiculo } from '../../acciones/hooks/use-panel-con-vehiculo'
import { PANEL_DE_VITRINA } from '../../vitrina/claves'
import { paraElMenuDe, type DatosDelMenuDeLaLista } from '../components/tipos'

// Lo que el «⋯» de cada fila necesita, armado una vez por lista: lo que resolvió la página y un hook por panel (las filas reciben con qué abrirlo y
// ninguna suma hooks). Devuelve también los paneles, que la lista monta una vez.
export function useMenuDeLaLista(datos: DatosDelMenuDeLaLista) {
  const imagenes = usePanelConVehiculo(PANEL_DE_IMAGENES, { shallow: false })
  const vitrina = usePanelConVehiculo(PANEL_DE_VITRINA, { shallow: false })
  const actualizar = usePanelConVehiculo(PANEL_ACTUALIZAR_LOS_DATOS, { shallow: true })
  const menu = paraElMenuDe(datos, {
    abrirImagenes: imagenes.abrir,
    abrirVitrina: vitrina.abrir,
    abrirActualizar: actualizar.abrir,
  })
  return { menu, paneles: { imagenes, vitrina, actualizar } }
}
