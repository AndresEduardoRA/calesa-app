import { describe, expect, it } from 'vitest'
import { SIN_MARCAS, resumenDeMarcas, type MarcaDelDiagrama } from './marcas-del-diagrama'

const marca = (nivel: MarcaDelDiagrama['nivel']): MarcaDelDiagrama => ({ nivel, mensaje: nivel })

describe('resumenDeMarcas', () => {
  it('cuenta errores y avisos; el nivel es el más alto', () => {
    expect(resumenDeMarcas([marca('aviso')])).toEqual({
      nivel: 'aviso',
      texto: '1 aviso',
      cuantos: 1,
    })
    expect(resumenDeMarcas([marca('error'), marca('aviso'), marca('aviso')])).toEqual({
      nivel: 'error',
      texto: '1 error y 2 avisos',
      cuantos: 3,
    })
    expect(resumenDeMarcas([marca('error'), marca('error')])).toEqual({
      nivel: 'error',
      texto: '2 errores',
      cuantos: 2,
    })
  })

  it('la información no cuenta: sólo información, o nada, es nulo', () => {
    expect(resumenDeMarcas([marca('info')])).toBeNull()
    expect(resumenDeMarcas([])).toBeNull()
    expect(resumenDeMarcas([marca('info'), marca('aviso')])?.texto).toBe('1 aviso')
  })

  it('sin proveedor no hay nada marcado', () => {
    expect(SIN_MARCAS.porFase.size + SIN_MARCAS.porSalida.size + SIN_MARCAS.delFlujo.length).toBe(0)
  })
})
