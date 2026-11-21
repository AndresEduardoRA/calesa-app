'use client'

import type { ReactNode } from 'react'
import { MasAcciones, type AccionDeMenu } from '../lista'
import { BotonDeLaTarjeta } from './boton-de-la-tarjeta'
import { TarjetaDeAjustes } from './tarjeta-de-ajustes'

// «Editar» en el «⋯»: la primera línea, la principal; apagada dice por qué.
function accionesDeEditar(abrir: () => void, motivo: string | null, extra: AccionDeMenu[]) {
  return [
    {
      tipo: 'accion',
      clave: 'editar',
      etiqueta: 'Editar',
      principal: true,
      deshabilitada: motivo !== null,
      despuesDeCerrar: true,
      alElegir: abrir,
    },
    ...(motivo === null ? [] : [{ tipo: 'nota', clave: 'motivo', texto: motivo } as const]),
    ...extra,
  ] satisfies AccionDeMenu[]
}

type Props = {
  titulo: string
  // El `?panel=` del modal que abre.
  panel: string
  // Por qué no se puede editar (o `null`): apaga «Editar» y lo dice en el «⋯».
  motivo: string | null
  abrir: () => void
  estado?: ReactNode
  // Más acciones de la entidad, después de «Editar» en el «⋯».
  extra?: AccionDeMenu[]
  children: ReactNode
}

// Una tarjeta de ajustes que se edita en un modal: «Editar» a la vista y en el «⋯» (la lista única de acciones de la entidad).
export function TarjetaEditable({
  titulo,
  panel,
  motivo,
  abrir,
  estado,
  extra = [],
  children,
}: Props) {
  return (
    <TarjetaDeAjustes
      titulo={titulo}
      estado={estado}
      accion={<BotonDeLaTarjeta panel={panel} etiqueta="Editar" deshabilitado={motivo !== null} />}
      acciones={<MasAcciones nombre={titulo} acciones={accionesDeEditar(abrir, motivo, extra)} />}
    >
      {children}
    </TarjetaDeAjustes>
  )
}
