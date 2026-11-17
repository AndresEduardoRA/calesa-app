import { Suspense } from 'react'
import { CotizacionesDelLead } from '@/modules/cotizaciones/pantallas/lead'
import { getAjustes } from '@/modules/empresa'
import type { Permisos } from '@/modules/equipo'
import {
  BloqueDeSeguimientos,
  EsqueletoDeOportunidades,
  EsqueletoDePortal,
  EsqueletoDeSeguimientos,
  SeccionOportunidades,
  SeccionPortal,
} from '@/modules/leads/pantallas/ficha'
import { opcionesDeVehiculoDelLead } from '@/modules/vehiculos'
import { EsqueletoDeRelacionados } from '@/modules/vehiculos/pantallas/relacionados'
import { GestionDeVehiculosDelLead } from '@/modules/vehiculos/pantallas/vehiculos-del-lead'
import { leerDireccionPublica } from '@/modules/web'
import { datosO } from '@/shared/lib/errores'
import { RelacionadosDelLeadServidor } from '../../_relacionados/relacionados-del-lead'

type Lead = { id: string; nombre: string }
type LoQueVe = {
  vehiculos: boolean
  oportunidades: boolean
  cotizaciones: boolean
  portal: boolean
}

// Los bloques de la ficha del lead, cada uno detrás de su `<Suspense>` con su esqueleto (del alto de lo que viene: un salto a un bloque
// de abajo no se mueve). Los de `vehiculos`, `cotizaciones`, `empresa` y `web` los compone esta ruta (`leads` no los importa). Uno que quien
// mira no ve es nulo: no se lee ni se dibuja. Los vehículos del lead (para elegir uno en un seguimiento, un recordatorio o una oportunidad)
// se piden una vez y se comparte la promesa (y `lead_vehiculos` se lee una vez por pedido: `cache`).
export function bloquesDeLaFicha(lead: Lead, ve: LoQueVe, permisos: Permisos) {
  const vehiculos = ve.vehiculos ? { vehiculos: opcionesDeVehiculoDelLead(lead.id) } : {}
  return {
    seguimientos: (
      <Suspense fallback={<EsqueletoDeSeguimientos />}>
        <BloqueDeSeguimientos leadId={lead.id} leadNombre={lead.nombre} {...vehiculos} />
      </Suspense>
    ),
    oportunidades: ve.oportunidades ? (
      <Suspense fallback={<EsqueletoDeOportunidades />}>
        <SeccionOportunidades leadId={lead.id} leadNombre={lead.nombre} {...vehiculos} />
      </Suspense>
    ) : null,
    // Relacionados (de un vistazo, con las acciones de cada fila) y, al pie, lo que queda de «Vehículos» (los anteriores, el panel para
    // vincular o marcar uno y la confirmación de desvincular).
    relacionados: ve.vehiculos ? (
      <>
        <Suspense fallback={<EsqueletoDeRelacionados presentacion="compacta" />}>
          <RelacionadosDelLeadServidor leadId={lead.id} permisos={permisos} />
        </Suspense>
        <Suspense fallback={null}>
          <GestionDeVehiculosDelLead leadId={lead.id} leadNombre={lead.nombre} />
        </Suspense>
      </>
    ) : null,
    // Se lee desde el navegador al acercarse a la vista (el marco lo difiere); la `key` empieza de cero con otro lead.
    cotizaciones: ve.cotizaciones ? <CotizacionesDelLead key={lead.id} leadId={lead.id} /> : null,
    // El nombre de la empresa y la dirección de la web los componen `empresa` y `web`.
    portal: ve.portal ? (
      <Suspense fallback={<EsqueletoDePortal />}>
        <SeccionPortal
          leadId={lead.id}
          leadNombre={lead.nombre}
          empresa={getAjustes().then((ajustes) => ajustes.nombre)}
          direccion={leerDireccionPublica().then(datosO)}
        />
      </Suspense>
    ) : null,
  }
}
