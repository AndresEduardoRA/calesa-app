'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { MOTIVO_INACTIVO_EN_LA_BARRA, MOTIVO_TOPE_EN_LA_BARRA } from '../../../entities/motivos'
import {
  motivoParaNoMarcar,
  tiposEnLaBarra,
  TOPE_EN_LA_BARRA,
  type TipoCambio,
} from '../../../entities/tipos-cambio'

type Props = {
  // El tipo de cambio del panel, como está guardado.
  tipo: TipoCambio
  // Todos, como están guardados: el tope y el por defecto a la vista salen de acá.
  tipos: readonly TipoCambio[]
  // Lo que dice el interruptor «Activo» del formulario.
  activo: boolean
  valor: boolean
  alCambiar: (enLaBarra: boolean) => void
  // Sin permiso, o guardando.
  bloqueado: boolean
}

function ayudaDe({ tipo, tipos, activo }: Pick<Props, 'tipo' | 'tipos' | 'activo'>): string {
  const motivo = motivoParaNoMarcar({ tipo, activo, tipos })
  if (motivo === 'tope') {
    return MOTIVO_TOPE_EN_LA_BARRA
  }
  // También el marcado que se desactiva: se puede quitar, pero no se ve.
  if (motivo === 'inactivo' || !activo) {
    return MOTIVO_INACTIVO_EN_LA_BARRA
  }
  const ninguno = !tipos.some((uno) => uno.activo && uno.enLaBarra)
  const porDefecto = ninguno ? tiposEnLaBarra(tipos)[0] : undefined
  if (porDefecto && porDefecto.id !== tipo.id) {
    return `Hoy la barra muestra el por defecto (${porDefecto.nombre}). Si marcas este, deja de verse: márcalo también si quieres los dos.`
  }
  return `Se ve a la vista en la barra superior, en toda pantalla. Hasta ${TOPE_EN_LA_BARRA}.`
}

// «En la barra superior» en el panel de un tipo de cambio: viaja en el mismo «Guardar» que el valor (una sola versión por fila). Sumarlo pide que
// esté activo y que haya lugar; quitarlo siempre se puede. Apagado, la ayuda dice por qué.
export function InterruptorEnLaBarra({ tipo, tipos, activo, valor, alCambiar, bloqueado }: Props) {
  const motivo = motivoParaNoMarcar({ tipo, activo, tipos })
  return (
    <Interruptor
      titulo="En la barra superior"
      ayuda={ayudaDe({ tipo, tipos, activo })}
      valor={valor}
      alCambiar={alCambiar}
      deshabilitado={bloqueado || (!tipo.enLaBarra && motivo !== null)}
    />
  )
}
