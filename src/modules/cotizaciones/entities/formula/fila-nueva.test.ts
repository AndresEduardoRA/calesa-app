import { describe, expect, it } from 'vitest'
import { esquemaId } from '../nodos'
import { formulaDePrueba } from './fila-de-prueba.soporte'
import { idDeFilaNueva, ocupadosDe } from './fila-nueva'

const formula = () =>
  formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'total', texto: '=base*2', etiqueta: 'Total' },
  ])

describe('idDeFilaNueva (T4)', () => {
  const libre = new Set<string>()
  it('propone el id desde la etiqueta, sin tildes y en minúsculas ASCII', () => {
    expect(idDeFilaNueva('Seguro de carga', libre)).toBe('seguro_de_carga')
    expect(idDeFilaNueva('Año', libre)).toBe('ano')
    expect(idDeFilaNueva('Ñandú', libre)).toBe('nandu')
    expect(idDeFilaNueva('  Flete (USD) / mar!  ', libre)).toBe('flete_usd_mar')
  })

  it('con un dígito al frente o sin letras, con el prefijo fila_', () => {
    expect(idDeFilaNueva('2024 flete', libre)).toBe('fila_2024_flete')
    expect(idDeFilaNueva('???', libre)).toBe('fila')
    expect(idDeFilaNueva('', libre)).toBe('fila')
  })

  it('corta a 41 caracteres y siempre cumple esquemaId', () => {
    const largo = idDeFilaNueva('x'.repeat(60), libre)
    expect(largo).toHaveLength(41)
    for (const e of ['Seguro de carga', 'Año', '2024 flete', '???', 'a'.repeat(60), 'a b  c__d']) {
      expect(esquemaId.safeParse(idDeFilaNueva(e, libre)).success).toBe(true)
    }
  })

  it('nunca lleva «__»', () => {
    expect(idDeFilaNueva('a__b___c', libre)).toBe('a_b_c')
    const choque = new Set(['a_b'])
    expect(idDeFilaNueva('a b', choque)).not.toContain('__')
  })

  it('si choca con un nodo, una constante, un grupo, un bucket o una clave de cambio, sufija _2, _3…', () => {
    const f = formula()
    const ocupados = new Set([...ocupadosDe(f), 'grupo_a', 'bucket_x', 'clave_cambio'])
    expect(idDeFilaNueva('Base', ocupados)).toBe('base_2')
    expect(idDeFilaNueva('oficial', ocupadosDe(f))).toBe('oficial_2')
    const dos = new Set(['seguro', 'seguro_2'])
    expect(idDeFilaNueva('Seguro', dos)).toBe('seguro_3')
    expect(idDeFilaNueva('Grupo A', ocupados)).toBe('grupo_a_2')
  })

  it('el sufijo recorta la base para caber en 41', () => {
    const base = 'x'.repeat(41)
    const r = idDeFilaNueva(base, new Set([base]))
    expect(r).toHaveLength(41)
    expect(r.endsWith('_2')).toBe(true)
    expect(esquemaId.safeParse(r).success).toBe(true)
  })
})

describe('ocupadosDe', () => {
  it('trae nodos, constantes, grupos, buckets y claves de cambio', () => {
    const f = formula()
    const o = ocupadosDe({
      ...f,
      definicion: {
        ...f.definicion,
        grupos: [{ id: 'g1', etiqueta: 'G', tono: 't', bucket: 'b' }],
      },
    })
    for (const x of ['base', 'total', 'tc', 'oficial', 'b', 'g1', 'remate'])
      expect(o.has(x)).toBe(true)
  })
})
