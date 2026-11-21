import { Suspense } from 'react'
import { EsqueletoDeActividadReciente } from '@/modules/actividad/pantallas/actividad-reciente'
import type { Permisos } from '@/modules/equipo'
import type { AvisosDelMenu, Vehiculo } from '@/modules/vehiculos'
import { origenesCon } from '@/shared/lib/permisos'
import { BloqueDeFicha } from '@/shared/ui/ficha-en-bloques'
import { RelacionadosDeLaFicha } from '../../_relacionados/relacionados-del-vehiculo'
import { BloqueActividad } from './bloque-actividad'
import { BloqueCotizaciones } from './bloque-cotizaciones'
import type { AnclaDeLaFicha, BloqueDeLaFicha } from './bloques'

type Props = {
  visibles: readonly BloqueDeLaFicha[]
  vehiculo: Vehiculo
  permisos: Permisos
  // «Relacionados»: la papelera que ofrece el aviso de desvinculado y lo que ofrece si la base rechaza el envío.
  ofrecerPapelera: boolean
  avisos: AvisosDelMenu
  // «Cotizar» en el título de «Cotizaciones de este vehículo» (la misma ruta de «Cotización aprobada»), o null sin `cotizaciones.crear`.
  cotizar: string | null
}

// Lo de adentro de cada bloque, con su límite de error. Ninguno espera a acercarse en el marco: las islas de las cotizaciones y de la actividad leen al acercarse solas
// (con su esqueleto) y «Relacionados» lo abre la URL (sus paneles).
function Contenido({
  ancla,
  titulo,
  props,
}: {
  ancla: AnclaDeLaFicha
  titulo: string
  props: Props
}) {
  const { vehiculo, permisos } = props
  switch (ancla) {
    case 'cotizaciones':
      return (
        <BloqueDeFicha ancla={ancla} titulo={titulo}>
          <BloqueCotizaciones
            vehiculo={{ id: vehiculo.id, titulo: vehiculo.titulo }}
            cotizar={props.cotizar}
            aprobarEn={origenesCon(permisos, 'cotizaciones.aprobar')}
          />
        </BloqueDeFicha>
      )
    case 'relacionados':
      return (
        <BloqueDeFicha ancla={ancla} titulo={titulo}>
          <RelacionadosDeLaFicha
            vehiculoId={vehiculo.id}
            permisos={permisos}
            ofrecerPapelera={props.ofrecerPapelera}
            avisos={props.avisos}
          />
        </BloqueDeFicha>
      )
    case 'actividad':
      return (
        <BloqueDeFicha ancla={ancla} titulo={titulo}>
          <Suspense fallback={<EsqueletoDeActividadReciente />}>
            <BloqueActividad vehiculoId={vehiculo.id} />
          </Suspense>
        </BloqueDeFicha>
      )
  }
}

// Los bloques de la derecha de la ficha, en el orden del índice y sólo los que quien mira ve (`bloquesDeQuienMira`). Cada uno con su límite de
// error: uno roto dice «No pudimos cargar «<título>».» con «Reintentar» y los demás siguen. Cada uno trae su región con su `h2` (el que enfoca
// el índice al saltar).
export function BloquesDeLaFicha(props: Props) {
  return (
    <>
      {props.visibles.map((bloque) => (
        <Contenido key={bloque.ancla} ancla={bloque.ancla} titulo={bloque.titulo} props={props} />
      ))}
    </>
  )
}
