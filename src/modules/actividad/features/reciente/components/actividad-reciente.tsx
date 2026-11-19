import { Suspense } from 'react'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { TAMANO_DE_ACTIVIDAD_RECIENTE } from '@/shared/lib/paginacion'
import { leerActividadReciente } from '../../../composicion'
import { ErrorDeActividadReciente } from './error-de-actividad-reciente'
import { FilasDelEsqueleto } from './esqueleto-de-actividad-reciente'
import { FilasDeActividadReciente, SinCambiosRecientes } from './filas-de-actividad-reciente'
import { MarcoDeActividadReciente } from './marco-de-actividad-reciente'

type Props = {
  // La tabla y el id del registro (`vehiculos`, `leads`…), como en `rutaDeActividadDe()`.
  tabla: string
  registroId: string
  // Los de la sesión: sin `actividad.ver` no se dibuja nada.
  permisos: Permisos
  // La zona de la empresa y `ajustes_empresa.actividad_dias`.
  zona: string
  diasDeActividad: number
}

// Los últimos cambios de un registro como frases (`docs/UX.md` › «Actividad»), leídos en el servidor tras `<Suspense>` con su esqueleto; sin JS
// propio salvo el «Reintentar» del error. Lo monta `/actividad/reciente`; la ficha del vehículo usa la isla (`ActividadRecienteAlAcercarse`), que no
// pesa en su documento.
export function ActividadReciente(props: Props) {
  if (!puede(props.permisos, 'actividad.ver')) {
    return null
  }
  return (
    <MarcoDeActividadReciente tabla={props.tabla} registroId={props.registroId}>
      <Suspense fallback={<FilasDelEsqueleto />}>
        <Contenido {...props} />
      </Suspense>
    </MarcoDeActividadReciente>
  )
}

async function Contenido({ tabla, registroId, zona, diasDeActividad }: Props) {
  const lectura = await leerActividadReciente(tabla, registroId)
  if (!lectura.ok) {
    return <ErrorDeActividadReciente />
  }
  const filas = lectura.data.filas.slice(0, TAMANO_DE_ACTIVIDAD_RECIENTE)
  if (filas.length === 0) {
    return <SinCambiosRecientes diasDeActividad={diasDeActividad} />
  }
  return (
    <FilasDeActividadReciente tabla={tabla} registroId={registroId} filas={filas} zona={zona} />
  )
}
