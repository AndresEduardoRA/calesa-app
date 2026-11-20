// Lo que prepara `e2e/cotizacion-tarjeta-logo.spec.ts`: los logos de prueba (un WebP real y un PNG, 4:1 y de un color que no es blanco, hechos con `sharp`), la
// réplica de V1 con su celda logo alineada abajo a la derecha, la caja interior de esa celda en px de la tarjeta y lo que pinta la imagen de la tarjeta en ella.
// Sólo para las pruebas.
import { readFileSync } from 'node:fs'
import sharp from 'sharp'
import type { Locator } from '@playwright/test'

export const AZUL = { r: 0x1d, g: 0x4e, b: 0xd8 }
const logo4a1 = () => sharp({ create: { width: 400, height: 100, channels: 3, background: AZUL } })

export async function logosDePrueba() {
  return {
    webp: {
      datos: await logo4a1().webp({ quality: 90 }).toBuffer(),
      extension: 'webp',
      tipo: 'image/webp',
    },
    png: { datos: await logo4a1().png().toBuffer(), extension: 'png', tipo: 'image/png' },
  }
}

type Celda = { id: string; contenido: Record<string, unknown>; estilo?: Record<string, unknown> }
type Plantilla = { celdas: Celda[] } & Record<string, unknown>

const REPLICA = JSON.parse(
  readFileSync('src/modules/cotizaciones/entities/tarjeta/plantilla-como-v1-usa.json', 'utf8'),
) as Plantilla

// La réplica con su celda `logo` (3 columnas × 2 filas) abajo a la derecha: lo que `<Marca>` no respetaba. Con `conElNombre`, la fecha pasa a ser el nombre de la
// empresa.
export function plantillaConElLogo(conElNombre = false): Plantilla {
  return {
    ...REPLICA,
    celdas: REPLICA.celdas.map((c) => {
      if (c.id === 'logo')
        return { ...c, estilo: { alinear: 'derecha', alinear_vertical: 'abajo' } }
      if (conElNombre && c.id === 'fecha')
        return { ...c, contenido: { tipo: 'dato', variable: 'empresa_nombre' } }
      return c
    }),
  }
}

export type Caja = { x: number; y: number; ancho: number; alto: number }

// La caja interior de una celda sin bordes, en px de la tarjeta (los `style` en línea de la celda, antes de escalar): 4 px de relleno por lado.
export async function cajaInteriorDe(celda: Locator): Promise<Caja> {
  const s = await celda.evaluate((el: HTMLElement) => ({
    x: parseFloat(el.style.left),
    y: parseFloat(el.style.top),
    ancho: parseFloat(el.style.width),
    alto: parseFloat(el.style.height),
  }))
  return { x: s.x + 4, y: s.y + 4, ancho: s.ancho - 8, alto: s.alto - 8 }
}

// El color de dos puntos de la imagen de la tarjeta, 3 px adentro de la caja: abajo a la derecha (donde va el logo) y arriba a la izquierda (blanco: el logo 4:1 no
// llena la caja y va abajo a la derecha).
export async function puntosDeLaCaja(imagen: Buffer, caja: Caja) {
  const { data, info } = await sharp(imagen)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const en = (x: number, y: number) => {
    const i = (Math.round(y) * info.width + Math.round(x)) * info.channels
    return { r: data[i] ?? 0, g: data[i + 1] ?? 0, b: data[i + 2] ?? 0 }
  }
  return {
    abajoDerecha: en(caja.x + caja.ancho - 4, caja.y + caja.alto - 4),
    arribaIzquierda: en(caja.x + 3, caja.y + 3),
  }
}

export const esBlanco = (c: { r: number; g: number; b: number }) =>
  c.r > 235 && c.g > 235 && c.b > 235
export const esAzul = (c: { r: number; g: number; b: number }) => c.b > 150 && c.r < 90
