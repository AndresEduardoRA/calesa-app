'use client'

import type { ComponentProps } from 'react'
import { CONTENEDOR_DE_SECCIONES, REJILLA_DE_SECCIONES } from './clases-de-la-rejilla'
import { LugaresDeLaHoja } from './lugares-de-la-hoja'

// Las secciones de la hoja en su propio contenedor (`data-secciones`, `@container/secciones`): la rejilla de 12 pistas de las secciones se mide contra lo que le
// queda cuando el resumen está al costado, no contra el ancho de la hoja (una sección «Automática» va a la mitad desde 64 rem, como siempre).
// Mientras el resumen va al pie (debajo del corte `@4xl` del contenedor nombrado `hoja`, que no es el de la sección más cercana al input) lo enfocable lleva `scroll-margin-bottom` del alto máximo del resumen (40 % de la ventana): una celda que recibe
// el foco no queda tapada. Al costado ya no hace falta.
const PARA_QUE_EL_PIE_NO_TAPE =
  "[&_:is(input,button,select,[tabindex]):not([tabindex='-1'])]:scroll-mb-[40dvh] @4xl/hoja:[&_:is(input,button,select,[tabindex]):not([tabindex='-1'])]:scroll-mb-0"

export function SeccionesDeLaHoja(props: ComponentProps<typeof LugaresDeLaHoja>) {
  return (
    <div data-secciones="" className={`${CONTENEDOR_DE_SECCIONES} ${PARA_QUE_EL_PIE_NO_TAPE}`}>
      <div className={REJILLA_DE_SECCIONES}>
        <LugaresDeLaHoja {...props} />
      </div>
    </div>
  )
}
