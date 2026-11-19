'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  ContextoDeLaRanura,
  ContextoDelMenuEstable,
  ContextoDelMenuVivo,
  type AporteAlMenu,
  type MenuEstable,
} from './contexto'

// El «⋯» de la cabecera de una guardada se arma con lo que suma cada uno desde donde vive (las áreas por los huecos, la vista previa, las revisiones, cotizar encima), sin que
// el núcleo importe un área: cada uno registra sus líneas aquí y el menú las ordena. Los hijos llegan como `children`: un aporte nuevo vuelve a dibujar el menú y «Guardar»,
// no a quien aporta. Sin este proveedor (la hoja nueva) nadie aporta y cada uno dibuja su botón como siempre.
export function ProveedorDelMenuDeLaGuardada({ children }: { children: ReactNode }) {
  const [aportes, setAportes] = useState<ReadonlyMap<string, AporteAlMenu>>(() => new Map())
  const [ranura, setRanura] = useState<HTMLElement | null>(null)
  const botonRef = useRef<HTMLButtonElement>(null)
  const estable = useMemo<MenuEstable>(
    () => ({
      aportar: (id, aporte) => {
        setAportes((antes) => {
          if (aporte === null && !antes.has(id)) {
            return antes
          }
          const despues = new Map(antes)
          if (aporte === null) {
            despues.delete(id)
          } else {
            despues.set(id, aporte)
          }
          return despues
        })
      },
      botonRef,
    }),
    [],
  )
  const vivo = useMemo(
    () => ({ lineas: Object.assign({}, ...aportes.values()) as AporteAlMenu, ranura }),
    [aportes, ranura],
  )
  return (
    <ContextoDelMenuEstable value={estable}>
      <ContextoDeLaRanura value={setRanura}>
        <ContextoDelMenuVivo value={vivo}>{children}</ContextoDelMenuVivo>
      </ContextoDeLaRanura>
    </ContextoDelMenuEstable>
  )
}
