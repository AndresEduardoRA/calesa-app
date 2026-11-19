import type { ReactNode } from 'react'
import type { FaseResumen } from '@/modules/flujos'
import type { OrigenResumen } from '@/modules/origenes'
import {
  rutaParaCotizar,
  type AlcanceDeAvisos,
  type ParaCotizar,
  type PermisoDePapelera,
  type PermisoDeVitrina,
  type Vehiculo,
  type VehiculoDelAviso,
  type VistaPreviaDeVitrina,
} from '@/modules/vehiculos'
import {
  BotonDeVitrinaDeLaFicha,
  CabeceraDeVehiculo,
  InsigniaDeVitrina,
  MenuDeVehiculoDeLaFicha,
} from '@/modules/vehiculos/pantallas/ficha'

type Props = {
  vehiculo: Vehiculo
  origen: OrigenResumen
  fase: FaseResumen | null
  // Lo que respondió la base sobre la vitrina; null si no se pudo leer.
  previa: VistaPreviaDeVitrina | null
  publicar: PermisoDeVitrina
  editable: boolean
  papelera: PermisoDePapelera
  // Qué ofrece el aviso si la base rechaza el envío (comprobante, documentos, pagos…): el vehículo con lo que la página resolvió y lo que puede abrir.
  avisos: { vehiculo: VehiculoDelAviso; alcance: AlcanceDeAvisos }
  // `/actividad` de este vehículo, con `actividad.ver` (la arma la página); null si no la ve: «Ver actividad» en el «⋯».
  paraActividad: string | null
  // «Cotizar vehículo»: la hoja de cotizar de su origen, o null si quien mira no cotiza en él.
  paraCotizar: ParaCotizar | null
  // Si edita en el origen (sin editar este vehículo, el «⋯» muestra apagado lo de editar).
  editaEnElOrigen: boolean
  // En un origen de subasta con apibara encendida: si tiene con qué consultar. null = no aplica.
  subasta: { consultable: boolean } | null
  // Los enlaces cortos (logística, repuestos), en la línea de la situación.
  enlaces?: ReactNode
}

// La cabecera de la ficha, arriba de la columna izquierda. Sobre la esquina de la foto, como en la tarjeta de la lista: la vitrina (apagada con el motivo
// si no tiene el permiso) y el «⋯» con la lista única (la misma de la fila y la tarjeta: «Cotizar vehículo» primero, «Editar», «Editar imágenes»…; y,
// separada, enviar a la papelera). No hay «Editar» suelto: está en el «⋯». Bajo el título, la situación y los enlaces cortos.
export function Encabezado(props: Props) {
  const { vehiculo, origen, fase, previa, publicar, editable, papelera, paraActividad, avisos } =
    props
  return (
    <CabeceraDeVehiculo
      vehiculo={vehiculo}
      origen={origen}
      fase={fase}
      insignias={
        previa?.publicado ? (
          <InsigniaDeVitrina
            estado={previa.visible ? 'en_vitrina' : 'no_visible'}
            motivos={previa.motivos}
            origen={origen}
            fase={fase}
          />
        ) : null
      }
      enlaces={props.enlaces}
      sobreLaFoto={
        <>
          <BotonDeVitrinaDeLaFicha vehiculo={vehiculo} permiso={publicar} />
          <MenuDeVehiculoDeLaFicha
            vehiculo={vehiculo}
            publicar={publicar}
            papelera={papelera}
            editable={editable}
            editaEnElOrigen={props.editaEnElOrigen}
            paraCotizar={
              props.paraCotizar === null ? null : rutaParaCotizar(props.paraCotizar, vehiculo.id)
            }
            paraActividad={paraActividad}
            subasta={props.subasta}
            avisos={avisos}
          />
        </>
      }
    />
  )
}
