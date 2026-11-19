'use client'

import { ChevronDownIcon } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useId, useState } from 'react'
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

// Los vínculos de este lead que ya se cerraron, al pie del bloque «Vehículos» de la ficha del lead: plegados tras el botón «Vínculos anteriores»
// (`aria-expanded`), que los despliega en el lugar. Una línea por vínculo, sin personas; sólo los de vehículos que quien mira ve (la base no entrega
// los otros). Desplegado se ve todo lo leído (hasta `TOPE_DEL_HISTORIAL_DEL_LEAD`); `hayMas`: llegó al tope y hay más que no se ven, dicho al pie
// con `<AvisoDeTope>`. Plegado no dibuja ninguna fila.
export function HistorialDeVinculos({
  historial,
  hayMas = false,
}: {
  historial: readonly VinculoCerrado[]
  hayMas?: boolean
}) {
  const { zonaHoraria: zona } = useRegional()
  const [abierto, setAbierto] = useState(false)
  const idDeLaLista = useId()
  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="min-h-11 w-fit gap-1.5 px-2 md:min-h-8"
        aria-expanded={abierto}
        aria-controls={idDeLaLista}
        onClick={() => {
          setAbierto((antes) => !antes)
        }}
      >
        Vínculos anteriores
        <ChevronDownIcon
          aria-hidden
          className={`size-4 transition-transform motion-reduce:transition-none ${abierto ? 'rotate-180' : ''}`}
        />
      </Button>
      <div id={idDeLaLista} hidden={!abierto} className="grid gap-2">
        {abierto ? (
          <>
            <ul aria-label="Vínculos anteriores" className="grid gap-2 text-(length:--text-sm)">
              {historial.map((vinculo) => (
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
            {hayMas ? <AvisoDeTope texto={textoDelTope(TOPE_DEL_HISTORIAL_DEL_LEAD)} /> : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
