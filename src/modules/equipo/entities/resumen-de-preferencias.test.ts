import { describe, expect, it } from 'vitest'
import {
  textoDeItemsPorPagina,
  textoDeLaDensidad,
  textoDeLaZona,
  textoDelTema,
  textoDeVistos,
} from './resumen-de-preferencias'

describe('resumen de preferencias', () => {
  it('el tema desconocido no se inventa', () => {
    expect(textoDelTema(null)).toBeNull()
    expect(textoDelTema('dark')).toBe('Oscuro')
    expect(textoDelTema('system')).toBe('Como el dispositivo')
  })

  it('la densidad sin elegir es automática', () => {
    expect(textoDeLaDensidad(null)).toBe('Automática')
    expect(textoDeLaDensidad('comoda')).toBe('Cómoda')
  })

  it('los ítems por página sin elegir dicen el de fábrica', () => {
    expect(textoDeItemsPorPagina(null)).toBe('50 (de fábrica)')
    expect(textoDeItemsPorPagina(25)).toBe('25')
  })

  it('la zona sin elegir es la de la empresa', () => {
    expect(textoDeLaZona(null, 'America/La_Paz')).toBe('America/La Paz (la de la empresa)')
    expect(textoDeLaZona('America/Bogota', 'America/La_Paz')).toBe('America/Bogota')
  })

  it('vistos apagado dice No y encendido, cuánto recuerda', () => {
    expect(textoDeVistos({ activado: false, dias: 7, ultimo: true })).toBe('No')
    expect(textoDeVistos({ activado: true, dias: 30, ultimo: true })).toBe('Sí, 30 días')
    expect(textoDeVistos({ activado: true, dias: 365, ultimo: false })).toBe('Sí, 1 año')
  })
})
