import { Suspense } from 'react'
import { puede, type Permisos } from '@/modules/equipo'
import { getOrigenes } from '@/modules/origenes'
import {
  leerRelacionadosDelVehiculo,
  type AvisosDelMenu,
  type PresentacionDeRelacionados,
} from '@/modules/vehiculos'
import { EsqueletoDeRelacionados } from '@/modules/vehiculos/pantallas/relacionados'
import { paraRelacionadosDe } from './para-relacionados'
import { RelacionadosDelVehiculoConHuecos } from './relacionados-del-vehiculo.client'

type Props = {
  vehiculoId: string
  permisos: Permisos
  lugar: 'ficha' | 'logistica'
  // La ficha: la papelera que ofrece el aviso de desvinculado y lo que ofrece si la base rechaza el envío.
  ofrecerPapelera?: boolean
  avisos?: AvisosDelMenu
  // La ficha lo pide compacto; logística, en una línea de chips.
  presentacion: PresentacionDeRelacionados
}

// «Relacionados» de un vehículo, leído en el servidor (la ficha y la unidad de logística), detrás de su `<Suspense>`. Un error de lectura no tumba la pantalla: el bloque dice «No pudimos cargar los
// relacionados» con «Reintentar». Lo que necesita de `cotizaciones` y `leads` lo arma `paraRelacionadosDe()` con los permisos de quien mira.
export async function RelacionadosDelVehiculoServidor({
  vehiculoId,
  permisos,
  lugar,
  ofrecerPapelera = false,
  avisos,
  presentacion,
}: Props) {
  const [leido, origenes] = await Promise.all([
    leerRelacionadosDelVehiculo(vehiculoId),
    getOrigenes(true),
  ])
  return (
    <RelacionadosDelVehiculoConHuecos
      datos={leido.ok ? leido.data : null}
      vehiculoId={vehiculoId}
      lugar={lugar}
      para={paraRelacionadosDe(permisos, origenes.ok ? origenes.data : [])}
      numeroGlobal={puede(permisos, 'leads.numero_global.ver')}
      ofrecerPapelera={ofrecerPapelera}
      {...(avisos ? { avisos } : {})}
      presentacion={presentacion}
    />
  )
}

// En la ficha del vehículo: el bloque sólo con `leads.ver`, detrás de su `<Suspense>` con el esqueleto del mismo alto.
export function RelacionadosDeLaFicha(props: Omit<Props, 'lugar' | 'presentacion'>) {
  return puede(props.permisos, 'leads.ver') ? (
    <Suspense fallback={<EsqueletoDeRelacionados presentacion="compacta" />}>
      <RelacionadosDelVehiculoServidor {...props} lugar="ficha" presentacion="compacta" />
    </Suspense>
  ) : null
}
