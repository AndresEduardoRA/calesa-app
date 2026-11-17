import { buttonVariants } from '../button'

// Una opción que navega o abre algo dentro de «Vista y opciones» («Exportar…», «Papelera», «Etapas…»): a lo ancho, alineada a la izquierda y de
// 44 px en el celular. Sin `'use client'`: la usan también los Server Components que llenan un grupo (la papelera de cotizaciones).
export const CLASE_DE_OPCION = buttonVariants({
  variant: 'ghost',
  className: 'h-11 w-full justify-start px-2 md:h-9',
})
