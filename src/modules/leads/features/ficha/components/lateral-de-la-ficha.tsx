'use client'

import type { ReactNode } from 'react'
import { BloqueDeFicha } from '@/shared/ui/ficha-en-bloques'
import type { AccionesDeCartera, PersonaDeCartera } from '../../../entities/cartera'
import type { TipoDeLeadEnCatalogo } from '../../../entities/catalogos'
import type { CampoDeLead } from '../../../entities/campo'
import { ANCLA_DEL_PORTAL } from '../../../entities/bloques-de-la-ficha'
import type { LeadDeFicha } from '../../../entities/ficha'
import { BloqueDeCartera } from '../../cartera/components/bloque-de-cartera'
import { CabeceraDeLead } from './cabecera-de-lead'
import { DatosDeLaFicha } from './datos-de-la-ficha'
import { TelefonosDeLaFicha } from './telefonos-de-la-ficha'

type Props = {
  ficha: LeadDeFicha
  campos: readonly CampoDeLead[]
  origen: { nombre: string; activo: boolean; icono: string | null } | null
  tipo: TipoDeLeadEnCatalogo | null
  // «Editar», «Cotizar» y el «⋯», y las marcas de quien mira: los arma la ficha.
  acciones: ReactNode
  marcas: ReactNode
  // Cartera y `leads.telefonos_extra.editar` sin `leads.editar`: «Editar teléfonos».
  conEditarTelefonos: boolean
  cartera: readonly PersonaDeCartera[]
  accionesDeCartera: AccionesDeCartera
  // «Acceso al portal» (la cartera y `leads.portal.gestionar`; lo compone la página detrás de su `<Suspense>`), o nulo.
  portal: ReactNode
}

// La columna de la izquierda de la ficha, una tarjeta en orden: quién es (nombre, números, marcas y acciones), «Datos», «Teléfonos»,
// «Quién lo tiene» y, para quien lo gestiona, «Acceso al portal» (a la vista en escritorio; en el celular, antes que los bloques).
export function LateralDeLaFicha({
  ficha,
  campos,
  origen,
  tipo,
  acciones,
  marcas,
  conEditarTelefonos,
  cartera,
  accionesDeCartera,
  portal,
}: Props) {
  return (
    <>
      <CabeceraDeLead ficha={ficha} acciones={acciones} marcas={marcas} />
      <DatosDeLaFicha ficha={ficha} campos={campos} origen={origen} tipo={tipo} />
      <TelefonosDeLaFicha ficha={ficha} conEditarTelefonos={conEditarTelefonos} />
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
