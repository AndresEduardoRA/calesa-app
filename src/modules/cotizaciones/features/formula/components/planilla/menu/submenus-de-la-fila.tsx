'use client'

import { CheckIcon } from 'lucide-react'
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/shared/ui/dropdown-menu'
import type { FilaDeLaHoja } from '../../../../../entities/formula/hoja-de-la-planilla'
import {
  ETIQUETA_DEL_TIPO,
  motivoDelTipo,
  TIPOS_DE_CELDA,
  type TipoDeCelda,
} from '../../../../../entities/formula/tipo-de-celda'
import type { Planilla } from '../../../hooks/use-planilla'
import { FONDO_DEL_TIPO } from '../cuadricula/clases'

export const RENGLON = 'min-h-11 md:min-h-8'

// Un renglón apagado dice por qué, debajo de su nombre.
export function ConMotivo({ texto, motivo }: { texto: string; motivo: string | null }) {
  return (
    <span className="grid">
      <span>{texto}</span>
      {motivo === null ? null : (
        <span className="text-(length:--text-xs) text-(--color-ink-soft)">{motivo}</span>
      )}
    </span>
  )
}

type PropsDelSubmenu = {
  planilla: Planilla
  fila: FilaDeLaHoja
  // Lo elegido corre cuando el menú terminó de cerrarse (el foco vuelve antes al «⋯»).
  alElegir: (accion: () => void) => void
}

// «Tipo de celda ›»: los ocho tipos (D10), el de la fila marcado; uno que no puede ser, apagado con su motivo.
export function SubmenuDelTipo({ planilla, fila, alElegir }: PropsDelSubmenu) {
  const { trabajo } = planilla.editor
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={RENGLON} openOnHover={false}>
        Tipo de celda
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64 max-w-(--available-width)">
        {TIPOS_DE_CELDA.map((tipo: TipoDeCelda) => {
          const motivo =
            tipo === fila.tipo ? null : motivoDelTipo(trabajo, fila.numero, tipo, planilla.hoja)
          return (
            <DropdownMenuItem
              key={tipo}
              className={RENGLON}
              disabled={motivo !== null}
              onClick={() => {
                alElegir(() => {
                  planilla.elegirTipo(fila, tipo)
                })
              }}
            >
              <span
                aria-hidden
                className={`size-3 shrink-0 rounded-sm border border-(--color-line-strong) ${FONDO_DEL_TIPO[tipo]}`}
              />
              <ConMotivo texto={ETIQUETA_DEL_TIPO[tipo]} motivo={motivo} />
              {tipo === fila.tipo ? <CheckIcon aria-label="Elegido" className="ml-auto" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

// «Banda ›»: cada banda (la de la fila marcada), «Sin banda» y «Nueva banda…», que nace con esta fila.
export function SubmenuDeLaBanda({ planilla, fila, alElegir }: PropsDelSubmenu) {
  const grupos = planilla.editor.trabajo.definicion.grupos ?? []
  const poner = (grupo: string | null) => {
    alElegir(() => {
      planilla.ops.ponerEnBanda(fila.id, grupo)
      planilla.enfocar()
    })
  }
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className={RENGLON} openOnHover={false}>
        Banda
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56 max-w-(--available-width)">
        {grupos.map((g) => (
          <DropdownMenuItem
            key={g.id}
            className={RENGLON}
            disabled={g.id === fila.grupo}
            onClick={() => {
              poner(g.id)
            }}
          >
            {g.etiqueta}
            {g.id === fila.grupo ? <CheckIcon aria-label="Elegida" className="ml-auto" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          className={RENGLON}
          disabled={fila.grupo === null}
          onClick={() => {
            poner(null)
          }}
        >
          Sin banda
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={RENGLON}
          onClick={() => {
            alElegir(() => {
              planilla.abrirNuevaBanda(fila.id)
            })
          }}
        >
          Nueva banda…
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
