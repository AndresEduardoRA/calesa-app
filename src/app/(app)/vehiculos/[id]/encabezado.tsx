import type { FaseResumen } from '@/modules/flujos'
import type { OrigenResumen } from '@/modules/origenes'
import {
  type AlcanceDeAvisos,
  type PermisoDePapelera,
  type PermisoDeVitrina,
  type Vehiculo,
  type VehiculoDelAviso,
  type VistaPreviaDeVitrina,
} from '@/modules/vehiculos'
import {
  BotonEditarVehiculo,
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
}

// La cabecera de la ficha, arriba de la columna izquierda, con lo que la persona puede hacer desde ahí: «Editar» y el «⋯» con la lista de siempre (publicar en la
// web, apagado y con el motivo si no tiene el permiso, y, separada, enviar a la papelera). «Ver en logística» va en el bloque «Fase y qué falta».
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
      acciones={
        <>
          {editable ? <BotonEditarVehiculo vehiculo={vehiculo} /> : null}
          <MenuDeVehiculoDeLaFicha
            vehiculo={vehiculo}
            publicar={publicar}
            papelera={papelera}
            paraActividad={paraActividad}
            avisos={avisos}
          />
        </>
      }
    />
  )
}
