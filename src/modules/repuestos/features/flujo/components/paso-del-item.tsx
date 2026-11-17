'use client'

import { ArrowRightIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import type { IndiceDelFlujo } from '../../../entities/flujo/pasos'
import { siguienteDelItem, type ContextoDelSiguiente } from '../../../entities/flujo/siguiente'

export type HitoDelSiguiente = 'cotizacion' | 'pago'

type Props = {
  indice: IndiceDelFlujo
  fila: Pick<FilaDeItem, 'id' | 'descripcion' | 'fase' | 'precioCliente'>
  contexto: ContextoDelSiguiente
  // Mientras la página se vuelve a pedir (tras un pago): un clic caería a mitad del redibujo.
  apagado: boolean
  // Abre el panel del ítem con ese destino ya elegido (nulo = elegir entre varias iniciales).
  alMover: (itemId: string, destino: string | null) => void
  // Abre el formulario del hito que falta (el panel de Cotizaciones o «Registrar pago»).
  alHito: (itemId: string, hito: HitoDelSiguiente) => void
}

// El botón del siguiente de un ítem (`docs/GLOSARIO.md` › «Siguiente (de un ítem)») junto a su fase, en la fila de la hoja: mover (abre el panel del ítem con el
// destino ya elegido, donde «Qué falta» muestra lo que pide y la nota) o el formulario del hito que falta. Sin permiso para lo que toca (también un hito
// bloqueante que falta y quien mira no puede hacer: mover lo rechazaría la base), sólo «Sigue: «X»»; sin siguiente, nada.
// El nombre accesible lleva el ítem: «Comprar · Bomba».
export function PasoDelItem({ indice, fila, contexto, apagado, alMover, alHito }: Props) {
  const siguiente = siguienteDelItem(indice, fila, contexto)
  if (siguiente.tipo === 'ninguno') return null
  if (siguiente.tipo === 'informar') {
    return (
      <span
        className="text-(length:--text-sm) text-(--color-ink-soft)"
        data-siguiente-item={fila.id}
      >
        {siguiente.texto}
      </span>
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-siguiente-item={fila.id}
      aria-label={`${siguiente.texto} · ${fila.descripcion}`}
      disabled={apagado}
      className="min-h-11 w-full justify-center md:min-h-9 md:w-auto"
      onClick={() => {
        if (siguiente.tipo === 'mover') alMover(fila.id, siguiente.faseId)
        else alHito(fila.id, siguiente.tipo)
      }}
    >
      {siguiente.texto}
      <ArrowRightIcon aria-hidden />
    </Button>
  )
}
