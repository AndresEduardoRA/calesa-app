'use client'

import { Fragment, useCallback, useRef, useState } from 'react'
import { cn } from 'cn'
import { Monto } from '@/shared/ui/monto'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { decimalesDeValor, type TipoEnLaBarra } from '../../../entities/tipos-cambio'
import { adelantarElContenido, ContenidoDeTiposCambioDiferido } from './popover-de-la-barra'

type Props = {
  // Los que la empresa eligió para la barra (hasta 3, el por defecto adelante; sin ninguno, el por defecto).
  tipos: readonly TipoEnLaBarra[]
  // Quien los gestiona tiene a mano ir a configurarlos.
  puedeGestionar: boolean
}

// Mientras el editor del popover tiene algo sin guardar (o guarda, o espera la red), estos cierres no se hacen: lo tipeado no se pierde por
// un toque de más. Esc en el campo cancela la edición; el botón de la barra sí cierra.
const CIERRES_RETENIDOS: ReadonlySet<string> = new Set(['escape-key', 'outside-press', 'focus-out'])

function TipoALaVista({ tipo, className }: { tipo: TipoEnLaBarra; className?: string }) {
  return (
    <span className={cn('items-baseline gap-1.5', className)}>
      <span className="hidden text-(--color-ink-soft) sm:inline">{tipo.nombre}</span>
      <Monto
        valor={tipo.valor}
        moneda={tipo.monedaA}
        decimales={decimalesDeValor(tipo.valor)}
        className="font-medium"
      />
    </span>
  )
}

// Los tipos de cambio de la barra superior: a la vista los que eligió la empresa y, al abrirlo, todos los vigentes con su último cambio.
// El primero se ve siempre; los demás, cuando la barra tiene lugar (56 rem: el escritorio); si no, «+N» y se ven en el popover. En la
// copia del menú del celular no hay contenedor que medir: va compacta. El contenido (la lectura y la edición) se pide al abrir.
export function TiposCambioVigentes({ tipos, puedeGestionar }: Props) {
  const [abierto, setAbierto] = useState(false)
  const retener = useRef(false)
  const alRetener = useCallback((si: boolean) => {
    retener.current = si
  }, [])
  const [principal, ...demas] = tipos
  if (!principal) {
    return null
  }

  return (
    <Popover
      open={abierto}
      onOpenChange={(abrir, detalle) => {
        if (!abrir && retener.current && CIERRES_RETENIDOS.has(detalle.reason)) {
          return
        }
        setAbierto(abrir)
      }}
    >
      <PopoverTrigger
        aria-label="Tipos de cambio"
        onPointerEnter={adelantarElContenido}
        className="inline-flex h-11 items-center gap-2 rounded-(--radius-md) px-2 text-(length:--text-sm) whitespace-nowrap text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:h-9"
      >
        <TipoALaVista tipo={principal} className="inline-flex" />
        {demas.map((tipo) => (
          <Fragment key={tipo.id}>
            <span aria-hidden className="hidden text-(--color-ink-faint) @min-[56rem]:inline">
              ·
            </span>
            <TipoALaVista tipo={tipo} className="hidden @min-[56rem]:inline-flex" />
          </Fragment>
        ))}
        {demas.length > 0 ? (
          <span className="text-(--color-ink-soft) @min-[56rem]:hidden">+{demas.length}</span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-1rem)]">
        <ContenidoDeTiposCambioDiferido
          puedeGestionar={puedeGestionar}
          alRetener={alRetener}
          alCerrar={() => {
            setAbierto(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
