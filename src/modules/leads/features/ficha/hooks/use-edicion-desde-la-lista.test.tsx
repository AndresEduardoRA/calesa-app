import { probarLaVuelta } from '@/shared/ui/vuelta-del-foco.soporte'
import { PANEL_EDITAR_LEAD } from '../../../entities/edicion'
import { useEdicionDesdeLaLista } from './use-edicion-desde-la-lista'

type Edicion = ReturnType<typeof useEdicionDesdeLaLista>

const ID = '7d1f3c2a-9b4e-4c1d-8a2f-0e6b5c4d3a21'

// «Editar lead» desde el «⋯» de la lista (`?panel=editar-lead&para=<id>`): tras recargar con el panel abierto, «atrás» devuelve el foco a
// quien lo abrió.
probarLaVuelta({
  hook: 'useEdicionDesdeLaLista',
  usar: useEdicionDesdeLaLista,
  clave: 'panel',
  cerrada: '',
  aperturas: [
    {
      nombre: 'abrir',
      abrir: (edicion: Edicion) => {
        edicion.abrir(ID)
      },
      abierta: `?panel=${PANEL_EDITAR_LEAD}&para=${ID}`,
      abierto: (edicion: Edicion) => edicion.para === ID,
    },
  ],
  cerrar: (edicion) => {
    edicion.cerrar()
  },
})
