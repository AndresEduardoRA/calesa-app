import 'server-only'
import path from 'node:path'
import { Font } from '@react-pdf/renderer'
import {
  CARPETA_DE_LAS_FUENTES,
  FAMILIA_DE_LA_TARJETA,
  VARIANTES_DE_LAS_FUENTES,
} from '../fuentes-de-la-tarjeta'

// Las fuentes del PDF (4.18-3a, C8, P1): las de la tarjeta (`fuentes-de-la-tarjeta.ts`), registradas una vez por proceso con la ruta del archivo, rectas e
// itálicas en la misma familia. Sin separación en sílabas: no parte un monto ni un nombre.
export const FAMILIA_DEL_PDF = FAMILIA_DE_LA_TARJETA

let registradas = false

export function registrarFuentes(): void {
  if (registradas) {
    return
  }
  Font.register({
    family: FAMILIA_DEL_PDF,
    fonts: VARIANTES_DE_LAS_FUENTES.map((v) => ({
      src: path.join(CARPETA_DE_LAS_FUENTES, v.archivo),
      fontWeight: v.peso,
      fontStyle: v.italica ? 'italic' : 'normal',
    })),
  })
  Font.registerHyphenationCallback((palabra) => [palabra])
  registradas = true
}
