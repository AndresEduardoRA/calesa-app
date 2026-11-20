// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ANCHO_MAXIMO_DE_LA_IMAGEN, webpDeLaTarjeta } from './webp-de-la-tarjeta'

const png = (ancho: number, alto: number) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: '#e5e7eb' } })
    .png()
    .toBuffer()

const ascii = (bytes: Uint8Array, desde: number, hasta: number) =>
  String.fromCharCode(...bytes.slice(desde, hasta))

describe('webpDeLaTarjeta', () => {
  it('da un WebP (RIFF…WEBP) del mismo tamaño si el PNG es chico', async () => {
    const webp = await webpDeLaTarjeta(await png(960, 512))
    expect(ascii(webp, 0, 4)).toBe('RIFF')
    expect(ascii(webp, 8, 12)).toBe('WEBP')
    expect(await sharp(webp).metadata()).toMatchObject({ format: 'webp', width: 960, height: 512 })
  })

  it('achica a 1.600 px de ancho uno más ancho, con su proporción', async () => {
    const webp = await webpDeLaTarjeta(await png(2000, 1000))
    expect(await sharp(webp).metadata()).toMatchObject({
      width: ANCHO_MAXIMO_DE_LA_IMAGEN,
      height: 800,
    })
  })
})

describe('webpDeLaTarjeta con el ancho de la miniatura', () => {
  it('achica el PNG a 480 px con su proporción, y no agranda uno más chico', async () => {
    expect(
      await sharp(await webpDeLaTarjeta(await png(1600, 853), { ancho: 480 })).metadata(),
    ).toMatchObject({
      format: 'webp',
      width: 480,
      height: 256,
    })
    expect(
      await sharp(await webpDeLaTarjeta(await png(300, 160), { ancho: 480 })).metadata(),
    ).toMatchObject({
      width: 300,
    })
  })
})
