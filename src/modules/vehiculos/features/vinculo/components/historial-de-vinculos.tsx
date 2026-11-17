'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { formatearFecha } from '@/shared/lib/fechas'
import { RUTAS } from '@/shared/lib/rutas'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useRegional } from '@/shared/ui/regional'
import {
  TOPE_DEL_HISTORIAL_DEL_LEAD,
  rotuloDeVehiculo,
  type VinculoCerrado,
} from '../../../entities/vehiculos-del-lead'

// Cuántos vínculos anteriores se ven sin pedirlo: el resto, con «Ver los N anteriores» (todos ya están leídos, hasta el tope).
export const ANTERIORES_A_LA_VISTA = 3

// Los vínculos de este lead que ya se cerraron: una línea por vínculo, sin personas. Sólo los de vehículos que quien mira ve (la base
// no entrega los otros). A la vista los últimos 3; «Ver los N anteriores» muestra los demás en el lugar (N son los que ya llegaron, hasta
// `TOPE_DEL_HISTORIAL_DEL_LEAD`). `hayMas`: llegó al tope y hay más que no se ven; se dice al pie con `<AvisoDeTope>`.
export function HistorialDeVinculos({
  historial,
  hayMas = false,
}: {
  historial: readonly VinculoCerrado[]
  hayMas?: boolean
}) {
  const { zonaHoraria: zona } = useRegional()
  const [todos, setTodos] = useState(false)
  const ocultos = historial.length - ANTERIORES_A_LA_VISTA
  const lista = todos ? historial : historial.slice(0, ANTERIORES_A_LA_VISTA)
  return (
    <section aria-labelledby="vinculos-anteriores" className="grid gap-2">
      <h3
        id="vinculos-anteriores"
        className="text-(length:--text-sm) font-semibold text-(--color-ink)"
      >
        Vínculos anteriores
      </h3>
      <ul aria-label="Vínculos anteriores" className="grid gap-2 text-(length:--text-sm)">
        {lista.map((vinculo) => (
          <li key={`${vinculo.vehiculoId}-${vinculo.desde}`} className="grid gap-0.5">
            <Link
              href={`${RUTAS.vehiculos}/${vinculo.vehiculoId}` as Route}
              className="w-fit font-medium underline-offset-2 hover:underline"
            >
              {rotuloDeVehiculo(vinculo)}
            </Link>
            <span className="text-(length:--text-xs) text-(--color-ink-soft)">
              Vinculado el {formatearFecha(vinculo.desde, { zona })}, desvinculado el{' '}
              {formatearFecha(vinculo.hasta, { zona })}
            </span>
          </li>
        ))}
      </ul>
      {!todos && ocultos > 0 ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-fit md:min-h-9"
          onClick={() => {
            setTodos(true)
          }}
        >
          {ocultos === 1 ? 'Ver el anterior' : `Ver los ${String(ocultos)} anteriores`}
        </Button>
      ) : null}
      {todos && hayMas ? <AvisoDeTope texto={textoDelTope(TOPE_DEL_HISTORIAL_DEL_LEAD)} /> : null}
    </section>
  )
}
