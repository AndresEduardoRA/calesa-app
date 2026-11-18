'use client'

import { useId } from 'react'
import { AccionesDelAviso } from '@/shared/ui/acciones-del-aviso'
import { Aviso } from '@/shared/ui/aviso'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Label } from '@/shared/ui/label'
import { useRegional } from '@/shared/ui/regional'
import { Textarea } from '@/shared/ui/textarea'
import {
  LARGO_MAXIMO_DE_NOTAS,
  LARGO_MAXIMO_DE_TITULO,
  type Oportunidad,
} from '../../../entities/oportunidad'
import type { OpcionDeEmbudo } from '../../../entities/oportunidad-unica'
import { CampoVehiculo } from '../../recordatorios/components/campo-vehiculo'
import type { useFormularioDeOportunidad } from '../hooks/use-formulario-de-oportunidad'

type Props = {
  formulario: ReturnType<typeof useFormularioDeOportunidad>
  oportunidad: Oportunidad | null
  // Al crear y con más de un embudo, en cuál (`embudosParaCrear()`: los que ya tienen una abierta, apagados); si no, null.
  opcionesDeEmbudo: readonly OpcionDeEmbudo[] | null
}

// Los campos de una oportunidad: título, monto (en la moneda de la empresa, sin convertir), notas,
// vehículo (uno del lead que quien escribe ve) y, al crear, el embudo.
export function CamposDeOportunidad({ formulario: f, oportunidad, opcionesDeEmbudo }: Props) {
  const id = useId()
  const { monedaBase } = useRegional()
  const moneda = oportunidad?.moneda ?? monedaBase
  return (
    <div className="grid gap-4">
      <Campo
        nombre="titulo"
        etiqueta="Título"
        value={f.valores.titulo}
        maxLength={LARGO_MAXIMO_DE_TITULO + 20}
        error={f.errores.titulo}
        onChange={(evento) => {
          f.cambiar('titulo', evento.target.value)
        }}
      />
      <Campo
        nombre="monto_estimado"
        etiqueta={`Monto estimado (${moneda}, opcional)`}
        inputMode="decimal"
        value={f.valores.monto}
        error={f.errores.monto_estimado}
        onChange={(evento) => {
          f.cambiar('monto', evento.target.value)
        }}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`${id}-notas`}>Notas (opcional)</Label>
        <Textarea
          id={`${id}-notas`}
          value={f.valores.notas}
          rows={3}
          maxLength={LARGO_MAXIMO_DE_NOTAS + 20}
          aria-invalid={f.errores.notas ? true : undefined}
          aria-describedby={f.errores.notas ? `${id}-notas-error` : undefined}
          onChange={(evento) => {
            f.cambiar('notas', evento.target.value)
          }}
        />
        {f.errores.notas ? (
          <p
            id={`${id}-notas-error`}
            className="text-(length:--text-sm) text-(--color-peligro-ink)"
          >
            {f.errores.notas}
          </p>
        ) : null}
      </div>
      <CampoVehiculo
        nombre="vehiculo"
        valor={f.valores.vehiculo}
        actual={oportunidad}
        error={f.errores.vehiculo}
        alCambiar={(valor) => {
          f.cambiar('vehiculo', valor)
        }}
      />
      {!oportunidad && opcionesDeEmbudo ? (
        <CampoSeleccion
          nombre="embudo"
          etiqueta="Embudo"
          opciones={opcionesDeEmbudo}
          value={f.embudo}
          error={f.errores.embudo}
          onChange={(evento) => {
            f.setEmbudo(evento.target.value)
          }}
        />
      ) : null}
      {/* Sin el campo (un solo embudo), el rechazo del embudo se dice igual. */}
      {!oportunidad && !opcionesDeEmbudo && f.errores.embudo ? (
        <Aviso tono="peligro">{f.errores.embudo}</Aviso>
      ) : null}
      {f.abierta ? <AccionesDelAviso resueltas={f.abierta} /> : null}
    </div>
  )
}
