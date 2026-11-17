'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { etiquetaDeLead, type EstadoDeElegirLead } from '../../../entities/estado-de-elegir-lead'
import type { FilaDeLead } from '../../../entities/resultados'
import { useBusquedaDeLeadsDeLaCartera } from '../hooks/use-busqueda-de-leads-de-la-cartera'
import { useState } from 'react'

const TACTIL = 'min-h-11 md:min-h-8'
const TEXTO = 'text-(length:--text-sm) text-(--color-ink-soft)'

export type PropsDeElegirLead = {
  // Qué se va a hacer con el lead (el campo lo nombra: «Lead para el seguimiento»).
  etiqueta: string
  alElegir: (lead: FilaDeLead) => void
}

function Estado({
  estado,
  alReintentar,
}: {
  estado: EstadoDeElegirLead
  alReintentar: () => void
}) {
  switch (estado.tipo) {
    case 'reposo':
      return <p className={TEXTO}>Escribe al menos 3 letras o un número (#12).</p>
    case 'telefono':
      return (
        <p className={TEXTO}>No se busca por teléfono. Escribe el nombre o el número del lead.</p>
      )
    case 'esperando':
    case 'buscando':
      return <p className={TEXTO}>Buscando…</p>
    case 'sin_conexion':
    case 'error':
      return (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {estado.mensaje}{' '}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={TACTIL}
            onClick={alReintentar}
          >
            Reintentar
          </Button>
        </p>
      )
    case 'listo':
      return estado.filas.length === 0 ? (
        <p className={TEXTO}>
          No encontramos leads tuyos con eso. Sólo se ofrecen los de tu cartera.
        </p>
      ) : null
  }
}

// El segundo paso de «Nuevo» para un seguimiento o un recordatorio: se busca por nombre o por número (nunca por teléfono) entre los leads de la cartera de quien mira y se
// elige uno. Elegir actúa al instante; Enter en el campo elige el primero. Hasta `ELEGIBLES_DE_LA_CARTERA` filas: «Escribe más» si hay otras, nunca un listado entero.
export function ElegirLead({ etiqueta, alElegir }: PropsDeElegirLead) {
  const id = useId()
  const [texto, setTexto] = useState('')
  const { estado, reintentar } = useBusquedaDeLeadsDeLaCartera({ texto })
  const filas = estado.tipo === 'listo' ? estado.filas : []
  return (
    <div className="grid gap-2">
      <Label htmlFor={`${id}-buscar`}>{etiqueta}</Label>
      <Input
        id={`${id}-buscar`}
        type="search"
        autoComplete="off"
        autoFocus
        placeholder="Nombre o #número"
        value={texto}
        aria-describedby={`${id}-estado`}
        className="h-11 md:h-9"
        onChange={(evento) => {
          setTexto(evento.target.value)
        }}
        onKeyDown={(evento) => {
          if (evento.key !== 'Enter') {
            return
          }
          evento.preventDefault()
          const primero = filas[0]
          if (primero) {
            alElegir(primero)
          }
        }}
      />
      <div id={`${id}-estado`} aria-live="polite" className="grid gap-1">
        <Estado estado={estado} alReintentar={reintentar} />
      </div>
      {filas.length > 0 ? (
        <ul aria-label="Leads de tu cartera" className="grid gap-1">
          {filas.map((fila) => (
            <li key={fila.id}>
              <Button
                type="button"
                variant="outline"
                className={`${TACTIL} w-full min-w-0 justify-start gap-2`}
                onClick={() => {
                  alElegir(fila)
                }}
              >
                <span className="min-w-0 truncate">{etiquetaDeLead(fila)}</span>
                {fila.numero_visible === null ? null : (
                  <span className="shrink-0 text-(--color-ink-soft) tabular-nums">
                    #{fila.numero_visible}
                  </span>
                )}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {estado.tipo === 'listo' && estado.hayMas ? (
        <AvisoDeTope texto="Hay más leads de los que se muestran. Escribe más para acotar." />
      ) : null}
    </div>
  )
}
