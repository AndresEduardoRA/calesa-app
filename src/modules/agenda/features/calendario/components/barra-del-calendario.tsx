'use client'

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { VistaYOpciones } from '@/shared/ui/vista-y-opciones'
import type { ClaveDeClase } from '../../../entities/agenda'
import { moverFecha, VISTAS, type Vista } from '../../../entities/calendario'
import { useParametrosDeAgenda } from '../hooks/use-parametros-de-agenda'
import { IrAUnaFechaDeLaAgenda } from './ir-a-una-fecha-de-la-agenda'
import { opcionesDeLaAgenda } from './opciones-de-la-agenda'

const NOMBRE_DE_VISTA: Record<Vista, string> = { dia: 'Día', semana: 'Semana', mes: 'Mes' }

type Props = {
  // Lo resuelto en el servidor (con sus valores por defecto): la barra sólo escribe la URL.
  vista: Vista
  fecha: string
  titulo: string
  zona: string
  clases: readonly ClaveDeClase[]
  // Sólo con `agenda.ver_todo` existe «Qué agenda ver» (D5): es un filtro de lectura, no una acción deshabilitable.
  puedeVerTodo: boolean
  deTodos: boolean
  // «Nuevo»: lo compone `src/app` (abre el modal del shell).
  nuevo: ReactNode
}

// A la vista, lo que se usa a cada rato: «‹ Hoy ›», la fecha, «Ir a una fecha», Día/Semana/Mes y «Nuevo». Lo demás (qué agenda y qué clases) va en «Vista y
// opciones». Todo escribe en la URL.
export function BarraDelCalendario({
  vista,
  fecha,
  titulo,
  zona,
  clases,
  puedeVerTodo,
  deTodos,
  nuevo,
}: Props) {
  const [, poner] = useParametrosDeAgenda()
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="max-md:size-11"
          aria-label="Anterior"
          onClick={() => void poner({ fecha: moverFecha(vista, fecha, -1) })}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          className="max-md:h-11"
          onClick={() => void poner({ fecha: null })}
        >
          Hoy
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="max-md:size-11"
          aria-label="Siguiente"
          onClick={() => void poner({ fecha: moverFecha(vista, fecha, 1) })}
        >
          <ChevronRightIcon />
        </Button>
        <h1 className="min-w-0 text-(length:--text-xl) font-semibold break-words text-(--color-ink) first-letter:uppercase">
          {titulo}
        </h1>
        <IrAUnaFechaDeLaAgenda zona={zona} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={vista} onValueChange={(elegida) => void poner({ vista: String(elegida) })}>
          <TabsList className="max-md:h-11">
            {VISTAS.map((clave) => (
              <TabsTrigger key={clave} value={clave} className="px-3">
                {NOMBRE_DE_VISTA[clave]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <VistaYOpciones grupos={opcionesDeLaAgenda({ clases, puedeVerTodo, deTodos })} />
        <div className="ml-auto">{nuevo}</div>
      </div>
    </div>
  )
}
