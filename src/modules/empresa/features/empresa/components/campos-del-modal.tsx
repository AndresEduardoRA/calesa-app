'use client'

import type { ComponentProps } from 'react'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { Interruptor } from '@/shared/ui/interruptor'
import type { CampoDeLaTarjeta } from '../../../entities/tarjetas-de-la-empresa'
import type { FormularioDeTarjeta } from '../hooks/use-guardar-tarjeta'

type Base = { formulario: FormularioDeTarjeta; campo: CampoDeLaTarjeta; etiqueta: string }

const texto = (formulario: FormularioDeTarjeta, campo: CampoDeLaTarjeta) =>
  String(formulario.escrito[campo] ?? '')

// Un campo de texto de un modal de Datos, atado a lo escrito: el motivo del envío sale junto a él y escribir lo quita.
export function CampoEscrito({
  formulario,
  campo,
  etiqueta,
  ...resto
}: Base &
  Omit<ComponentProps<typeof Campo>, 'nombre' | 'etiqueta' | 'value' | 'onChange' | 'error'>) {
  return (
    <Campo
      {...resto}
      nombre={campo}
      etiqueta={etiqueta}
      value={texto(formulario, campo)}
      error={formulario.errores[campo]}
      onChange={(evento) => {
        formulario.cambiar(campo, evento.target.value)
      }}
    />
  )
}

// Lo mismo para un `<select>`.
export function SeleccionEscrita({
  formulario,
  campo,
  etiqueta,
  ...resto
}: Base &
  Omit<
    ComponentProps<typeof CampoSeleccion>,
    'nombre' | 'etiqueta' | 'value' | 'onChange' | 'error'
  >) {
  return (
    <CampoSeleccion
      {...resto}
      nombre={campo}
      etiqueta={etiqueta}
      value={texto(formulario, campo)}
      error={formulario.errores[campo]}
      onChange={(evento) => {
        formulario.cambiar(campo, evento.target.value)
      }}
    />
  )
}

// Un interruptor de un modal de Datos: apagado mientras guarda (con Base UI el `<fieldset disabled>` no alcanza).
export function InterruptorEscrito({
  formulario,
  campo,
  titulo,
  ayuda,
}: {
  formulario: FormularioDeTarjeta
  campo: CampoDeLaTarjeta
  titulo: string
  ayuda: string
}) {
  return (
    <Interruptor
      titulo={titulo}
      ayuda={ayuda}
      valor={formulario.escrito[campo] === true}
      deshabilitado={formulario.enCurso}
      alCambiar={(valor) => {
        formulario.cambiar(campo, valor)
      }}
    />
  )
}
