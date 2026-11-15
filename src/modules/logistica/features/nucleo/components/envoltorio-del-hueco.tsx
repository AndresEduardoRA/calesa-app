'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { ATRIBUTO_DEL_BLOQUE, useAlPedirAbrirElHueco } from '../hooks/eventos-de-la-unidad'

type Props = {
  clave: string
  // La pestaña que lo contiene (`dinero` para gastos, pagos y margen); nula en la zona principal, que no tiene pestañas.
  pestana: string | null
  // ¿Su pestaña es la que se ve? Siempre verdadero en la zona principal.
  visible: boolean
  // El hueco se monta la primera vez que se ve su pestaña y queda montado: lo escrito no se pierde al cambiar de pestaña.
  montado: boolean
  elegirPestana: () => void
  children: ReactNode
}

// El lugar de un hueco en las zonas. Existe desde el primer render aunque su pestaña no se haya visto (`useHayHueco` mira el DOM una sola vez y los atajos —«Ir a Gastos», el de cada requisito—
// dependen de eso). Un aviso «abre ese hueco» elige su pestaña y, ya visible, lo trae a la vista y lleva el foco a la pestaña (o, en la principal, a la sección): un `focus()` sobre algo `hidden` no hace nada.
export function EnvoltorioDelHueco({
  clave,
  pestana,
  visible,
  montado,
  elegirPestana,
  children,
}: Props) {
  const raiz = useRef<HTMLDivElement>(null)
  const pendiente = useRef(false)
  const llevarElFoco = () => {
    raiz.current?.scrollIntoView({ block: 'nearest' })
    if (pestana === null) {
      raiz.current?.closest<HTMLElement>('[data-zona=principal]')?.focus()
      return
    }
    raiz.current
      ?.closest('[data-slot=panel-de-la-unidad]')
      ?.querySelector<HTMLElement>(`[role=tab][data-pestana="${CSS.escape(pestana)}"]`)
      ?.focus()
  }
  useAlPedirAbrirElHueco(clave, () => {
    if (visible) {
      llevarElFoco()
      return
    }
    pendiente.current = true
    elegirPestana()
  })
  useEffect(() => {
    if (visible && pendiente.current) {
      pendiente.current = false
      llevarElFoco()
    }
  })
  return (
    <div ref={raiz} {...{ [ATRIBUTO_DEL_BLOQUE]: clave }}>
      {montado ? children : null}
    </div>
  )
}
