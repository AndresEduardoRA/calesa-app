'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { conVuelta } from '@/shared/lib/rutas'
import { MasAcciones } from '@/shared/ui/lista'
import { accionesDeVehiculo } from '../../../entities/acciones-de-vehiculo'
import type { AvisosDelMenu } from '../../../entities/avisos-de-vehiculo'
import {
  soloLasOfertas,
  type OfertasConMotivo,
} from '../../../entities/ofertas-del-menu-de-vehiculo'
import type { PermisoDePapelera } from '../../../entities/papelera-permiso'
import { usePanelDeVehiculo } from '../../alta/hooks/use-panel-de-vehiculo'
import { useEnvioAPapelera } from '../../papelera/hooks/use-envio-a-papelera'
import { lineasDelMenu } from './lineas-del-menu-de-vehiculo'

const sinAccion = () => undefined

type Props = {
  vehiculo: {
    id: string
    titulo: string
    origenId: string
    actualizadoEn: string
    publicadoWeb: boolean
  }
  // Cuándo se ofrece cada acción (`ofertasDelMenuDeVehiculo()`, con lo que sabe la superficie).
  ofertas: OfertasConMotivo
  // La papelera de este vehículo: sus salidas cuando está apagada.
  papelera: PermisoDePapelera
  // «Cotizar vehículo»: la hoja con este vehículo (`rutaParaCotizar()`); al elegirla se le suma `returnTo` = donde se estaba.
  paraCotizar: string | null
  // «Ver actividad»: `/actividad` de este vehículo.
  paraActividad: string | null
  // Lo que abre cada panel donde se dibuja el menú (el inventario con `para=<id>`, la ficha sin él).
  alEditarImagenes?: () => void
  alEditarFechas?: () => void
  alPublicar?: () => void
  alActualizar?: () => void
  // Se envió: el vehículo ya no está donde se miraba (la ficha vuelve al inventario).
  alEnviado?: () => void
  // En una cabecera (la ficha): con borde, como los botones de al lado.
  conBorde?: boolean
  // Sin esto, un envío rechazado dice el motivo y nada más. Con esto, ofrece lo que corresponde a su causa.
  avisos?: AvisosDelMenu
}

// El «⋯» de un vehículo: la lista única (`accionesDeVehiculo()`), igual en la fila, la tarjeta y la ficha, con «Cotizar vehículo» como principal.
// «Enviar a la papelera» se hace sin preguntar y ofrece «Deshacer»; lo que ya se sabe que la base va a rechazar se ve apagado con el motivo. Sin nada
// que ofrecer no se dibuja.
export function MenuDeVehiculo(props: Props) {
  const { vehiculo, ofertas, papelera, paraCotizar, paraActividad, alEnviado, conBorde } = props
  const router = useRouter()
  const panel = usePanelDeVehiculo()
  const envio = useEnvioAPapelera()
  const bloques = accionesDeVehiculo(soloLasOfertas(ofertas))
  if (bloques.length === 0) {
    return null
  }
  const ir = (ruta: string) => {
    router.push(ruta as Route)
  }
  const acciones = lineasDelMenu(bloques, {
    ofertas,
    publicado: vehiculo.publicadoWeb,
    papelera,
    enviando: envio.enCurso,
    // La ruta de vuelta se calcula al elegir: la lista con su consulta de ese momento, o la ficha.
    cotizar: () => {
      if (paraCotizar !== null) {
        ir(conVuelta(paraCotizar, `${window.location.pathname}${window.location.search}`))
      }
    },
    editar: () => {
      panel.editar(vehiculo.id)
    },
    imagenes: props.alEditarImagenes ?? sinAccion,
    fechas: props.alEditarFechas ?? sinAccion,
    publicar: props.alPublicar ?? sinAccion,
    actualizar: props.alActualizar ?? sinAccion,
    verActividad: () => {
      if (paraActividad !== null) {
        ir(paraActividad)
      }
    },
    enviarAPapelera: () => {
      void envio.enviar([vehiculo], props.avisos).then((entro) => {
        if (entro) {
          alEnviado?.()
        }
      })
    },
    ir,
  })
  return (
    <MasAcciones
      nombre={vehiculo.titulo}
      id={vehiculo.id}
      acciones={acciones}
      conBorde={conBorde}
    />
  )
}
