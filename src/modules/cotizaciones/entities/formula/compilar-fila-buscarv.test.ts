// BUSCARV en una fila con texto: compila contra el catálogo de tablas del origen, que el editor lee en el servidor (`docs/COTIZADOR.md` › «Fórmulas como texto»).
import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { compilarFila, type PedidoDeFila } from './compilar-fila'
import { formulaDePrueba, nodoDe } from './fila-de-prueba.soporte'

const existente = (id: string, texto: string): PedidoDeFila => ({
  destino: { existente: id },
  texto,
})

function bien(formula: Formula, pedido: PedidoDeFila) {
  const r = compilarFila(formula, pedido)
  if (!r.ok) throw new Error(`no compiló: ${JSON.stringify(r.error)}`)
  return r
}
function mal(formula: Formula, pedido: PedidoDeFila) {
  const r = compilarFila(formula, pedido)
  if (r.ok) throw new Error('compiló y no debía')
  return r.error
}

const UNA = () => formulaDePrueba([{ id: 'total', texto: '=remate' }])

describe('BUSCARV y el catálogo de tablas del origen', () => {
  const TABLAS = [{ clave: 'fletes', columnas: ['desde', 'hasta', 'monto'] }]
  const texto = '=BUSCARV(remate; "fletes"; "monto"; VERDADERO)'

  it('con el catálogo compila a un tramo y la fila suma su auxiliar', () => {
    const r = bien(UNA(), { ...existente('total', texto), tablas: TABLAS })
    expect(nodoDe(r.formula, 'total__1')).toMatchObject({
      tipo: 'tramo',
      tabla: 'fletes',
      sobre: 'remate',
      columna: 'monto',
    })
    expect(nodoDe(r.formula, 'total')).toMatchObject({ op: 'suma', de: ['total__1'] })
  })

  it('sin el catálogo (no se leyó) dice que no pudimos leer las tablas', () => {
    expect(mal(UNA(), existente('total', texto)).codigo).toBe('tablas_sin_leer')
    expect(mal(UNA(), { ...existente('total', texto), tablas: null }).codigo).toBe(
      'tablas_sin_leer',
    )
  })
})
