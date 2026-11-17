'use client'

import { useAbrirAltaParaElegir } from '@/modules/leads/pantallas/proyecto-de-repuestos'
import {
  CLAVE_DE_LEAD_DEL_PROYECTO,
  DrawerDeNuevoProyecto,
  type BuscadorDeProyecto,
  type LeadDeLaUrl,
  type LectorDelLeadDelVehiculo,
} from '@/modules/repuestos/pantallas/proyectos-nuevo'
import { leerLeadVinculado } from '@/modules/vehiculos/pantallas/proyecto-de-repuestos'
import { ok } from '@/shared/lib/errores'
import { BuscadorDeLead } from './buscador-de-lead'
import { BuscadorDeVehiculo } from './buscador-de-vehiculo'

export type PropsDelNuevoProyectoAbierto = {
  abierto: boolean
  alCerrar: () => void
  apertura: number
  vehiculoInicial: { id: string; titulo: string } | null
  avisoDelVehiculo: string | null
  // `leads.ver` y `leads.crear`: los decide `page.tsx` con `puede()`.
  puedeVerLeads: boolean
  puedeCrearLeads: boolean
  // Antes de abrir «Nuevo lead»: deja el formulario en la URL (`?nuevo=proyecto`) para que vuelva al cerrar el alta.
  dejarDebajo: () => void
  leadDelAlta: LeadDeLaUrl
}

const buscadorDeVehiculo: BuscadorDeProyecto = (props) => <BuscadorDeVehiculo {...props} />
const buscadorDeLead: BuscadorDeProyecto = (props) => <BuscadorDeLead {...props} />

// El lead vinculado al vehículo, como lo nombra el formulario. Estable (de módulo): el formulario lo usa como dependencia de su lectura.
const leerLeadDelVehiculo: LectorDelLeadDelVehiculo = async (vehiculoId) => {
  const leido = await leerLeadVinculado(vehiculoId)
  if (!leido.ok) {
    return leido
  }
  return ok(
    leido.data === null ? null : { id: leido.data.id, titulo: leido.data.nombre || 'Sin nombre' },
  )
}

// «Nuevo proyecto» abierto: el drawer de `repuestos` con lo que cruza módulos, que compone `src/app` (`repuestos` no importa `buscador`, `leads` ni `vehiculos`): los dos
// buscadores, el lead vinculado al vehículo (lectura de `vehiculos` que se pide al usarse) y «Nuevo lead», el alta del shell, que vuelve con el creado en `?lead=`.
export function NuevoProyectoAbierto({
  puedeCrearLeads,
  dejarDebajo,
  ...props
}: PropsDelNuevoProyectoAbierto) {
  const abrirAlta = useAbrirAltaParaElegir(CLAVE_DE_LEAD_DEL_PROYECTO)
  // La clave propia va primero: nunca hay un instante con el formulario fuera de la URL, aunque `nuqs` no junte las dos escrituras.
  const alNuevoLead =
    props.puedeVerLeads && puedeCrearLeads
      ? () => {
          dejarDebajo()
          abrirAlta()
        }
      : null
  return (
    <DrawerDeNuevoProyecto
      {...props}
      buscadorDeVehiculo={buscadorDeVehiculo}
      buscadorDeLead={buscadorDeLead}
      leerLeadDelVehiculo={props.puedeVerLeads ? leerLeadDelVehiculo : null}
      alNuevoLead={alNuevoLead}
    />
  )
}
