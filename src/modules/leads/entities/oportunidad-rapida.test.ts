import { describe, expect, it } from 'vitest'
import { LARGO_MAXIMO_DE_TITULO } from './oportunidad'
import type { OportunidadDelLead } from './oportunidad'
import {
  avisoDeOportunidades,
  crearIgual,
  rutaDeLasOportunidadesDe,
  hayCambiosEnOportunidadRapida,
  pedidoDeOportunidadRapida,
  tituloSugeridoDeOportunidad,
  valoresDeOportunidadRapida,
} from './oportunidad-rapida'

describe('valoresDeOportunidadRapida', () => {
  it('sugiere el nombre del lead de título y sin monto', () => {
    expect(valoresDeOportunidadRapida('  Ana Pérez ')).toEqual({ titulo: 'Ana Pérez', monto: '' })
  })

  it('un nombre más largo que el máximo se corta para que el título valga', () => {
    const titulo = tituloSugeridoDeOportunidad('x'.repeat(LARGO_MAXIMO_DE_TITULO + 30))
    expect(titulo).toHaveLength(LARGO_MAXIMO_DE_TITULO)
    expect(pedidoDeOportunidadRapida({ titulo, monto: '' }, 'es-BO').tipo).toBe('crear')
  })
})

describe('hayCambiosEnOportunidadRapida', () => {
  const inicial = valoresDeOportunidadRapida('Ana')
  it('lo sugerido sin tocar no es un cambio', () => {
    expect(hayCambiosEnOportunidadRapida(inicial, inicial)).toBe(false)
  })
  it('un monto o otro título sí', () => {
    expect(hayCambiosEnOportunidadRapida({ ...inicial, monto: '500' }, inicial)).toBe(true)
    expect(hayCambiosEnOportunidadRapida({ ...inicial, titulo: 'Ana, Hilux' }, inicial)).toBe(true)
  })
  it('un monto de puros espacios no cuenta', () => {
    expect(hayCambiosEnOportunidadRapida({ ...inicial, monto: '  ' }, inicial)).toBe(false)
  })
})

describe('pedidoDeOportunidadRapida', () => {
  it('sin monto crea con el título y sin notas ni vehículo', () => {
    expect(pedidoDeOportunidadRapida({ titulo: ' Ana ', monto: '' }, 'es-BO')).toEqual({
      tipo: 'crear',
      datos: { titulo: 'Ana', monto_estimado: null, notas: null, vehiculo_id: null },
    })
  })

  it('lee el monto con el locale de la empresa', () => {
    const pedido = pedidoDeOportunidadRapida({ titulo: 'Ana', monto: '25.000,50' }, 'es-BO')
    expect(pedido).toMatchObject({ tipo: 'crear', datos: { monto_estimado: 25000.5 } })
  })

  it('un título vacío y un monto roto dicen su motivo por campo', () => {
    const pedido = pedidoDeOportunidadRapida({ titulo: '  ', monto: 'abc' }, 'es-BO')
    expect(pedido.tipo).toBe('invalido')
    if (pedido.tipo === 'invalido') {
      expect(Object.keys(pedido.errores).sort()).toEqual(['monto_estimado', 'titulo'])
    }
  })
})

const una = (n: number) => ({ id: `id-${String(n)}` }) as unknown as OportunidadDelLead
const varias = (n: number) => Array.from({ length: n }, (_, i) => una(i))

describe('avisoDeOportunidades', () => {
  it('hasta cinco, se muestran todas y no hay resto', () => {
    expect(avisoDeOportunidades(varias(1), false)).toMatchObject({ resto: null })
    expect(avisoDeOportunidades(varias(5), false).mostradas).toHaveLength(5)
    expect(avisoDeOportunidades(varias(5), false).resto).toBeNull()
  })

  it('con la sexta leída muestra cinco y dice «y 1 más»', () => {
    const aviso = avisoDeOportunidades(varias(6), false)
    expect(aviso.mostradas).toHaveLength(5)
    expect(aviso.resto).toBe('y 1 más')
  })

  it('si la lectura dice que hay más, no inventa cuántas: «y más»', () => {
    expect(avisoDeOportunidades(varias(6), true).resto).toBe('y más')
  })
})

describe('rutaDeLasOportunidadesDe', () => {
  it('lleva a la sección de la ficha, y con una oportunidad, a su panel', () => {
    expect(rutaDeLasOportunidadesDe('L1')).toBe('/leads/L1?seccion=oportunidades')
    expect(rutaDeLasOportunidadesDe('L1', 'O1')).toBe(
      '/leads/L1?seccion=oportunidades&panel=editar-oportunidad&oportunidad=O1',
    )
  })
})

describe('crearIgual', () => {
  const enVentas = {
    embudoId: '11111111-1111-4111-8111-111111111111',
    embudoNombre: 'Ventas',
    esDefault: true,
    oportunidadId: '22222222-2222-4222-8222-222222222222',
  }
  it('con una abierta en el embudo por defecto va apagado, con su motivo y la abierta para «Abrir esa»', () => {
    expect(crearIgual([enVentas])).toEqual({
      puede: false,
      motivo: 'Ya tiene una abierta en «Ventas».',
      abierta: enVentas,
    })
  })
  it('con abiertas sólo en otros embudos, o sin ninguna, se puede', () => {
    expect(crearIgual([{ ...enVentas, esDefault: false }])).toEqual({ puede: true })
    expect(crearIgual([])).toEqual({ puede: true })
  })
  it('sin la lectura (falló), se puede: decide la base', () => {
    expect(crearIgual(null)).toEqual({ puede: true })
  })
})
