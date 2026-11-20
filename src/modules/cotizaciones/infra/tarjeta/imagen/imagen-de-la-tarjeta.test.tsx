// @vitest-environment node
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import { circuloDeLasIniciales } from '../../../entities/tarjeta/circulo-de-las-iniciales'
import { geometriaDeLaTarjeta } from '../../../entities/tarjeta/geometria-de-la-tarjeta'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  calculoDePrueba,
  CONTEXTO_DE_PRUEBA,
  crudaDeLaTarjeta,
} from '../../../entities/tarjeta/tarjeta.soporte'

vi.mock('server-only', () => ({}))

const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// El ancho y el alto del PNG, del IHDR (bytes 16 a 23, big-endian).
const medidas = (png: Uint8Array) => {
  const vista = new DataView(png.buffer, png.byteOffset, png.byteLength)
  return { ancho: vista.getUint32(16), alto: vista.getUint32(20) }
}

describe('pngDeLaTarjeta', () => {
  it('da un PNG del ancho y el alto de la geometría, con las cuatro Geist', async () => {
    const lectura = tarjetaDesde(crudaDeLaTarjeta())
    if (lectura === null) throw new Error('no se lee')
    const geometria = geometriaDeLaTarjeta({
      lectura,
      calculo: calculoDePrueba({ verTotalBs: true }),
      contexto: CONTEXTO_DE_PRUEBA,
      monedaBs: 'BOB',
      locale: 'es-BO',
    })
    const { pngDeLaTarjeta } = await import('./imagen-de-la-tarjeta')
    const png = await pngDeLaTarjeta({ geometria, logo: null, foto: null })
    expect([...png.subarray(0, 8)]).toEqual(FIRMA_PNG)
    expect(medidas(png)).toEqual({
      ancho: Math.ceil(geometria.ancho),
      alto: Math.ceil(geometria.alto),
    })
  }, 30_000)

  it('pinta el logo entero abajo a la derecha de la caja interior de su celda, como la celda lo alinea', async () => {
    const lectura = tarjetaDesde(crudaDeLaTarjeta())
    if (lectura === null) throw new Error('no se lee')
    const armada = geometriaDeLaTarjeta({
      lectura,
      calculo: calculoDePrueba(),
      contexto: CONTEXTO_DE_PRUEBA,
      monedaBs: null,
      locale: 'es-BO',
    })
    const geometria = {
      ...armada,
      celdas: armada.celdas.map((c) =>
        c.id === 'c_logo'
          ? {
              ...c,
              estilo: {
                ...c.estilo,
                alinear: 'derecha' as const,
                alinearVertical: 'abajo' as const,
              },
            }
          : c,
      ),
    }
    const celda = geometria.celdas.find((c) => c.id === 'c_logo')
    if (celda === undefined) throw new Error('sin la celda del logo')
    const datos = await sharp({
      create: { width: 400, height: 100, channels: 3, background: { r: 29, g: 78, b: 216 } },
    })
      .png()
      .toBuffer()
    const { pngDeLaTarjeta } = await import('./imagen-de-la-tarjeta')
    const png = await pngDeLaTarjeta({
      geometria,
      logo: { datos, tipo: 'png', ancho: 400, alto: 100 },
      foto: null,
    })
    const { data, info } = await sharp(png)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const azul = (x: number, y: number) => {
      const i = (Math.round(y) * info.width + Math.round(x)) * info.channels
      return (data[i + 2] ?? 0) > 150 && (data[i] ?? 255) < 90
    }
    const [x, y] = [celda.x + 4, celda.y + 4]
    const [ancho, alto] = [celda.ancho - 8, celda.alto - 8]
    expect(azul(x + ancho - 2, y + alto - 2)).toBe(true)
    expect(azul(x + 2, y + 2)).toBe(false)
  }, 30_000)
})

// La geometría de prueba con la celda del logo vuelta foto del asesor.
function geometriaConLaFoto() {
  const definicion = crudaDeLaTarjeta().definicion
  const celdas = definicion.celdas.map((c) =>
    c.id === 'c_logo' ? { ...c, contenido: { tipo: 'foto_del_asesor' } } : c,
  )
  const lectura = tarjetaDesde(crudaDeLaTarjeta({ definicion: { ...definicion, celdas } }))
  if (lectura === null) throw new Error('no se lee')
  return geometriaDeLaTarjeta({
    lectura,
    calculo: calculoDePrueba(),
    contexto: CONTEXTO_DE_PRUEBA,
    monedaBs: null,
    locale: 'es-BO',
  })
}

// El color `[r, g, b]` de un punto del PNG.
async function pixeles(png: Uint8Array) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  return (x: number, y: number) => {
    const i = (Math.round(y) * info.width + Math.round(x)) * info.channels
    return [data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0] as const
  }
}

describe('pngDeLaTarjeta con la foto del asesor', () => {
  it('la foto del asesor en la caja de su celda; sin foto, el círculo con sus iniciales', async () => {
    const geometria = geometriaConLaFoto()
    const celda = geometria.celdas.find((c) => c.id === 'c_logo')
    if (celda === undefined) throw new Error('sin la celda de la foto')
    const { pngDeLaTarjeta } = await import('./imagen-de-la-tarjeta')
    // Con foto (un cuadrado rojo), el centro de la caja es rojo.
    const datos = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 220, g: 20, b: 20 } },
    })
      .png()
      .toBuffer()
    const conFoto = await pixeles(
      await pngDeLaTarjeta({
        geometria,
        logo: null,
        foto: { datos, tipo: 'png', ancho: 64, alto: 64 },
      }),
    )
    // La foto y el círculo van donde los ubica la celda (alineada a la izquierda, al medio): el centro de ese cuadrado.
    const circulo = circuloDeLasIniciales(celda, 1)
    if (circulo === null) throw new Error('sin la caja de la foto')
    const [cx, cy] = [
      celda.x + 4 + circulo.x + circulo.diametro / 2,
      celda.y + 4 + circulo.y + circulo.diametro / 2,
    ]
    expect(conFoto(cx, cy)[0]).toBeGreaterThan(180)
    expect(conFoto(cx, cy)[1]).toBeLessThan(80)
    // Sin foto, el borde del círculo (arriba, al centro) va en tinta y el centro no es rojo.
    const sinFoto = await pixeles(await pngDeLaTarjeta({ geometria, logo: null, foto: null }))
    const [r, g] = sinFoto(cx, celda.y + 4 + circulo.y + 0.75)
    expect(r + g).toBeLessThan(300)
    expect(sinFoto(cx, cy)[0] - sinFoto(cx, cy)[1]).toBeLessThan(60)
  }, 30_000)
})
