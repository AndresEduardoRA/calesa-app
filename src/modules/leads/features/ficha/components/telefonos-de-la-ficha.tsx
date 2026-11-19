'use client'

import type { LeadDeFicha } from '../../../entities/ficha'
import { FilaDeExtra } from './fila-de-extra'
import { NumeroDeTelefono } from './numero-de-telefono'

// «Teléfonos» en «Ver más» de los datos del lead, de sólo lectura: el principal y los extras con su etiqueta y su país. La base ya
// entregó cada número como corresponde (completo para la cartera, enmascarado para el resto); acá sólo se dice. Cambiar el principal y
// administrar los extras es del panel de edición («Editar» del modal o del «⋯»).
export function TelefonosDeLaFicha({ ficha }: { ficha: LeadDeFicha }) {
  return (
    <section aria-labelledby="telefonos-de-la-ficha" className="grid min-w-0 gap-2">
      <h3
        id="telefonos-de-la-ficha"
        className="text-(length:--text-sm) font-semibold text-(--color-ink)"
      >
        Teléfonos
      </h3>
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
