// Composición del área `tarjeta` de `cotizaciones` en el servidor (4.15-4). Sale por la `composicion.ts` de la raíz.
import 'server-only'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../entities/apertura'
import { calculoDeLoGuardado } from '../../entities/calculo-de-la-tarjeta'
import { nombreDelModo } from '../../entities/cabecera-de-la-hoja'
import type { HojaDeUnaGuardada } from '../../entities/hoja-de-una-guardada'
import { archivoDelPdf } from '../../entities/tarjeta/archivo-del-pdf'
import {
  lineasDeLaTarjeta,
  type LineasDeLaTarjeta,
} from '../../entities/tarjeta/compartir/lineas-de-la-tarjeta'
import type { ContextoDeLaCotizacion } from '../../entities/tarjeta/contexto-de-la-cotizacion'
import {
  geometriaDeLaTarjeta,
  type Geometria,
} from '../../entities/tarjeta/geometria-de-la-tarjeta'
import { getAsesorDeLaCotizacion } from '../../infra/tarjeta/asesor-de-la-cotizacion'
import { logoDelPdf } from '../../infra/tarjeta/pdf/logo-del-pdf'
import {
  bajarLaPortada as bajar,
  getEstadoDeLaPortada,
  ponerLaPortada,
  subirLaPortada,
} from '../../infra/tarjeta/portada'
import { getTarjeta } from '../../infra/tarjeta/tarjeta'
import { getVehiculoDeLaCotizacion } from '../../infra/tarjeta/vehiculo-de-la-cotizacion'

// A quien creó una cotización guardada, para «Asesor:» de su tarjeta (4.18-2, P2 a).
export const leerAsesorDeLaCotizacion = getAsesorDeLaCotizacion

// El vehículo de una cotización guardada (por clave primaria, sin la papelera), para las fotos de «Compartir la cotización».
export const leerVehiculoDeLaCotizacion = getVehiculoDeLaCotizacion

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

type EntradaDeLaGeometria = Pick<EntradaDelPdf, 'lectura' | 'contexto' | 'locale'>

// La geometría de la tarjeta de **lo guardado** de una cotización (`calculoDeLoGuardado()`, como «Vista previa» de esa guardada; nunca lo de hoy), con la lectura
// de la tarjeta de SU versión como quien pide. `sin_permiso` si la tarjeta no se ve.
async function geometriaDeUnaGuardada(
  entrada: EntradaDeLaGeometria,
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

// Las cifras de «Compartir la cotización»: los montos de la tarjeta de lo guardado como líneas de texto (sólo lo que la tarjeta dibuja: el nivel «todos», K4) y el
// nombre del modo con que se guardó. Lo pide `GET /cotizaciones/[id]/compartir`; el texto lo arma el navegador. `sin_permiso` si la tarjeta no se ve.
export async function paraCompartirDeUnaGuardada(
  entrada: EntradaDeLaGeometria,
): Promise<Resultado<LineasDeLaTarjeta & { modo: string | null }>> {
  const armada = await geometriaDeUnaGuardada(entrada)
  if (!armada.ok) {
    return armada
  }
  const { geometria, hoja } = armada.data
  return ok({
    ...lineasDeLaTarjeta(geometria),
    modo: nombreDelModo(hoja.diseno.cabecera, hoja.cotizacion.modoTc),
  })
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

// La portada de la cotización (`docs/COTIZADOR.md` › «La portada de la cotización»): el estado para quien pide y la guardada, con su sesión.
export const leerLaPortada = getEstadoDeLaPortada
export const bajarLaPortada = bajar

// La portada: la imagen de lo guardado (`imagenDeUnaGuardada()`) en WebP de hasta 1.600 px. `sharp` se carga sólo aquí, con `import()`, y nunca llega al navegador.
export async function imagenDeLaPortada(
  entrada: EntradaDelPdf,
): Promise<Resultado<Uint8Array<ArrayBuffer>>> {
  const png = await imagenDeUnaGuardada(entrada)
  if (!png.ok) {
    return png
  }
  try {
    const { webpDeLaTarjeta } = await import('../../infra/tarjeta/imagen/webp-de-la-tarjeta')
    return ok(await webpDeLaTarjeta(png.data.bytes))
  } catch (error) {
    console.error('[portada] No se pudo pasar la tarjeta a WebP.', error)
    return fallo('inesperado', 'No se pudo armar la vista previa.')
  }
}

// Guarda la portada armada con la clave que se leyó **antes** de leer la hoja: sube el objeto y lo anota. Si la clave cambió mientras se armaba (PT409), no se
// guarda y no es un error (`guardada: false`): quien la pidió ya tiene la suya.
export async function guardarLaPortada({
  id,
  bytes,
  clave,
}: {
  id: string
  bytes: Uint8Array<ArrayBuffer>
  clave: string
}): Promise<Resultado<{ guardada: boolean }>> {
  const subida = await subirLaPortada(id, bytes)
  if (!subida.ok) {
    return subida
  }
  const puesta = await ponerLaPortada(id, subida.data, clave)
  if (!puesta.ok) {
    return puesta.error.codigo === 'conflicto' ? ok({ guardada: false }) : puesta
  }
  return ok({ guardada: true })
}
