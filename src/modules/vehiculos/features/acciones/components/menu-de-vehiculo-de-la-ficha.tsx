'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import type { AvisosDelMenu } from '../../../entities/avisos-de-vehiculo'
import { ofertasDelMenuDeVehiculo } from '../../../entities/ofertas-del-menu-de-vehiculo'
import type { PermisoDePapelera } from '../../../entities/papelera-permiso'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { usePanelDeVitrina } from '../../vitrina/hooks/use-panel-de-vitrina'
import { PANEL_ACTUALIZAR_LOS_DATOS, PANEL_DE_IMAGENES } from '../claves'
import { usePanelConVehiculo } from '../hooks/use-panel-con-vehiculo'
import { MenuDeVehiculo } from './menu-de-vehiculo'

type Props = {
  vehiculo: {
    id: string
    titulo: string
    origenId: string
    actualizadoEn: string
    publicadoWeb: boolean
  }
  publicar: PermisoDeVitrina
  papelera: PermisoDePapelera
  // Si quien mira edita este vehículo (la base) y si edita en su origen (sin editarlo, «propios»: apagado con el motivo).
  editable: boolean
  editaEnElOrigen: boolean
  // La hoja de cotizar con este vehículo (`rutaParaCotizar()`), o null si quien mira no cotiza en su origen.
  paraCotizar: string | null
  // `/actividad` de este vehículo, sólo con `actividad.ver` (la arma la página: `vehiculos` no conoce `actividad`); null si no la ve.
  paraActividad: string | null
  // En un origen de subasta con apibara encendida: si tiene con qué consultar. null = no aplica.
  subasta: { consultable: boolean } | null
  // Qué ofrecer si la base rechaza el envío; `paraActividad` se suma por dentro.
  avisos: Omit<AvisosDelMenu, 'paraActividad'>
}

// El «⋯» de la ficha de un vehículo, con la lista única (la misma de la fila y la tarjeta). «Publicar en la web…» abre el panel de la vitrina de la
// ficha y se ve siempre: sin el permiso, apagada y con el motivo. «Editar imágenes» y «Actualizar los datos» abren lo suyo (`?panel=imagenes`,
// `?panel=actualizar-datos`). Enviar a la papelera lleva al inventario, porque la ficha ya no existe para nadie.
export function MenuDeVehiculoDeLaFicha(props: Props) {
  const { vehiculo, publicar, papelera, paraActividad, avisos } = props
  const router = useRouter()
  const vitrina = usePanelDeVitrina()
  const imagenes = usePanelConVehiculo(PANEL_DE_IMAGENES, { shallow: false })
  const actualizar = usePanelConVehiculo(PANEL_ACTUALIZAR_LOS_DATOS, { shallow: true })
  const ofertas = ofertasDelMenuDeVehiculo({
    cotizar: props.paraCotizar !== null,
    edicion: props.editable ? 'editable' : props.editaEnElOrigen ? 'propios' : 'sin_permiso',
    publicar,
    subasta: props.subasta,
    actividad: paraActividad !== null,
    papelera,
  })
  return (
    <MenuDeVehiculo
      vehiculo={vehiculo}
      ofertas={ofertas}
      papelera={papelera}
      paraCotizar={props.paraCotizar}
      paraActividad={paraActividad}
      conBorde
      avisos={{ ...avisos, paraActividad }}
      alPublicar={vitrina.abrir}
      alEditarImagenes={() => {
        imagenes.abrir()
      }}
      alActualizar={() => {
        actualizar.abrir()
      }}
      alEnviado={() => {
        router.push(`${RUTAS.vehiculos}?origen=${vehiculo.origenId}` as Route)
      }}
    />
  )
}
