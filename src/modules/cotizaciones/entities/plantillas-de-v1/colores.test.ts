import { describe, expect, it } from 'vitest'
import {
  colorDeChoque,
  coloresDeLaPlantilla,
  motivoDeColores,
  type ColorDelCatalogo,
} from './colores'
import { PLANTILLAS_DE_V1 } from '.'
import type { ColorDePlantillaDeV1 } from './tipos'

// Espejo de `_tono_clave()` de la base para un catálogo que no tiene la clave (sólo en la prueba): minúsculas, sin tildes, lo que no es letra o dígito → `_`,
// hasta 30 caracteres.
function claveDelNombre(nombre: string): string {
  const sinTildes = [...nombre.toLowerCase()]
    .map((ch) => {
      const i = 'áàäâéèëêíìïîóòöôúùüûñ'.indexOf(ch)
      return i === -1 ? ch : ('aaaaeeeeiiiioooouuuun'[i] ?? ch)
    })
    .join('')
  let v = sinTildes.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  if (!/^[a-z]/.test(v)) v = `t_${v}`
  return v.slice(0, 30).replace(/_+$/, '')
}

const teal: ColorDePlantillaDeV1 = { clave: 'v1_teal', nombre: 'V1 teal', hex: '#31869b' }
const verde: ColorDePlantillaDeV1 = { clave: 'v1_verde', nombre: 'V1 verde', hex: '#92d050' }
const paquete = { clave: 'usa' as const, colores: [teal, verde] }
const delCatalogo = (clave: string, hex: string, nombre = clave): ColorDelCatalogo => ({
  clave,
  nombre,
  hex,
})
const relleno = (n: number) =>
  Array.from({ length: n }, (_, i) => delCatalogo(`otro_${i}`, '#000000'))

describe('coloresDeLaPlantilla', () => {
  it('crea las claves `v1_<nombre>` que el catálogo no tiene', () => {
    const plan = coloresDeLaPlantilla(paquete, [delCatalogo('verde', '#00ff00')], 48)
    expect(plan).toEqual({
      ok: true,
      mapa: { v1_teal: 'v1_teal', v1_verde: 'v1_verde' },
      reusar: [],
      crear: [teal, verde],
    })
  })

  it('reusa la que existe con el mismo hex (sin mirar mayúsculas)', () => {
    const plan = coloresDeLaPlantilla(paquete, [delCatalogo('v1_teal', '#31869B', 'V1 teal')], 48)
    expect(plan.ok && plan.reusar).toEqual([{ clave: 'v1_teal', hex: '#31869b' }])
    expect(plan.ok && plan.crear).toEqual([verde])
  })

  it('con otro hex va `v1_<paquete>_<nombre>`, y reusa ésa si ya tiene el mismo hex', () => {
    const otro = delCatalogo('v1_teal', '#123456', 'V1 teal')
    const crea = coloresDeLaPlantilla(paquete, [otro], 48)
    expect(crea.ok && crea.mapa['v1_teal']).toBe('v1_usa_teal')
    expect(crea.ok && crea.crear[0]).toEqual({
      clave: 'v1_usa_teal',
      nombre: 'V1 usa teal',
      hex: '#31869b',
    })
    const reusa = coloresDeLaPlantilla(paquete, [otro, delCatalogo('v1_usa_teal', '#31869b')], 48)
    expect(reusa.ok && reusa.reusar).toEqual([{ clave: 'v1_usa_teal', hex: '#31869b' }])
  })

  it('si las dos claves chocan (o el nombre ya es de otro color), no crea nada', () => {
    const choque = coloresDeLaPlantilla(
      paquete,
      [delCatalogo('v1_teal', '#123456'), delCatalogo('v1_usa_teal', '#654321')],
      48,
    )
    expect(choque).toEqual({ ok: false, motivo: 'choque', nombre: 'V1 teal', otro: 'V1 usa teal' })
    expect(motivoDeColores(choque.ok ? (null as never) : choque)).toContain(
      '«V1 teal» y «V1 usa teal»',
    )
    // La clave está libre pero el nombre «V1 teal» lo tiene un color renombrado: crearlo daría 23505, así que va el de choque.
    const nombre = coloresDeLaPlantilla(
      paquete,
      [delCatalogo('mi_teal', '#000000', 'v1  TEAL')],
      48,
    )
    expect(nombre.ok && nombre.mapa['v1_teal']).toBe('v1_usa_teal')
  })

  it('el tope justo entra; uno de más no crea nada y dice cuántos faltan', () => {
    expect(coloresDeLaPlantilla(paquete, relleno(46), 48).ok).toBe(true)
    const lleno = coloresDeLaPlantilla(paquete, relleno(47), 48)
    expect(lleno).toEqual({ ok: false, motivo: 'tope', faltan: 2, tope: 48 })
    expect(motivoDeColores(lleno.ok ? (null as never) : lleno)).toBe(
      'No hay lugar para 2 colores más en el catálogo (máximo 48): elimina alguno que no se use.',
    )
    // Reusar no ocupa lugar.
    expect(
      coloresDeLaPlantilla(paquete, [...relleno(46), delCatalogo('v1_teal', '#31869b')], 48).ok,
    ).toBe(true)
  })
})

describe('los colores de las cuatro plantillas de V1', () => {
  const todos = PLANTILLAS_DE_V1.flatMap((p) => p.colores.map((c) => ({ paquete: p.clave, ...c })))

  it('el mismo hex lleva el mismo nombre y la misma clave en los cuatro, y una clave, un solo hex', () => {
    const porHex = new Map<string, string>()
    const porClave = new Map<string, string>()
    for (const c of todos) {
      expect(porHex.get(c.hex) ?? c.clave).toBe(c.clave)
      expect(porClave.get(c.clave) ?? c.hex).toBe(c.hex)
      porHex.set(c.hex, c.clave)
      porClave.set(c.clave, c.hex)
    }
  })

  it('cada nombre da su clave como `_tono_clave()`, también el de choque, y el hex va en minúsculas', () => {
    for (const c of todos) {
      expect(c.hex).toMatch(/^#[0-9a-f]{6}$/)
      expect(claveDelNombre(c.nombre)).toBe(c.clave)
      const choque = colorDeChoque(c.paquete, c)
      expect(claveDelNombre(choque.nombre)).toBe(choque.clave)
      expect(choque.clave.length).toBeLessThanOrEqual(30)
    }
  })

  it('el segundo paquete reusa los colores que creó el primero', () => {
    const [usa, china] = PLANTILLAS_DE_V1
    const catalogo = (usa?.colores ?? []).map((c) => delCatalogo(c.clave, c.hex, c.nombre))
    const plan = china && coloresDeLaPlantilla(china, catalogo, 48)
    expect(plan?.ok && plan.reusar.map((r) => r.clave).sort()).toEqual([
      'v1_amarillo_fuerte',
      'v1_verde',
    ])
  })
})
