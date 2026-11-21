'use client'

import { useId } from 'react'
import { Switch } from '@/shared/ui/switch'
import { AYUDA_DEL_INTERRUPTOR, ETIQUETA_DE_PRIVADA } from '../../../entities/privada'

// El interruptor «Privada» al guardar una nueva (glosario: «Cotización privada»), sobre el pie del resumen: su nombre, a quién se la muestra (`aria-describedby`) y el
// interruptor, apagado mientras guarda. Sólo lo dibuja la hoja nueva (`useMarcaDeLaNueva()`), que siempre es una preventa y la guarda quien la crea; una guardada la cambia
// por su «⋯». En el celular el resumen va pegado abajo y la fila de `<Flotantes>` del marco (`bottom-20 right-4`: «Copiar el enlace» y la burbuja del chat, 44 px cada uno
// y 8 entre los dos) cae a la altura de esta fila: el margen derecho deja el interruptor a su izquierda.
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
    <div
      className="flex min-h-11 items-center justify-between gap-3 max-md:pr-[96px]"
      data-interruptor-privada=""
    >
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
