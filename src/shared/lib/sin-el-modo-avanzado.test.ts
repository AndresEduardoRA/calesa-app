import { describe, expect, it } from 'vitest'
import { destinoSinElModoAvanzado } from './sin-el-modo-avanzado'

const PLANILLA = '/configuracion/origenes/o-1/formulas/f-1/planilla'

describe('destinoSinElModoAvanzado', () => {
  it('la planilla con el Modo avanzado va a la misma planilla, sin el panel y con el resto de la consulta', () => {
    expect(destinoSinElModoAvanzado(PLANILLA, new URLSearchParams('panel=editar-formula'))).toBe(
      PLANILLA,
    )
    expect(
      destinoSinElModoAvanzado(
        PLANILLA,
        new URLSearchParams('version=v-2&panel=editar-formula&x=1&x=2'),
      ),
    ).toBe(`${PLANILLA}?version=v-2&x=1&x=2`)
  })

  it('otro panel, otra parte de la fórmula u otra ruta siguen', () => {
    expect(destinoSinElModoAvanzado(PLANILLA, new URLSearchParams('panel=publicar'))).toBeNull()
    expect(destinoSinElModoAvanzado(PLANILLA, new URLSearchParams())).toBeNull()
    expect(
      destinoSinElModoAvanzado(
        '/configuracion/origenes/o-1/formulas/f-1/hoja',
        new URLSearchParams('panel=editar-formula'),
      ),
    ).toBeNull()
    expect(
      destinoSinElModoAvanzado('/leads', new URLSearchParams('panel=editar-formula')),
    ).toBeNull()
  })
})
