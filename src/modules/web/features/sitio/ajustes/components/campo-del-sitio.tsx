'use client'

import type { ComponentProps } from 'react'
import { Campo } from '@/shared/ui/campo'
import type { CampoDeTexto } from '../../../../entities/sitio/tarjetas-del-sitio'
import type { TarjetaDeTextoEnModal } from '../hooks/use-tarjeta-de-texto'

// Un campo de texto de un modal de «Ajustes», atado a lo escrito: el motivo del envío sale junto a él, escribir lo quita y mientras guarda no se edita.
export function CampoDelSitio({
  modal,
  campo,
  etiqueta,
  ...resto
}: {
  modal: TarjetaDeTextoEnModal
  campo: CampoDeTexto
  etiqueta: string
} & Omit<ComponentProps<typeof Campo>, 'nombre' | 'etiqueta' | 'value' | 'onChange' | 'error'>) {
  return (
    <Campo
      {...resto}
      nombre={campo}
      etiqueta={etiqueta}
      value={modal.escrito[campo] ?? ''}
      disabled={modal.formulario.enCurso}
      error={modal.formulario.errores[campo]}
      onChange={(evento) => {
        modal.cambiar(campo, evento.target.value)
      }}
    />
  )
}
