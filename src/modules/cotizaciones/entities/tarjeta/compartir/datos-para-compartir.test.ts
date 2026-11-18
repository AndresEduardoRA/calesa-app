import { describe, expect, it } from 'vitest'
import { enlaceParaCompartir, esquemaDeLasFotos, esquemaDeLosDatos } from './datos-para-compartir'
import { DATOS_DE_PRUEBA } from './compartir.soporte'

describe('esquemaDeLosDatos', () => {
  it('acepta lo que manda la ruta y rechaza un enlace que no es http', () => {
    expect(esquemaDeLosDatos.safeParse(DATOS_DE_PRUEBA).success).toBe(true)
    const conJs = {
      ...DATOS_DE_PRUEBA,
      vehiculo: { ...DATOS_DE_PRUEBA.vehiculo, enlace: 'javascript:alert(1)' },
    }
    expect(esquemaDeLosDatos.safeParse(conJs).success).toBe(false)
  })
})

describe('enlaceParaCompartir', () => {
  it('deja pasar http y https; lo demás es ninguno', () => {
    expect(enlaceParaCompartir('https://www.copart.com/lot/1')).toBe('https://www.copart.com/lot/1')
    expect(enlaceParaCompartir('javascript:alert(1)')).toBeNull()
    expect(enlaceParaCompartir('copart lote 1')).toBeNull()
    expect(enlaceParaCompartir(null)).toBeNull()
  })
})

describe('esquemaDeLasFotos', () => {
  it('no acepta más de 24 fotos', () => {
    const foto = {
      id: '11111111-1111-4111-8111-111111111111',
      miniatura: 'https://x.test/m.webp',
      completa: 'https://x.test/c.webp',
    }
    expect(esquemaDeLasFotos.safeParse({ fotos: Array(24).fill(foto) }).success).toBe(true)
    expect(esquemaDeLasFotos.safeParse({ fotos: Array(25).fill(foto) }).success).toBe(false)
  })
})
