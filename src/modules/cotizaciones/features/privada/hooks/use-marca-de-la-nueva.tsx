'use client'

import type { ReactNode } from 'react'
import { InterruptorPrivada } from '../components/interruptor-privada'
import { usePrivadaDeLaNueva } from './use-privada-de-la-nueva'

// La marca de privada que el marco de la hoja nueva (la de siempre y la en par) pasa a la hoja: lo que va en el pedido y el interruptor del pie, apagado mientras guarda.
export function useMarcaDeLaNueva(ocupado: boolean): { valor: boolean; interruptor: ReactNode } {
  const { privada, cambiar } = usePrivadaDeLaNueva()
  return {
    valor: privada,
    interruptor: <InterruptorPrivada privada={privada} alCambiar={cambiar} ocupado={ocupado} />,
  }
}
