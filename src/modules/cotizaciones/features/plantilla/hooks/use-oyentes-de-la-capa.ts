'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import type { PlantillaEnCuadricula } from '../../../entities/cuadricula-de-la-tarjeta'
import type { CapaCalculada } from './use-capa-de-edicion'
import { useAtajosDelLienzo } from './use-atajos-del-lienzo'
import type { EditorDeLaCuadricula } from './use-editor-de-la-cuadricula'
import { usePunteroDelLienzo } from './use-puntero-del-lienzo'

type Args = {
  editor: EditorDeLaCuadricula
  plantilla: PlantillaEnCuadricula
  capa: CapaCalculada
  rejilla: RefObject<HTMLDivElement | null>
  alEditarContenido: () => void
}

// Los oyentes de la grilla del lienzo (teclado, portapapeles, puntero y foco), el menú contextual abierto y si la grilla tiene el foco (para dibujar el cursor). Un
// cursor movido con el teclado queda a la vista (el marco se desplaza de costado en «100 %»); con el puntero no se desplaza nada: movería la tarjeta bajo el puntero
// y el `pointerover` siguiente agrandaría lo elegido.
export function useOyentesDeLaCapa({ editor, plantilla, capa, rejilla, alEditarContenido }: Args) {
  const [conFoco, setConFoco] = useState(false)
  const [menu, setMenu] = useState(false)
  // El cursor se movió con el teclado (no con el puntero, que ya está donde mira): sólo entonces se lo lleva a la vista.
  const porTeclado = useRef(false)
  const enfocar = () => rejilla.current?.focus()
  const buscar = (selector: string) =>
    rejilla.current?.parentElement?.querySelector<HTMLElement>(selector)
  const abrirMenu = () => {
    setMenu(true)
  }
  const atajos = useAtajosDelLienzo({
    editor,
    visibles: capa.d.visibles,
    alEditarContenido,
    alAbrirMenu: abrirMenu,
    alSalirPorLaIzquierda: (f) =>
      buscar(`[data-asa-de-fila="${plantilla.filas[f]?.id ?? ''}"] button`)?.focus(),
    alSalirPorArriba: (k) =>
      buscar(`[data-borde-de-columna="${plantilla.columnas[k]?.id ?? ''}"]`)?.focus(),
  })
  const puntero = usePunteroDelLienzo({
    editor,
    plantilla,
    rango: capa.rango,
    visibles: capa.d.visibles,
    piezaEn: capa.piezaEn,
    enfocar,
    alEditarContenido,
    alAbrirMenu: abrirMenu,
  })
  const { activa, idDe } = capa
  useEffect(() => {
    if (!porTeclado.current) return
    porTeclado.current = false
    document
      .getElementById(idDe(activa.f, activa.k))
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa.f, activa.k])
  return {
    conFoco,
    menu,
    enfocar,
    cerrarMenu: () => {
      setMenu(false)
      requestAnimationFrame(() => requestAnimationFrame(enfocar))
    },
    oyentes: {
      onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
        porTeclado.current = e.target === e.currentTarget
        atajos.alTeclear(e)
      },
      onCopy: atajos.alCopiar,
      onPaste: atajos.alPegar,
      ...puntero,
      onFocus: () => {
        setConFoco(true)
      },
      onBlur: () => {
        setConFoco(false)
      },
    },
  }
}
