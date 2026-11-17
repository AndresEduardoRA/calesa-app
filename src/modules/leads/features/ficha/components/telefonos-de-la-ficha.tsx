'use client'

import { PencilIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { TITULO_DE_BLOQUE } from '@/shared/ui/ficha-en-bloques'
import type { LeadDeFicha } from '../../../entities/ficha'
import { usePanelDeLead } from '../hooks/use-panel-de-lead'
import { FilaDeExtra } from './fila-de-extra'
import { NumeroDeTelefono } from './numero-de-telefono'

type Props = {
  ficha: LeadDeFicha
  // Cartera y `leads.telefonos_extra.editar` sin `leads.editar`: «Editar teléfonos» abre el panel sólo con los teléfonos. Con `leads.editar`
  // se editan con «Editar» de la cabecera.
  conEditarTelefonos: boolean
}

// «Teléfonos» de la ficha, de sólo lectura: el principal y los extras con su etiqueta y su país. La base ya entregó cada número como
// corresponde (completo para la cartera, enmascarado para el resto); acá sólo se dice. Cambiar el principal y administrar los extras es del
// panel de edición.
export function TelefonosDeLaFicha({ ficha, conEditarTelefonos }: Props) {
  const panel = usePanelDeLead()
  return (
    <section aria-labelledby="telefonos-de-la-ficha" className="grid gap-2">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 md:min-h-8">
        <h2 id="telefonos-de-la-ficha" className={TITULO_DE_BLOQUE}>
          Teléfonos
        </h2>
        {conEditarTelefonos ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 md:min-h-7"
            onClick={panel.abrir}
          >
            <PencilIcon aria-hidden />
            Editar teléfonos
          </Button>
        ) : null}
      </div>
      <ul className="grid gap-2 text-(length:--text-sm) text-(--color-ink)">
        <li className="flex flex-wrap items-center gap-x-2">
          <NumeroDeTelefono
            numero={ficha.telefono}
            codigoDePais={ficha.telefonoCc}
            llamable={ficha.enCartera}
          />
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">Principal</span>
        </li>
        {ficha.telefonos.map((extra) => (
          <FilaDeExtra
            key={extra.id}
            extra={extra}
            codigoDePais={ficha.telefonoCc}
            llamable={ficha.enCartera}
            acciones={null}
          />
        ))}
      </ul>
      {ficha.enCartera ? null : (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Completo solo para su cartera.
        </p>
      )}
    </section>
  )
}
