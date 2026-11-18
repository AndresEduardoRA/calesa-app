'use client'

import type { ReactNode } from 'react'
import { BloqueDeFicha } from '@/shared/ui/ficha-en-bloques'
import {
  textoDeLaCartera,
  type AccionesDeCartera,
  type PersonaDeCartera,
} from '../../../entities/cartera'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { CampoDeLead } from '../../../entities/campo'
import { edicionDelMenu } from '../../../entities/acciones-de-lead'
import { ANCLA_DEL_PORTAL } from '../../../entities/bloques-de-la-ficha'
import type { LeadDeFicha } from '../../../entities/ficha'
import { BloqueDeCartera } from '../../cartera/components/bloque-de-cartera'
import { useCartera } from '../../cartera/hooks/use-cartera'
import { CabeceraDeLead } from './cabecera-de-lead'
import { DatosClaveDelLead } from './datos-clave-del-lead'

type Props = {
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
  // El «⋯» del lead y las marcas de quien mira: los arma la ficha.
  menu: ReactNode
  marcas: ReactNode
  // Con la cartera: `leads.editar` («Editar» en «Ver más») y `leads.telefonos_extra.editar` (sin el otro, «Editar teléfonos»).
  puedeEditar: boolean
  puedeEditarExtras: boolean
  // Como la leyó la página; la que se mueve vive acá (`useCartera`): la línea de la cabecera y «Quién lo tiene» leen la misma.
  cartera: readonly PersonaDeCartera[]
  accionesDeCartera: AccionesDeCartera
  // «Acceso al portal» (la cartera y `leads.portal.gestionar`; lo compone la página detrás de su `<Suspense>`), o nulo.
  portal: ReactNode
}

// La columna de la izquierda de la ficha, una tarjeta en orden: quién es (nombre con su «⋯», quién lo tiene, números y marcas), los datos
// clave con «Ver más», «Quién lo tiene» y, para quien lo gestiona, «Acceso al portal» (a la vista en escritorio; en el celular, antes que
// los bloques).
export function LateralDeLaFicha({
  ficha,
  campos,
  origen,
  tipo,
  menu,
  marcas,
  puedeEditar,
  puedeEditarExtras,
  cartera: carteraInicial,
  accionesDeCartera,
  portal,
}: Props) {
  const cartera = useCartera(ficha.id, carteraInicial)
  return (
    <>
      <CabeceraDeLead
        ficha={ficha}
        menu={menu}
        cartera={textoDeLaCartera(cartera.cartera)}
        marcas={marcas}
      />
      <DatosClaveDelLead
        {...{ ficha, campos, origen, tipo }}
        edicion={edicionDelMenu({ editar: puedeEditar, telefonos: puedeEditarExtras })}
      />
      <BloqueDeCartera
        lead={{
          id: ficha.id,
          nombre: ficha.nombre,
          numeros: ficha.numeros,
          vehiculosVinculados: ficha.vehiculosVinculados,
          vePortal: portal !== null,
        }}
        cartera={cartera}
        acciones={accionesDeCartera}
      />
      {portal ? (
        <BloqueDeFicha ancla={ANCLA_DEL_PORTAL} titulo="Acceso al portal" lado="lateral">
          {portal}
        </BloqueDeFicha>
      ) : null}
    </>
  )
}
