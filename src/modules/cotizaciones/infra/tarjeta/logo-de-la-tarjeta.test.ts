// @vitest-environment node
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { geometriaDeLaTarjeta } from '../../entities/tarjeta/geometria-de-la-tarjeta'
import { tarjetaDesde } from '../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDePrueba,
  CONTEXTO_DE_PRUEBA,
  crudaDeLaTarjeta,
} from '../../entities/tarjeta/tarjeta.soporte'

vi.mock('server-only', () => ({}))

import { LADO_MAXIMO, logoParaDibujar } from './logo-de-la-tarjeta'

// El logo de los dibujos del servidor de la tarjeta (el PDF y la imagen): se baja con tope y espera; lo que react-pdf o satori no leen se convierte a PNG.
const URL_DEL_LOGO = 'http://127.0.0.1:54721/storage/v1/object/public/marca/logos/abc.png'
const LOGO = { nombre: 'Importadora', url: URL_DEL_LOGO }
const TOPE = 1024 * 1024

const AZUL = { r: 29, g: 78, b: 216 }
const raster = (ancho: number, alto: number) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: AZUL } })
const comoBytes = (b: Buffer) => new Uint8Array(b)
const PNG = comoBytes(await raster(40, 10).png().toBuffer())
const JPEG = comoBytes(await raster(40, 10).jpeg().toBuffer())
const WEBP = comoBytes(await raster(400, 100).webp().toBuffer())
const PNG_GRANDE = comoBytes(await raster(3000, 750).png().toBuffer())
const WEBP_ROTO = new TextEncoder().encode('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')
const svg = (cuerpo: string, prologo = '') =>
  new TextEncoder().encode(
    `${prologo}<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 10">${cuerpo}</svg>`,
  )
const SVG_SIMPLE = svg('<rect width="40" height="10" fill="#0a7f3c"/>')
// Un PNG de 1 × 1 en base64, para un `<image href="data:…">`.
const PIXEL =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

let llamadas: string[] = []
let responder: (url: string, init: RequestInit | undefined) => Promise<Response>
const avisos = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

beforeEach(() => {
  llamadas = []
  avisos.mockClear()
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    llamadas.push(String(url))
    return responder(String(url), init)
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
})

const con = (bytes: Uint8Array<ArrayBuffer>, cabeceras: Record<string, string> = {}) => {
  responder = () => Promise.resolve(new Response(bytes, { status: 200, headers: cabeceras }))
}
const bajar = (mas: Partial<Parameters<typeof logoParaDibujar>[0]> = {}) =>
  logoParaDibujar({ logo: LOGO, tope: TOPE, ...mas })

describe('logoParaDibujar: qué logo dibujan el PDF y la imagen', () => {
  it.each([
    ['PNG', PNG, 'png'],
    ['JPEG', JPEG, 'jpg'],
    ['un SVG simple', SVG_SIMPLE, 'svg'],
    [
      'un SVG con prólogo XML',
      svg('<rect width="1" height="1"/>', '<?xml version="1.0"?>\n'),
      'svg',
    ],
  ])('%s va tal cual, con sus medidas', async (_nombre, bytes, tipo) => {
    con(bytes)
    const logo = await bajar()
    expect(logo?.tipo).toBe(tipo)
    expect(logo && Buffer.compare(logo.datos, Buffer.from(bytes))).toBe(0)
    expect(logo && { ancho: logo.ancho, alto: logo.alto }).toEqual({ ancho: 40, alto: 10 })
    expect(llamadas).toEqual([URL_DEL_LOGO])
  })

  it.each([
    ['<style>', '<style>.a{fill:#0a7f3c}</style><rect class="a" width="40" height="10"/>'],
    ['class=', '<rect class="a" width="40" height="10"/>'],
    ['<use', '<defs><rect id="a" width="40" height="10"/></defs><use href="#a"/>'],
    ['<mask', '<mask id="a"/><rect width="40" height="10"/>'],
    ['<filter', '<filter id="a"/><rect width="40" height="10"/>'],
    ['<image> con data:', `<image href="data:image/png;base64,${PIXEL}" width="40" height="10"/>`],
  ])('un SVG con %s se convierte a PNG del lado máximo', async (_que, cuerpo) => {
    con(svg(cuerpo))
    const logo = await bajar()
    expect(logo?.tipo).toBe('png')
    expect(logo && { ancho: logo.ancho, alto: logo.alto }).toEqual({
      ancho: LADO_MAXIMO,
      alto: 256,
    })
    expect(
      Buffer.from(logo?.datos ?? [])
        .subarray(1, 4)
        .toString('latin1'),
    ).toBe('PNG')
  })

  it.each([
    ['<image> de otro lado', '<image href="http://127.0.0.1:9/otro.png" width="40" height="10"/>'],
    ['<image> de un archivo', '<image xlink:href="otro.png" width="40" height="10"/>'],
    ['<use> de otro archivo', '<use href="otro.svg#a"/>'],
    ['url() de otro archivo', '<rect width="40" height="10" fill="url(otro.svg#g)"/>'],
    ['@import', '<style>@import "otro.css";</style>'],
  ])('un SVG con %s no se dibuja', async (_que, cuerpo) => {
    con(svg(cuerpo))
    expect(await bajar()).toBeNull()
    expect(llamadas).toEqual([URL_DEL_LOGO])
  })

  it('un WebP se convierte a PNG con sus medidas', async () => {
    con(WEBP)
    const logo = await bajar()
    expect(logo && { tipo: logo.tipo, ancho: logo.ancho, alto: logo.alto }).toEqual({
      tipo: 'png',
      ancho: 400,
      alto: 100,
    })
    expect((await sharp(logo?.datos).metadata()).format).toBe('png')
  })

  it('un raster de más del lado máximo sale achicado, sin deformar', async () => {
    con(PNG_GRANDE)
    const logo = await bajar()
    expect(logo && { tipo: logo.tipo, ancho: logo.ancho, alto: logo.alto }).toEqual({
      tipo: 'png',
      ancho: LADO_MAXIMO,
      alto: 256,
    })
  })

  it('un WebP roto o algo que no es una imagen no se dibujan', async () => {
    con(WEBP_ROTO)
    expect(await bajar()).toBeNull()
    con(new TextEncoder().encode('<html>hola</html>'))
    expect(await bajar()).toBeNull()
  })
})

describe('logoParaDibujar: lo que pesa, tarda o falla no va, y no lanza', () => {
  it('más pesado que el tope, por content-length, no se dibuja', async () => {
    con(PNG, { 'content-length': String(TOPE + 1) })
    expect(await bajar()).toBeNull()
  })

  it('más pesado que el tope al leerlo, sin content-length, no se dibuja', async () => {
    const grande = new Uint8Array(PNG.length + 64)
    grande.set(PNG)
    con(grande)
    expect(await bajar({ tope: 32 })).toBeNull()
  })

  it('si no responde a tiempo, o con la señal ya abortada, no se dibuja', async () => {
    responder = (_url, init) =>
      new Promise((_resolver, rechazar) => {
        // Como el `fetch` de verdad: con la señal ya abortada rechaza en el acto.
        if (init?.signal?.aborted) {
          rechazar(init.signal.reason)
        }
        init?.signal?.addEventListener('abort', () => {
          rechazar(init.signal?.reason)
        })
      })
    expect(await bajar({ esperaMs: 10 })).toBeNull()
    expect(await bajar({ signal: AbortSignal.abort() })).toBeNull()
  })

  it('un 404 o un fetch que lanza no se dibujan, y ninguno lanza', async () => {
    responder = () => Promise.resolve(new Response('no', { status: 404 }))
    expect(await bajar()).toBeNull()
    responder = () => Promise.reject(new TypeError('fetch failed'))
    expect(await bajar()).toBeNull()
  })

  it('lo que no se dibuja lo avisa por consola con su motivo, sin la URL', async () => {
    con(WEBP_ROTO)
    await bajar()
    expect(avisos).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(avisos.mock.calls)).not.toContain(URL_DEL_LOGO)
  })

  it('sin logo que pedir no baja nada: una tarjeta sin celda de logo no lo pide; la de por omisión, sí', async () => {
    con(PNG)
    // Quien pide (`pdfDeUnaGuardada()`) pasa el logo sólo si la geometría tiene una celda de logo.
    const pedido = (cruda: unknown) => {
      const lectura = tarjetaDesde(cruda)
      if (lectura === null) {
        throw new Error('La tarjeta de prueba no cumple su esquema.')
      }
      const g = geometriaDeLaTarjeta({
        lectura,
        calculo: calculoDePrueba(),
        contexto: { ...CONTEXTO_DE_PRUEBA, logo: LOGO },
        monedaBs: null,
        locale: 'es-BO',
      })
      return g.celdas.some((c) => c.contenido.tipo === 'logo') ? LOGO : null
    }
    const definicion = crudaDeLaTarjeta().definicion
    const sinLogo = { ...definicion, celdas: definicion.celdas.filter((c) => c.id !== 'c_logo') }
    expect(
      await logoParaDibujar({
        logo: pedido(crudaDeLaTarjeta({ definicion: sinLogo })),
        tope: TOPE,
      }),
    ).toBeNull()
    expect(await logoParaDibujar({ logo: null, tope: TOPE })).toBeNull()
    expect(llamadas).toEqual([])
    expect(
      (await logoParaDibujar({ logo: pedido({ estado: 'sin_plantilla' }), tope: TOPE }))?.tipo,
    ).toBe('png')
    expect(llamadas).toEqual([URL_DEL_LOGO])
  })
})
