import { describe, expect, it } from 'vitest'
import {
  ACCION_PRINCIPAL_DEL_VEHICULO,
  BLOQUES_DEL_MENU_DE_VEHICULO,
  ETIQUETA_DE_ACCION_DE_VEHICULO,
  accionesDeVehiculo,
  etiquetaDeAccionDeVehiculo,
  type ClaveDeAccionDeVehiculo,
  type OfertaDeAccion,
  type OfertasDelMenuDeVehiculo,
} from './acciones-de-vehiculo'

const todas = (oferta: OfertaDeAccion): OfertasDelMenuDeVehiculo => ({
  cotizar: oferta,
  editar: oferta,
  imagenes: oferta,
  publicar: oferta,
  actualizar: oferta,
  actividad: oferta,
  papelera: oferta,
})

describe('accionesDeVehiculo', () => {
  it('T336 · con todo, el orden es: cotizar; editar, imágenes, web y subasta; actividad; y la papelera', () => {
    expect(accionesDeVehiculo(todas('habilitada'))).toEqual([
      ['cotizar'],
      ['editar', 'imagenes', 'publicar', 'actualizar'],
      ['actividad'],
      ['papelera'],
    ])
  })

  it('la principal es «Cotizar vehículo», sola en su bloque', () => {
    expect(ACCION_PRINCIPAL_DEL_VEHICULO).toBe('cotizar')
    expect(BLOQUES_DEL_MENU_DE_VEHICULO[0]).toEqual(['cotizar'])
    expect(ETIQUETA_DE_ACCION_DE_VEHICULO.cotizar).toBe('Cotizar vehículo')
  })

  it('lo que no se ofrece no aparece, y no queda un bloque vacío', () => {
    expect(accionesDeVehiculo(todas('oculta'))).toEqual([])
    expect(accionesDeVehiculo({ ...todas('oculta'), papelera: 'habilitada' })).toEqual([
      ['papelera'],
    ])
    expect(
      accionesDeVehiculo({ ...todas('oculta'), editar: 'habilitada', actividad: 'habilitada' }),
    ).toEqual([['editar'], ['actividad']])
  })

  it('una apagada sigue en su lugar (se ve y dice por qué)', () => {
    expect(
      accionesDeVehiculo({ ...todas('oculta'), imagenes: 'apagada', papelera: 'apagada' }),
    ).toEqual([['imagenes'], ['papelera']])
  })

  it('publicar dice «Editar publicación…» si ya está en la web', () => {
    expect(etiquetaDeAccionDeVehiculo('publicar', { publicado: false })).toBe('Publicar en la web…')
    expect(etiquetaDeAccionDeVehiculo('publicar', { publicado: true })).toBe('Editar publicación…')
    expect(etiquetaDeAccionDeVehiculo('editar', { publicado: true })).toBe('Editar')
  })

  it('cada acción está en un solo bloque y tiene su texto, sin exclamaciones', () => {
    const claves = BLOQUES_DEL_MENU_DE_VEHICULO.flat() as ClaveDeAccionDeVehiculo[]
    expect(new Set(claves).size).toBe(claves.length)
    expect([...claves].sort()).toEqual(Object.keys(ETIQUETA_DE_ACCION_DE_VEHICULO).sort())
    for (const texto of Object.values(ETIQUETA_DE_ACCION_DE_VEHICULO)) {
      expect(texto).not.toMatch(/[!¡]/)
    }
  })

  it('la papelera es lo último: lo destructivo al final y separado de lo frecuente', () => {
    const bloques = accionesDeVehiculo(todas('habilitada'))
    expect(bloques.at(-1)).toEqual(['papelera'])
    expect(bloques.slice(0, -1).flat()).not.toContain('papelera')
  })
})
