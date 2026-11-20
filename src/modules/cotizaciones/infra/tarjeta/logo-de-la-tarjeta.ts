import 'server-only'
import type { ContextoDeLaCotizacion } from '../../entities/tarjeta/contexto-de-la-cotizacion'

// Una imagen para los dibujos del servidor de la tarjeta (el PDF y la imagen): el logo de la empresa y la foto del asesor. Se baja aquí con tope de bytes y de tiempo y llega como `Buffer`, nunca
// como URL (react-pdf la bajaría sin espera ni tope y la guardaría en su caché de proceso), con sus medidas: los dos dibujos lo ubican en la celda con
// `cajaDelLogo()`. Va según sus primeros bytes:
// - PNG y JPEG de hasta `LADO_MAXIMO` px, tal cual;
// - un SVG que react-pdf (`@react-pdf/svg` 1.1.1) dibuja fiel, sin lo que se salta (`<style>` y las clases, `use`, `symbol`, `mask`, `filter`, `pattern`,
//   `<image>`), tal cual: vector en el PDF;
// - lo demás que `sharp` lee (el WebP con que se suben los logos, un SVG con estilos, un raster grande), convertido a PNG de hasta `LADO_MAXIMO` px.
// Un SVG que nombra otro archivo (un `href` o un `url()` que no es `#…` ni `data:`, un `@import`, un `<!ENTITY`) no se dibuja: leería algo sin tope ni espera.
// Por eso es SVG todo lo que tenga `<svg` en el texto, aunque empiece con un comentario, un DOCTYPE o un BOM, y no se dibuja lo comprimido (un `.svgz` esconde
// su texto) ni lo que `sharp` lee como SVG sin que el texto lo dijera. Una imagen que no va, que tarda o que pesa de más deja el dibujo sin ella (la foto, con las
// iniciales) y lo dice por consola, sin la URL; nunca rompe el dibujo.
export type LogoDeLaTarjeta = {
  datos: Buffer
  tipo: 'png' | 'jpg' | 'svg'
  ancho: number
  alto: number
}

type Espera = {
  tope: number
  esperaMs?: number
  // Para las pruebas: una señal propia en vez de la espera.
  signal?: AbortSignal
}

const ESPERA_MS = 2000
// El tope del lado de un logo raster (`docs/DECISIONES.md`): lo que se convierte no pasa de aquí, y lo que se lee no pasa de 4.096² px.
export const LADO_MAXIMO = 1024
const PIXELES_MAXIMOS = 4096 * 4096
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const SVG_INFIEL = /<style\b|\sclass\s*=|<use\b|<symbol\b|<mask\b|<filter\b|<pattern\b|<image\b/i
const SVG_CON_OTRO_ARCHIVO =
  /\bhref\s*=\s*["']\s*(?!#|data:)|url\(\s*["']?\s*(?!#|data:)|@import\b|<!ENTITY\b/i

type Tipo = 'png' | 'jpg' | 'svg' | 'svg_infiel' | 'svg_con_otro_archivo' | 'comprimido' | 'otro'

function tipoDe(datos: Buffer): Tipo {
  if (datos.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG)) {
    return 'png'
  }
  if (datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) {
    return 'jpg'
  }
  if (datos[0] === 0x1f && datos[1] === 0x8b) {
    return 'comprimido'
  }
  const texto = datos.toString('utf8')
  if (!/<svg\b/i.test(texto)) {
    return 'otro'
  }
  if (SVG_CON_OTRO_ARCHIVO.test(texto)) {
    return 'svg_con_otro_archivo'
  }
  // react-pdf reconoce un SVG sólo si empieza así, sin nada antes; el resto lo rasteriza `sharp`.
  return /^(<\?xml|<svg)/.test(texto) && !SVG_INFIEL.test(texto) ? 'svg' : 'svg_infiel'
}

// El cuerpo, hasta el tope: un `content-length` mayor o pasarse al leer dejan de leer. Lo que no es un logo es un motivo, no un error.
async function bajar(url: string, tope: number, signal: AbortSignal): Promise<Buffer | string> {
  const respuesta = await fetch(url, { signal, cache: 'no-store' })
  if (!respuesta.ok || respuesta.body === null) {
    return `la respuesta fue ${String(respuesta.status)}`
  }
  if (Number(respuesta.headers.get('content-length') ?? 0) > tope) {
    return 'pesa más que el tope'
  }
  const trozos: Uint8Array[] = []
  let leidos = 0
  const lector = respuesta.body.getReader()
  for (let r = await lector.read(); !r.done; r = await lector.read()) {
    leidos += r.value.byteLength
    if (leidos > tope) {
      await lector.cancel()
      return 'pesa más que el tope'
    }
    trozos.push(r.value)
  }
  return Buffer.concat(trozos)
}

// Las medidas y, si hace falta, el PNG. `sharp` se carga sólo aquí (`import()`): otra ruta que importa la composición no lo paga.
async function paraDibujar(datos: Buffer, tipo: Tipo): Promise<LogoDeLaTarjeta | string> {
  const { default: sharp } = await import('sharp')
  const opciones = { limitInputPixels: PIXELES_MAXIMOS }
  const medidas = await sharp(datos, opciones).metadata()
  const ancho = medidas.width
  const alto = medidas.height
  if (!ancho || !alto) {
    return 'una imagen sin medidas'
  }
  if (tipo === 'otro' && medidas.format === 'svg') {
    return 'un SVG que no se pudo revisar'
  }
  if (
    tipo === 'svg' ||
    ((tipo === 'png' || tipo === 'jpg') && Math.max(ancho, alto) <= LADO_MAXIMO)
  ) {
    return { datos, tipo, ancho, alto }
  }
  // Un SVG se rasteriza a la densidad que lo deja de `LADO_MAXIMO` px: con la de 72 ppp un logo de 10 × 10 saldría borroso.
  const esSvg = medidas.format === 'svg'
  const densidad = Math.min(2400, Math.max(1, (72 * LADO_MAXIMO) / Math.max(ancho, alto)))
  const { data, info } = await sharp(datos, esSvg ? { ...opciones, density: densidad } : opciones)
    .resize({
      width: LADO_MAXIMO,
      height: LADO_MAXIMO,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer({ resolveWithObject: true })
  return { datos: data, tipo: 'png', ancho: info.width, alto: info.height }
}

// La imagen de `url` lista para dibujar, o nula. `etiqueta` es lo que el aviso dice que falta («logo», «foto del asesor»).
export async function imagenParaDibujar({
  url,
  etiqueta,
  tope,
  esperaMs = ESPERA_MS,
  signal,
}: Espera & { url: string; etiqueta: string }): Promise<LogoDeLaTarjeta | null> {
  const bajado = await bajar(url, tope, signal ?? AbortSignal.timeout(esperaMs)).catch(
    () => 'no se pudo bajar a tiempo',
  )
  let motivo: string
  if (typeof bajado === 'string') {
    motivo = bajado
  } else {
    const tipo = tipoDe(bajado)
    const listo =
      tipo === 'svg_con_otro_archivo'
        ? 'un SVG que nombra otro archivo'
        : tipo === 'comprimido'
          ? 'un archivo comprimido'
          : await paraDibujar(bajado, tipo).catch(() => 'un formato que no se pudo leer')
    if (typeof listo !== 'string') {
      return listo
    }
    motivo = listo
  }
  console.warn(`[tarjeta] La tarjeta sale sin ${etiqueta}: ${motivo}.`)
  return null
}

// El logo de la empresa: nulo si la tarjeta no lo dibuja o la empresa no tiene uno (entonces no se baja nada).
export function logoParaDibujar({
  logo,
  ...espera
}: Espera & { logo: ContextoDeLaCotizacion['logo'] }): Promise<LogoDeLaTarjeta | null> {
  return logo === null
    ? Promise.resolve(null)
    : imagenParaDibujar({ url: logo.url, etiqueta: 'logo', ...espera })
}

// La foto del asesor: nula si la tarjeta no la dibuja o el asesor no tiene una (entonces no se baja nada y la celda lleva sus iniciales).
export function fotoParaDibujar({
  foto,
  ...espera
}: Espera & { foto: string | null }): Promise<LogoDeLaTarjeta | null> {
  return foto === null || foto === ''
    ? Promise.resolve(null)
    : imagenParaDibujar({ url: foto, etiqueta: 'foto del asesor', ...espera })
}
