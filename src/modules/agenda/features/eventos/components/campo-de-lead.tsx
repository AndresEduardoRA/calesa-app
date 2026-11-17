'use client'

import { LinkIcon, XIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { ElegirLead } from '@/modules/buscador/client'
import { Button } from '@/shared/ui/button'
import type { LeadElegido } from '../../../entities/edicion'

type Props = {
  valor: LeadElegido | null
  alCambiar: (lead: LeadElegido | null) => void
  error: string | undefined
}

// «Lead (opcional)»: la cita con un cliente. Se elige de la cartera de quien mira (el buscador del lead, 3 letras o un #número, nunca por teléfono); elegido,
// se ve su nombre y «Quitar el lead». La base vuelve a exigir verlo (`trg_lead_visible`): su motivo va aquí, junto al campo.
export function CampoDeLead({ valor, alCambiar, error }: Props) {
  const id = useId()
  const [buscando, setBuscando] = useState(false)
  return (
    <fieldset className="grid gap-2" aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="text-(length:--text-sm) font-medium text-(--color-ink)">
        Lead (opcional)
      </legend>
      {valor ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="min-w-0 break-words text-(--color-ink)">
            {valor.nombre ?? 'Un lead que no puedes ver'}
          </span>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 md:min-h-8"
            onClick={() => {
              alCambiar(null)
            }}
          >
            <XIcon aria-hidden />
            Quitar el lead
          </Button>
        </div>
      ) : buscando ? (
        <div className="grid gap-2">
          <ElegirLead
            etiqueta="Buscar en tu cartera"
            alElegir={(lead) => {
              setBuscando(false)
              alCambiar({ id: lead.id, nombre: lead.nombre })
            }}
          />
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 w-fit md:min-h-8"
            onClick={() => {
              setBuscando(false)
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          onClick={() => {
            setBuscando(true)
          }}
        >
          <LinkIcon aria-hidden />
          Vincular un lead
        </Button>
      )}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-(length:--text-sm) text-(--color-peligro-ink)"
        >
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
