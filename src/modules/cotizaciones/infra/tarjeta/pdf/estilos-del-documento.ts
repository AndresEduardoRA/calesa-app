import 'server-only'
import { StyleSheet } from '@react-pdf/renderer'
import { FAMILIA_DEL_PDF } from './fuentes'

// La página del PDF de la tarjeta: A4 con 36 pt de margen. Lo demás (colores, letras, bordes) sale de la geometría de la tarjeta, celda por celda.
export const MARGEN_DEL_PDF = 36
// A4 en puntos.
export const PAGINA_A4 = { ancho: 595.28, alto: 841.89 } as const

export const estilos = StyleSheet.create({
  pagina: {
    fontFamily: FAMILIA_DEL_PDF,
    backgroundColor: '#ffffff',
    padding: MARGEN_DEL_PDF,
  },
})
