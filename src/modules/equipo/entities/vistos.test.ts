import { describe, expect, it } from 'vitest'
import {
  conAbierto,
  consultasDeLaFirma,
  firmaDeConsultas,
  idDeLaUrl,
  lecturaDeVistosDesde,
  marcaDeVisto,
  MODULOS_DE_VISTOS,
  preferenciaDeVistosDesde,
  SIN_VISTOS,
  tandasDeIds,
  TIPOS_DE_VISTOS,
  TIPOS_DEL_MODULO,
  TOPE_DE_IDS_POR_TIPO,
  ultimoDelContexto,
  unidas,
  VISTOS_POR_DEFECTO,
} from './vistos'

const A = '0b1c2d3e-0000-4000-8000-00000000000a'
const B = '0b1c2d3e-0000-4000-8000-00000000000b'

describe('vistos', () => {
  it('la preferencia completa lo que falte y rechaza días fuera de la lista', () => {
    expect(preferenciaDeVistosDesde(undefined)).toEqual(VISTOS_POR_DEFECTO)
    expect(preferenciaDeVistosDesde({ dias: 30 })).toEqual({ ...VISTOS_POR_DEFECTO, dias: 30 })
    expect(preferenciaDeVistosDesde({ dias: 15 })).toEqual(VISTOS_POR_DEFECTO)
  })

  it('marca el último, lo visto y nada, según la preferencia', () => {
    const lectura = { vistos: new Set([A]), ultimo: B }
    expect(marcaDeVisto(B, lectura, VISTOS_POR_DEFECTO)).toBe('ultimo')
    expect(marcaDeVisto(A, lectura, VISTOS_POR_DEFECTO)).toBe('visto')
    expect(marcaDeVisto(B, lectura, { ...VISTOS_POR_DEFECTO, ultimo: false })).toBe('visto')
    expect(marcaDeVisto(A, lectura, { ...VISTOS_POR_DEFECTO, activado: false })).toBeNull()
    expect(marcaDeVisto('otro', SIN_VISTOS, VISTOS_POR_DEFECTO)).toBeNull()
  })

  it('abrir uno lo vuelve el último y lee lo de la base', () => {
    expect(conAbierto(SIN_VISTOS, A)).toEqual({ vistos: new Set([A]), ultimo: A })
    expect(lecturaDeVistosDesde({ vistos: [{ id: A, visto_en: 'x' }], ultimo: A })).toEqual({
      vistos: new Set([A]),
      ultimo: A,
    })
    expect(lecturaDeVistosDesde({ vistos: 'no' })).toBeNull()
  })
  it('lo abierto en la pestaña se suma a lo leído y manda en el último', () => {
    const leida = { vistos: new Set([A]), ultimo: A }
    expect(unidas(leida, conAbierto(SIN_VISTOS, B))).toEqual({ vistos: new Set([A, B]), ultimo: B })
    expect(unidas(leida, SIN_VISTOS)).toEqual(leida)
  })
})

describe('lo que se pide a la base por pantalla', () => {
  it('cada módulo marca al menos un tipo conocido y sólo la agenda tiene dos', () => {
    for (const modulo of MODULOS_DE_VISTOS) {
      const tipos = TIPOS_DEL_MODULO[modulo]
      expect(tipos.length, modulo).toBeGreaterThan(0)
      for (const tipo of tipos) expect(TIPOS_DE_VISTOS, modulo).toContain(tipo)
    }
    expect(TIPOS_DEL_MODULO.agenda).toEqual(['evento', 'tarea'])
    expect(MODULOS_DE_VISTOS.filter((m) => TIPOS_DEL_MODULO[m].length > 1)).toEqual(['agenda'])
  })

  it('las tandas son únicas, ordenadas, de a 100 y con tope de 200', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id-${String(i).padStart(3, '0')}`)
    const tandas = tandasDeIds([...ids, ...ids].reverse())
    expect(tandas.map((t) => t.length)).toEqual([100, 100])
    expect(tandas.flat()).toEqual(ids.slice(0, TOPE_DE_IDS_POR_TIPO))
    expect(tandasDeIds([])).toEqual([])
  })

  it('la firma va y vuelve, no depende del orden y una consulta sin ids no entra', () => {
    const firma = firmaDeConsultas([
      { tipo: 'tarea', ids: [B] },
      { tipo: 'evento', ids: [B, A, A] },
      { tipo: 'lead', ids: [] },
    ])
    expect(firma).toBe(`evento:${A},${B}|tarea:${B}`)
    expect(
      firmaDeConsultas([
        { tipo: 'tarea', ids: [B] },
        { tipo: 'evento', ids: [A, B] },
      ]),
    ).toBe(firma)
    expect(consultasDeLaFirma(firma)).toEqual([
      { tipo: 'evento', ids: [A, B] },
      { tipo: 'tarea', ids: [B] },
    ])
    expect(firmaDeConsultas([{ tipo: 'lead', ids: [] }])).toBe('')
    expect(consultasDeLaFirma('')).toEqual([])
    expect(consultasDeLaFirma('raro:x')).toEqual([])
  })

  it('el último del contexto es el de visto_en más reciente', () => {
    expect(ultimoDelContexto([])).toBeNull()
    expect(
      ultimoDelContexto([
        { id: A, vistoEn: '2026-11-14T10:00:00Z' },
        { id: B, vistoEn: '2026-11-14T10:00:05+00:00' },
      ]),
    ).toBe(B)
    expect(ultimoDelContexto([{ id: A, vistoEn: 'no es fecha' }])).toBeNull()
  })

  it('el id de la URL es un uuid en minúsculas o nulo', () => {
    expect(idDeLaUrl(A.toUpperCase())).toBe(A)
    expect(idDeLaUrl('no-es-un-uuid')).toBeNull()
    expect(idDeLaUrl(null)).toBeNull()
    expect(idDeLaUrl(undefined)).toBeNull()
  })
})
