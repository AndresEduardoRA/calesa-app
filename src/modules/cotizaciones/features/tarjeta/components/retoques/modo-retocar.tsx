'use client'

import type { PlantillaEnCuadricula } from '../../../../entities/cuadricula-de-la-tarjeta'
import type { Geometria } from '../../../../entities/tarjeta/geometria-de-la-tarjeta'
import type { ModoRetocar } from '../../hooks/use-modo-retocar'
import { AvisosDelModo } from './avisos-del-modo'
import { ConfirmarVolverALaPlantilla } from './confirmar-volver-a-la-plantilla'
import { PieDelModoConBotones } from './pie-del-modo'
import { TarjetaRetocable } from './tarjeta-retocable'

type PropsDelCuerpo = {
  modo: ModoRetocar
  geometria: Geometria
  logo: { nombre: string; url: string } | null
  plantilla: PlantillaEnCuadricula
}

// El cuerpo del modo «Retocar la tarjeta»: sus avisos, la tarjeta del borrador con sus controles y el campo de la celda o la fila elegida.
export function CuerpoDelModo({ modo, geometria, logo, plantilla }: PropsDelCuerpo) {
  return (
    <div className="grid min-w-0 gap-3">
      <AvisosDelModo modo={modo} />
      <TarjetaRetocable modo={modo} geometria={geometria} logo={logo} plantilla={plantilla} />
    </div>
  )
}

// El pie del modo: «Listo», «Cancelar» y el «⋯» con «Volver a la plantilla», o la pregunta de volver a la plantilla.
export function PieDelModo({
  modo,
  plantilla,
}: {
  modo: ModoRetocar
  plantilla: PlantillaEnCuadricula | null
}) {
  if (modo.confirmandoVolver) {
    return (
      <ConfirmarVolverALaPlantilla
        enCurso={modo.enCurso}
        alSeguir={modo.seguirRetocando}
        alVolver={modo.volverALaPlantilla}
      />
    )
  }
  return <PieDelModoConBotones modo={modo} plantilla={plantilla} />
}
