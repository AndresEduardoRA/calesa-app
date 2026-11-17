'use client'

import { Bloque } from '@/shared/ui/bloque'
import type { LeadDeTelefonos } from '../../../entities/telefonos'
import { useAgregarExtraEnPanel } from '../hooks/use-agregar-extra-en-panel'
import { CambiarElPrincipal } from './cambiar-el-principal'
import { NumeroDeTelefono } from './numero-de-telefono'
import { TelefonosExtra } from './telefonos-extra'

type Props = {
  lead: LeadDeTelefonos
  puedeEditarExtras: boolean
  puedeConfigurar: boolean
  // El resumen del listado, con el panel abierto encima, no responde a `?extra=nuevo`: lo atiende éste.
  alCambiar?: () => void
  // «Cambiar el principal» (cartera y `leads.editar`, en la ficha): apagado mientras el formulario tiene cambios. Nulo, no se ofrece.
  cambiarElPrincipal: { hayCambios: boolean; alCambiar: () => void } | null
}

// Los teléfonos dentro del panel de edición: el principal (con «Cambiar el principal») y los extras, con el mismo componente y las mismas
// reglas en la ficha y en el resumen. Va **fuera** del `<form>` del panel (rotular una fila es un `<form>`, y un formulario no se anida en
// otro) y se guarda al momento, sin esperar a «Guardar».
export function TelefonosDelPanel({
  lead,
  puedeEditarExtras,
  puedeConfigurar,
  alCambiar,
  cambiarElPrincipal,
}: Props) {
  const apertura = useAgregarExtraEnPanel()
  return (
    <Bloque titulo="Teléfonos">
      <ul className="grid gap-2 text-(length:--text-sm) text-(--color-ink)">
        <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <NumeroDeTelefono
            numero={lead.telefono}
            codigoDePais={lead.telefonoCc}
            llamable={lead.enCartera}
          />
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">Principal</span>
          {cambiarElPrincipal ? <CambiarElPrincipal {...cambiarElPrincipal} /> : null}
        </li>
        <TelefonosExtra
          lead={lead}
          puedeAdministrar={puedeEditarExtras}
          apertura={apertura}
          puedeConfigurar={puedeConfigurar}
          alCambiar={alCambiar}
        />
      </ul>
      {puedeEditarExtras ? (
        <p className="mt-3 text-(length:--text-xs) text-(--color-ink-soft)">
          Los extras se guardan al momento, sin esperar a «Guardar».
        </p>
      ) : null}
    </Bloque>
  )
}
