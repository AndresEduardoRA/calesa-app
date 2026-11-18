'use client'

import { Button } from '@/shared/ui/button'
import { Aviso } from '@/shared/ui/aviso'
import { EstadoVacio } from '@/shared/ui/estados'
import { vacioDelEmbudoDelLead } from '../../../entities/embudo-del-lead'
import type { Tablero } from '../../../entities/tablero'

type Props = {
  tablero: Tablero
  vacio: boolean
  alVerTodas: () => void
}

// Lo que va arriba de las columnas. Sin lead: qué se ve (o qué se busca) y, sin oportunidades, el vacío. Con lead: sólo su vacío con «Ver todas»
// (el chip ya dice qué se ve). Las columnas se ven igual: muestran las etapas del embudo.
export function AvisoDelTablero({ tablero, vacio, alVerTodas }: Props) {
  if (tablero.lead) {
    return vacio ? (
      <EstadoVacio
        compacto
        titulo={vacioDelEmbudoDelLead(tablero.lead.nombre, tablero.embudo.nombre)}
        accion={
          <Button variant="outline" className="min-h-11 md:min-h-8" onClick={alVerTodas}>
            Ver todas
          </Button>
        }
      />
    ) : null
  }
  return (
    <>
      <Aviso tono="info">
        <p>
          {tablero.busqueda
            ? `Buscando «${tablero.busqueda}» en tus oportunidades: el título o el nombre del lead, en todas las etapas.`
            : 'Aquí ves tus oportunidades. Los filtros de la lista no se aplican en esta vista; para llegar a una, búscala.'}
        </p>
      </Aviso>
      {vacio ? (
        <EstadoVacio
          compacto
          titulo="Todavía no tienes oportunidades en este embudo"
          descripcion="Crea una desde la ficha de un lead, en «Oportunidades»."
        />
      ) : null}
    </>
  )
}
