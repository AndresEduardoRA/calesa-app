// Composición del área `tarjeta` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../entities/apertura'
import { calculoDeLoGuardado } from '../../entities/calculo-de-la-tarjeta'
import type { HojaDeUnaGuardada } from '../../entities/hoja-de-una-guardada'
import { archivoDelPdf } from '../../entities/tarjeta/archivo-del-pdf'
import type { ContextoDeLaCotizacion } from '../../entities/tarjeta/contexto-de-la-cotizacion'
import {
  geometriaDeLaTarjeta,
  type Geometria,
} from '../../entities/tarjeta/geometria-de-la-tarjeta'
import { getAsesorDeLaCotizacion } from '../../infra/tarjeta/asesor-de-la-cotizacion'
import { logoDelPdf } from '../../infra/tarjeta/pdf/logo-del-pdf'
import { getTarjeta } from '../../infra/tarjeta/tarjeta'

// A quien creó una cotización guardada, para «Asesor:» de su tarjeta (4.18-2, P2 a).
export const leerAsesorDeLaCotizacion = getAsesorDeLaCotizacion

export type EntradaDelPdf = {
  // Lo que leyó `leerHojaDeUnaGuardada()` con la sesión de quien pide.
  lectura: { hoja: HojaDeUnaGuardada; inicial: RecalculoInicial }
  // Lo de la cotización, ya armado por la ruta (`contextoDeLaPagina()`): la fecha del último guardado en la zona de la empresa, el número, el título, el asesor,
  // el cliente si quien pide lo ve, el vehículo con lote y VIN, el vencimiento y el logo.
  contexto: ContextoDeLaCotizacion
  locale: string
  empresa: string
  topeDelLogo: number
}

// El PDF de una cotización guardada (4.18-3a): la tarjeta de **lo guardado** (`calculoDeLoGuardado()`, como «Vista previa» de esa guardada; nunca lo de hoy) con la lectura de
// la tarjeta de SU versión como quien pide. react-pdf se carga sólo aquí, con `import()` (C9). `sin_permiso` si la tarjeta no se ve; lo demás que falle, `inesperado`.
// La geometría de la tarjeta de **lo guardado** de una cotización (`calculoDeLoGuardado()`, como «Vista previa» de esa guardada; nunca lo de hoy), con la lectura
// de la tarjeta de SU versión como quien pide. `sin_permiso` si la tarjeta no se ve.
async function geometriaDeUnaGuardada(
  entrada: EntradaDelPdf,
): Promise<Resultado<{ geometria: Geometria; hoja: HojaDeUnaGuardada }>> {
  const { hoja, inicial } = entrada.lectura
  const tarjeta = await getTarjeta(hoja.diseno.formula.id)
  if (!tarjeta.ok) {
    return { ok: false, error: tarjeta.error }
  }
  const geometria = geometriaDeLaTarjeta({
    lectura: tarjeta.data,
    calculo: calculoDeLoGuardado(hoja, inicial.respuesta),
    contexto: entrada.contexto,
    monedaBs: hoja.diseno.cabecera.monedaBs,
    locale: entrada.locale,
  })
  return ok({ geometria, hoja })
}

// El logo, sólo si la tarjeta lo dibuja.
const conLogo = (geometria: Geometria) => geometria.celdas.some((c) => c.contenido.tipo === 'logo')

// El PDF de una cotización guardada (4.18-3a): la geometría de lo guardado en A4. react-pdf se carga sólo aquí, con `import()` (C9). `sin_permiso` si la
// tarjeta no se ve; lo demás que falle, `inesperado`.
export async function pdfDeUnaGuardada(
  entrada: EntradaDelPdf,
): Promise<Resultado<{ bytes: Uint8Array<ArrayBuffer>; archivo: string }>> {
  const armada = await geometriaDeUnaGuardada(entrada)
  if (!armada.ok) {
    return armada
  }
  const { geometria, hoja } = armada.data
  const logo = await logoDelPdf({
    logo: conLogo(geometria) ? entrada.contexto.logo : null,
    tope: entrada.topeDelLogo,
  })
  try {
    const { pdfDeLaTarjeta } = await import('../../infra/tarjeta/pdf/pdf-de-la-tarjeta')
    const bytes = await pdfDeLaTarjeta({
      geometria,
      numero: hoja.cotizacion.numero,
      logo,
      empresa: entrada.empresa,
    })
    return ok({ bytes, archivo: archivoDelPdf(hoja.cotizacion.numero) ?? 'cotizacion.pdf' })
  } catch (error) {
    console.error('[pdf] No se pudo dibujar la tarjeta.', error)
    return fallo('inesperado', 'No se pudo armar el PDF.')
  }
}

// La tarjeta de lo guardado como imagen PNG (`ImageResponse`, al ancho de la tarjeta en px): la misma geometría que el PDF. `next/og` se carga sólo aquí, con
// `import()`, y nunca llega al navegador. La usa la portada de la cotización; esta área no le da ruta. `sin_permiso` si la tarjeta no se ve; lo demás,
// `inesperado`.
export async function imagenDeUnaGuardada(
  entrada: EntradaDelPdf,
): Promise<Resultado<{ bytes: Uint8Array<ArrayBuffer>; ancho: number; alto: number }>> {
  const armada = await geometriaDeUnaGuardada(entrada)
  if (!armada.ok) {
    return armada
  }
  const { geometria } = armada.data
  const logo = await logoDelPdf({
    logo: conLogo(geometria) ? entrada.contexto.logo : null,
    tope: entrada.topeDelLogo,
  })
  try {
    const { pngDeLaTarjeta } = await import('../../infra/tarjeta/imagen/imagen-de-la-tarjeta')
    const bytes = await pngDeLaTarjeta({ geometria, logo })
    return ok({ bytes, ancho: Math.ceil(geometria.ancho), alto: Math.ceil(geometria.alto) })
  } catch (error) {
    console.error('[imagen] No se pudo dibujar la tarjeta.', error)
    return fallo('inesperado', 'No se pudo armar la imagen de la tarjeta.')
  }
}
