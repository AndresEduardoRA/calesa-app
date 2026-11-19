'use client'

import { vehiculoDelAviso } from '../../../entities/avisos-de-vehiculo'
import { ofertasDelMenuDeVehiculo } from '../../../entities/ofertas-del-menu-de-vehiculo'
import { papeleraDelVehiculo } from '../../../entities/papelera-permiso'
import { rutaDelVehiculo } from '../../../entities/ruta-por-vehiculo'
import { rutaParaCotizar } from '../../../entities/ruta-para-cotizar'
import { MenuDeVehiculo } from '../../acciones/components/menu-de-vehiculo'
import { faseDe, type DatosDelOrigen, type FilaDeVehiculo, type ParaElMenuDeLaLista } from './tipos'

type Props = {
  vehiculo: FilaDeVehiculo
  fases: DatosDelOrigen['fases']
  para: ParaElMenuDeLaLista
}

// El «⋯» de una fila o una tarjeta del inventario: la lista única con lo que la página resolvió. «Publicar en la web…» sin el permiso no aparece
// (la ficha lo muestra apagado); publicar, editar imágenes y actualizar los datos abren su panel sin salir de la lista (`?panel=…&para=<id>`).
export function MenuDeFila({ vehiculo, fases, para }: Props) {
  const editable = para.editables.has(vehiculo.id)
  const leadVisible = para.leadsVisibles.has(vehiculo.id)
  const papelera = papeleraDelVehiculo({
    eliminable: para.eliminables.has(vehiculo.id),
    vehiculo,
    fase: faseDe(fases, vehiculo.faseId),
    editable,
    leadVisible,
    alcance: para.alcance,
  })
  const ofertas = ofertasDelMenuDeVehiculo({
    cotizar: para.cotizar !== null,
    edicion: editable ? 'editable' : para.editaEnElOrigen ? 'propios' : 'sin_permiso',
    publicar: para.publicar.estado === 'habilitado' ? para.publicar : null,
    subasta:
      para.consultables === null ? null : { consultable: para.consultables.has(vehiculo.id) },
    actividad: para.paraActividad !== null,
    papelera,
  })
  return (
    <MenuDeVehiculo
      vehiculo={vehiculo}
      ofertas={ofertas}
      papelera={papelera}
      paraCotizar={para.cotizar === null ? null : rutaParaCotizar(para.cotizar, vehiculo.id)}
      paraActividad={
        para.paraActividad === null ? null : rutaDelVehiculo(para.paraActividad, vehiculo.id)
      }
      alEditarImagenes={() => {
        para.abrirImagenes(vehiculo.id)
      }}
      alPublicar={() => {
        para.abrirVitrina(vehiculo.id)
      }}
      alActualizar={() => {
        para.abrirActualizar(vehiculo.id)
      }}
      avisos={{
        vehiculo: vehiculoDelAviso(vehiculo, { editable, leadVisible }),
        alcance: para.alcance,
      }}
    />
  )
}
