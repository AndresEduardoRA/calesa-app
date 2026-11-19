'use client'

import { PlusIcon } from 'lucide-react'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { recordarQuienAbre } from '@/shared/ui/foco-de-quien-abre'
import { lineasDelMas, NOMBRE_DEL_MAS } from '../../../entities/mas-del-seguimiento'
import { usePanelDeRecordatorio } from '../../recordatorios/hooks/use-panel-de-recordatorio'
import { usePanelDeSeguimiento } from '../hooks/use-panel-de-seguimiento'

type Props = {
  puedoAnotar: boolean
  puedoAgendar: boolean
  hayTipos: boolean
}

const RENGLON = 'min-h-11 md:min-h-8'

// El «+» del título del bloque «Seguimiento»: un solo botón que despliega «Anotar seguimiento» y «Agendar recordatorio». Sólo escribe el
// `?panel=` (`atiendeLaUrl: false`): los modales son del bloque, que atiende la URL y vigila la vuelta del foco. Abre cuando el menú terminó
// de cerrarse (si no, el foco que vuelve al «+» cerraría el modal) y se recuerda como quien abrió: al cerrarse el modal, el foco vuelve acá.
// Sin nada que ofrecer (fuera de la cartera) no se dibuja.
export function MasDelSeguimiento({ puedoAnotar, puedoAgendar, hayTipos }: Props) {
  const seguimiento = usePanelDeSeguimiento({ atiendeLaUrl: false })
  const recordatorio = usePanelDeRecordatorio({ atiendeLaUrl: false })
  const [pendiente, setPendiente] = useState<'anotar' | 'agendar' | null>(null)
  const lineas = lineasDelMas({ puedoAnotar, puedoAgendar, hayTipos })
  if (lineas.length === 0) {
    return null
  }
  return (
    <DropdownMenu
      onOpenChangeComplete={(abierto) => {
        if (abierto || pendiente === null) {
          return
        }
        setPendiente(null)
        recordarQuienAbre()
        if (pendiente === 'anotar') {
          seguimiento.abrirAnotar()
        } else {
          recordatorio.abrirAgendar()
        }
      }}
    >
      <DropdownMenuTrigger
        aria-label={NOMBRE_DEL_MAS}
        data-mas-del-seguimiento=""
        className="flex size-[44px] shrink-0 items-center justify-center rounded-(--radius-md) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:size-8"
      >
        <PlusIcon aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 max-w-(--available-width)">
        {lineas.map((linea) =>
          linea.tipo === 'nota' ? (
            <p
              key={linea.clave}
              className="px-1.5 py-1.5 text-(length:--text-xs) text-(--color-ink-faint)"
            >
              {linea.texto}
            </p>
          ) : (
            <DropdownMenuItem
              key={linea.clave}
              className={RENGLON}
              disabled={linea.apagada}
              onClick={() => {
                setPendiente(linea.clave)
              }}
            >
              {linea.etiqueta}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
