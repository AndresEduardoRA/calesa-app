'use client'

import { VistaYOpciones, type GrupoDeVistaYOpciones } from '@/shared/ui/vista-y-opciones'
import type { Embudo } from '../../../entities/embudo'
import type { LeadDelEmbudo } from '../../../entities/embudo-del-lead'
import { AccionesDelEmbudo } from './acciones-del-embudo'
import { BusquedaDelEmbudo } from './busqueda-del-embudo'
import { ChipDelLead } from './chip-del-lead'
import { ConmutadorDeVista } from './conmutador-de-vista'
import { SelectorDeEmbudo } from './selector-de-embudo'

// «Lista | Embudo» en «Vista y opciones», en el mismo lugar que en la lista.
export const GRUPO_DE_VISTA: GrupoDeVistaYOpciones = {
  clave: 'vista',
  titulo: 'Vista',
  contenido: <ConmutadorDeVista actual="embudo" />,
  resumen: 'Embudo',
}

type Props = {
  embudos: Embudo[]
  actual: string
  // Filtrado por un lead: el chip ocupa el lugar de la búsqueda.
  lead: LeadDelEmbudo | null
  alElegirEmbudo: (id: string) => void
  alQuitarLead: () => void
  alAbrirEtapas: () => void
  alAbrirNuevo: () => void
}

// Arriba del kanban: el selector de embudo (elige qué se ve, como un filtro; con un lead, lo conserva), la búsqueda (crece) o el chip del lead,
// y «Vista y opciones» con «Lista | Embudo», «Etapas…» y «Nuevo embudo…».
export function BarraDelEmbudo({ embudos, actual, lead, ...acciones }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SelectorDeEmbudo embudos={embudos} actual={actual} alElegir={acciones.alElegirEmbudo} />
      {lead ? (
        <ChipDelLead nombre={lead.nombre} alQuitar={acciones.alQuitarLead} />
      ) : (
        <BusquedaDelEmbudo />
      )}
      <VistaYOpciones
        grupos={[
          GRUPO_DE_VISTA,
          {
            clave: 'embudo',
            titulo: 'Embudo',
            contenido: (
              <AccionesDelEmbudo
                alAbrirEtapas={acciones.alAbrirEtapas}
                alAbrirNuevo={acciones.alAbrirNuevo}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
