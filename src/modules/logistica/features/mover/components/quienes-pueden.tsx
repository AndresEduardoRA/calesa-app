'use client'

import { useId } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Skeleton } from '@/shared/ui/skeleton'
import {
  PEDIDO_A_ADMIN,
  nadieTieneLaClave,
  type ClaveQueSePide,
} from '../../../entities/mover/pedido-de-requisito'
import {
  BUSCAR_A_QUIEN,
  CAUSA_SIN_ASIGNAR,
  QUIEN_PUEDE,
  SIN_ACCESO_A_LA_UNIDAD,
} from '../../../entities/mover/textos'
import type { LecturaDeQuienes } from '../hooks/use-quienes-pueden'

type Props = {
  clave: ClaveQueSePide
  lectura: LecturaDeQuienes
  texto: string
  buscar: (texto: string) => void
  releer: () => void
  elegidaId: string | null
  elegir: (id: string) => void
  // «Esa persona ya no puede recibir tareas. Elige otra.»
  error: string | undefined
}

function SinLeer({
  lectura,
  releer,
}: Pick<Props, 'releer'> & { lectura: Extract<LecturaDeQuienes, { tipo: 'error' }> }) {
  if (lectura.error.codigo === 'sin_permiso') {
    const sinAsignar = lectura.error.causa === CAUSA_SIN_ASIGNAR
    return (
      <Aviso tono="info">
        <p>{sinAsignar ? lectura.error.mensaje : SIN_ACCESO_A_LA_UNIDAD}</p>
        {sinAsignar ? <p>{PEDIDO_A_ADMIN}</p> : null}
      </Aviso>
    )
  }
  return (
    <Aviso tono="peligro">
      <p>{lectura.error.mensaje}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 min-h-11 md:min-h-8"
        onClick={releer}
      >
        Reintentar
      </Button>
    </Aviso>
  )
}

function Radios({
  personas,
  elegidaId,
  elegir,
  idError,
}: Pick<Props, 'elegidaId' | 'elegir'> & {
  personas: Extract<LecturaDeQuienes, { tipo: 'listo' }>['personas']
  idError: string | undefined
}) {
  return (
    <div
      role="radiogroup"
      aria-label={QUIEN_PUEDE}
      aria-invalid={idError ? true : undefined}
      aria-describedby={idError}
      className="grid gap-1"
    >
      {personas.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Nadie coincide con lo que escribiste.
        </p>
      ) : (
        personas.map((p) => (
          <label
            key={p.id}
            className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-(--radius-md) px-2 hover:bg-(--color-surface-sunken) has-[:checked]:bg-(--color-surface-sunken) md:min-h-9"
          >
            <input
              type="radio"
              name="quien-puede"
              value={p.id}
              checked={elegidaId === p.id}
              onChange={() => {
                elegir(p.id)
              }}
            />
            <span className="text-(length:--text-sm)">{p.nombre}</span>
          </label>
        ))
      )}
    </div>
  )
}

// Quién puede hacer lo que falta: una lista de radios (con una sola persona, ya elegida) y, si hay más de las que se muestran, el campo para buscar por nombre.
// Sin nadie, a quién pedírselo. Cargando, tres renglones.
export function QuienesPueden({
  clave,
  lectura,
  texto,
  buscar,
  releer,
  elegidaId,
  elegir,
  error,
}: Props) {
  const idBusqueda = useId()
  const idError = useId()
  if (lectura.tipo === 'cargando') {
    return (
      <div aria-busy="true" aria-label="Cargando quién puede hacerlo" className="grid gap-2">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    )
  }
  if (lectura.tipo === 'error') return <SinLeer lectura={lectura} releer={releer} />
  const conBuscador = lectura.hayMas || lectura.buscado !== '' || texto !== ''
  if (lectura.personas.length === 0 && !conBuscador) {
    const nadie = nadieTieneLaClave(clave)
    return (
      <div className="grid gap-1 text-(length:--text-sm)">
        <p>{nadie.texto}</p>
        <p className="text-(--color-ink-soft)">{nadie.pedido}</p>
      </div>
    )
  }
  return (
    <div className="grid gap-3">
      {conBuscador ? (
        <div className="grid gap-1.5">
          <Label htmlFor={idBusqueda}>{BUSCAR_A_QUIEN}</Label>
          <Input
            id={idBusqueda}
            value={texto}
            autoComplete="off"
            onChange={(evento) => {
              buscar(evento.target.value)
            }}
          />
        </div>
      ) : null}
      <Radios
        personas={lectura.personas}
        elegidaId={elegidaId}
        elegir={elegir}
        idError={error ? idError : undefined}
      />
      {error ? (
        <p id={idError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}
