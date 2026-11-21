import { describe, expect, it } from 'vitest'
import { deA1 } from './de-a1'
import { FORMULA_A1, conNodoAntes, filaNueva, sinNodo } from './hoja-a1.soporte'
import { hojaDeLaPlanilla } from './hoja-de-la-planilla'
import { aA1, escribirCelda, leerCelda, nombrarConLaHoja } from './referencias-a1'

const hoja = hojaDeLaPlanilla(FORMULA_A1)
const ver = (texto: string, h = hoja) => aA1(texto, h).texto

describe('leerCelda', () => {
  it.each([
    ['C5', { col: 'C', fila: 5 }],
    ['c5', { col: 'C', fila: 5 }],
    ['$C$5', { col: 'C', fila: 5 }],
    ['$b12', { col: 'B', fila: 12 }],
    ['AB3', { col: 'AB', fila: 3 }],
  ])('%s es una celda', (texto, celda) => {
    expect(leerCelda(texto)).toEqual(celda)
    expect(escribirCelda(celda)).toBe(texto.replaceAll('$', '').toUpperCase())
  })

  it.each(['remate', 'C', '5', 'C5x', 'ABCD1', '$$C5', 'total__2', 'C_5'])(
    '%s no es una celda',
    (texto) => {
      expect(leerCelda(texto)).toBeNull()
    },
  )
})

describe('aA1', () => {
  it('cada fila se ve por su celda y la pct absorbida por la B de su fila', () => {
    expect(ver('=remate+fees*agencia_pct')).toBe('=C2+C3*B5')
    expect(ver('=SI(remate>0; agencia; 0)')).toBe('=SI(C2>0; C5; 0)')
  })

  it('lo que no es una fila queda: grupos, funciones, textos, auxiliares y nombres desconocidos', () => {
    expect(ver('=SUMA(primer_pago)')).toBe('=SUMA(primer_pago)')
    expect(ver('=BUSCARV(remate; "fletes"; "precio")')).toBe('=BUSCARV(C2; "fletes"; "precio")')
    expect(ver('=seguro__1+zzz')).toBe('=seguro__1+zzz')
  })

  it('ida y vuelta: lo que se muestra vuelve a los mismos ids', () => {
    for (const texto of [
      '=remate+fees*agencia_pct',
      '=SUMA(remate; fees; flete)*2',
      '=MAX(remate; fees)',
    ]) {
      const r = deA1(ver(texto), hoja, 8)
      expect(r).toMatchObject({ ok: true, texto })
    }
  })

  it('insertar una fila arriba corre las referencias: =C5+C7 pasa a =C6+C8', () => {
    expect(ver('=agencia+cif')).toBe('=C5+C7')
    const h = hojaDeLaPlanilla(conNodoAntes(FORMULA_A1, filaNueva('fila_nueva'), 'agencia_pct'))
    expect(ver('=agencia+cif', h)).toBe('=C6+C8')
    expect(ver('=agencia_pct', h)).toBe('=B6')
  })

  it('mover y borrar una fila también reescriben lo que se muestra', () => {
    const movida = conNodoAntes(
      sinNodo(FORMULA_A1, 'remate'),
      FORMULA_A1.definicion.nodos[1]!,
      'agencia_pct',
    )
    expect(ver('=remate+fees', hojaDeLaPlanilla(movida))).toBe('=C4+C2')
    expect(ver('=remate+fees', hojaDeLaPlanilla(sinNodo(FORMULA_A1, 'tc')))).toBe('=C1+C2')
  })
})

describe('aA1 › rangos y colores', () => {
  it('los argumentos de SUMA, MAX o MIN que son filas seguidas se ven como rango', () => {
    expect(ver('=SUMA(remate; fees; flete)')).toBe('=SUMA(C2:C4)')
    expect(ver('=MIN(remate; fees; flete; agencia)')).toBe('=MIN(C2:C5)')
    expect(ver('=SUMA(flete; fees; remate)')).toBe('=SUMA(C4; C3; C2)')
    expect(ver('=MAX(remate; fees)')).toBe('=MAX(C2; C3)')
    expect(ver('=SI(remate; fees; flete)')).toBe('=SI(C2; C3; C4)')
    expect(ver('=SUMA(remate; fees+1; flete)')).toBe('=SUMA(C2; C3+1; C4)')
  })

  it('una fila insertada en medio parte el rango: SUMA(C2:C4) pasa a SUMA(C2:C3; C5)… y con más filas, a dos rangos', () => {
    const h = hojaDeLaPlanilla(conNodoAntes(FORMULA_A1, filaNueva('fila_nueva'), 'flete'))
    expect(ver('=SUMA(remate; fees; flete)', h)).toBe('=SUMA(C2:C3; C5)')
    expect(ver('=SUMA(remate; fees; flete; agencia_pct; agencia)', h)).toBe(
      '=SUMA(C2:C3; C5; B6; C6)',
    )
    const h2 = hojaDeLaPlanilla(conNodoAntes(FORMULA_A1, filaNueva('fila_nueva'), 'fees'))
    expect(ver('=SUMA(tc; remate; fees; flete; agencia)', h2)).toBe('=SUMA(C1:C2; C4:C6)')
  })

  it('cada referencia lleva su color en el orden del texto, en ciclo, y la misma referencia repite el suyo', () => {
    const r = aA1('=tc+remate+fees+flete+agencia+agencia_pct+cif+remate', hoja)
    expect(r.refs.map((x) => `${x.texto}:${String(x.color)}`)).toEqual([
      'C1:0',
      'C2:1',
      'C3:2',
      'C4:3',
      'C5:4',
      'B5:5',
      'C7:0',
      'C2:1',
    ])
    const [primera] = r.refs
    expect(r.texto.slice(primera?.desde, primera?.hasta)).toBe('C1')
    expect(primera?.ids).toEqual(['tc'])
  })

  it('un rango es una sola referencia con todos sus nodos', () => {
    const r = aA1('=SUMA(remate; fees; flete)+agencia', hoja)
    expect(r.refs.map((x) => [x.texto, x.ids])).toEqual([
      ['C2:C4', ['remate', 'fees', 'flete']],
      ['C5', ['agencia']],
    ])
  })

  it('un id viejo con forma de celda se ve por su fila, nunca por su id', () => {
    const f = conNodoAntes(
      FORMULA_A1,
      { id: 'c5', tipo: 'input', etiqueta: 'Viejo' } as never,
      'tc',
    )
    expect(ver('=c5+remate', hojaDeLaPlanilla(f))).toBe('=C1+C3')
  })
})

describe('nombrarConLaHoja', () => {
  it('nombra cada fila por su celda y etiqueta, y la pct absorbida como «% de» su fila', () => {
    const nombrar = nombrarConLaHoja(hoja)
    expect(nombrar('remate')).toEqual({ celda: 'C2', etiqueta: 'Remate' })
    expect(nombrar('agencia_pct')).toEqual({ celda: 'B5', etiqueta: '% de Agencia' })
    expect(nombrar('seguro__1')).toBeUndefined()
  })
})
