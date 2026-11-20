'use client'

import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'
import { AYUDA_DEL_INTERRUPTOR, ETIQUETA_DE_PRIVADA } from '../../../entities/privada'

// El interruptor «Privada» al guardar una nueva (glosario: «Cotización privada»), sobre el pie del resumen: su nombre, a quién se la muestra (`aria-describedby`) y el
// interruptor, apagado mientras guarda. Sólo lo dibuja la hoja nueva (`useMarcaDeLaNueva()`), que siempre es una preventa y la guarda quien la crea; una guardada la cambia
// por su «⋯».
export function InterruptorPrivada({
  privada,
  alCambiar,
  ocupado,
}: {
  privada: boolean
  alCambiar: (privada: boolean) => void
  ocupado: boolean
}) {
  const id = useId()
  return (
    <div className="flex min-h-11 items-center justify-between gap-3" data-interruptor-privada="">
      <div className="grid min-w-0 gap-0.5">
        <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
          {ETIQUETA_DE_PRIVADA}
        </span>
        <span id={id} className="text-(length:--text-sm) text-(--color-ink-soft)">
          {AYUDA_DEL_INTERRUPTOR}
        </span>
      </div>
      <Switch
        aria-label={ETIQUETA_DE_PRIVADA}
        aria-describedby={id}
        checked={privada}
        disabled={ocupado}
        onCheckedChange={alCambiar}
      />
    </div>
  )
}
