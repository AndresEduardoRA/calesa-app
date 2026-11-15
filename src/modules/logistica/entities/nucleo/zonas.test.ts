import { describe, expect, it } from 'vitest'
import { ORDEN_DE_HUECOS } from './hueco'
import {
  pestanaDelHueco,
  pestanaInicial,
  ZONA_DEL_HUECO,
  zonaDelHueco,
  zonasDeLaUnidad,
} from './zonas'

const hueco = (clave: string) => ({ clave, titulo: `T-${clave}` })
const todos = ORDEN_DE_HUECOS.map(hueco)
const claves = (r: readonly { clave: string }[]) => r.map((h) => h.clave)

describe('zonasDeLaUnidad', () => {
  it('con todos los permisos: tres zonas, cinco pestañas', () => {
    const z = zonasDeLaUnidad(todos)
    expect(claves(z.principal)).toEqual(['que-falta'])
    expect(claves(z.pestanas)).toEqual([
      'documentos',
      'transporte',
      'repuestos',
      'aduana',
      'dinero',
    ])
    expect(claves(z.lateral)).toEqual(['notas', 'historial'])
  })

  it('«Dinero» apila gastos, pagos y margen en el orden de ORDEN_DE_HUECOS y lleva su propio título', () => {
    const z = zonasDeLaUnidad(['margen', 'pagos', 'gastos'].map(hueco))
    const dinero = z.pestanas.find((p) => p.clave === 'dinero')
    expect(claves(dinero?.huecos ?? [])).toEqual(['gastos', 'pagos', 'margen'])
    expect(dinero?.titulo).toBe('Dinero')
  })

  it('sin gastos, pagos ni margen no hay «Dinero»', () => {
    const sinDinero = todos.filter((h) => !['gastos', 'pagos', 'margen'].includes(h.clave))
    expect(claves(zonasDeLaUnidad(sinDinero).pestanas)).not.toContain('dinero')
  })

  it('sólo margen: «Dinero» con el margen', () => {
    const z = zonasDeLaUnidad([hueco('margen')])
    expect(z.pestanas).toEqual([{ clave: 'dinero', titulo: 'Dinero', huecos: [hueco('margen')] }])
  })

  it('una pestaña de un solo hueco toma el título del hueco', () => {
    const z = zonasDeLaUnidad([hueco('aduana')])
    expect(z.pestanas[0]?.titulo).toBe('T-aduana')
  })

  it('un hueco desconocido no aparece en ninguna zona', () => {
    const z = zonasDeLaUnidad([hueco('que-falta'), hueco('inventado')])
    expect(claves(z.principal)).toEqual(['que-falta'])
    expect(z.pestanas).toEqual([])
    expect(z.lateral).toEqual([])
  })

  it('la lateral queda vacía sin notas ni historial, y el orden de llegada no importa', () => {
    const sinLaterales = todos.filter((h) => !['notas', 'historial'].includes(h.clave)).reverse()
    const z = zonasDeLaUnidad(sinLaterales)
    expect(z.lateral).toEqual([])
    expect(claves(z.pestanas)).toEqual([
      'documentos',
      'transporte',
      'repuestos',
      'aduana',
      'dinero',
    ])
  })

  it('toda clave de ORDEN_DE_HUECOS tiene zona', () => {
    for (const clave of ORDEN_DE_HUECOS) {
      expect(ZONA_DEL_HUECO[clave].pestana.length).toBeGreaterThan(0)
    }
  })
})

describe('pestanaDelHueco y zonaDelHueco', () => {
  it('gastos, pagos y margen caen en «dinero»; lo desconocido y nulo, en nada', () => {
    expect(pestanaDelHueco('pagos')).toBe('dinero')
    expect(pestanaDelHueco('notas')).toBe('notas')
    expect(pestanaDelHueco('inventado')).toBeNull()
    expect(pestanaDelHueco(null)).toBeNull()
    expect(zonaDelHueco('historial')).toBe('lateral')
    expect(zonaDelHueco('que-falta')).toBe('principal')
    expect(zonaDelHueco('x')).toBeNull()
  })
})

describe('pestanaInicial', () => {
  const pestanas = zonasDeLaUnidad(todos).pestanas
  const lateral = zonasDeLaUnidad(todos).lateral

  it('sin pedido, la primera', () => {
    expect(pestanaInicial(pestanas, null, false)).toBe('documentos')
    expect(pestanaInicial(lateral, null, false)).toBe('notas')
  })

  it('un ?hueco= de la zona elige su pestaña (gastos → dinero)', () => {
    expect(pestanaInicial(pestanas, 'gastos', false)).toBe('dinero')
    expect(pestanaInicial(lateral, 'historial', false)).toBe('historial')
  })

  it('un ?hueco= de otra zona o desconocido no cambia la primera', () => {
    expect(pestanaInicial(pestanas, 'notas', false)).toBe('documentos')
    expect(pestanaInicial(lateral, 'aduana', false)).toBe('notas')
    expect(pestanaInicial(pestanas, 'inventado', false)).toBe('documentos')
  })

  it('con ?subir= la zona de pestañas abre en Documentos aunque la URL pida otra', () => {
    expect(pestanaInicial(pestanas, 'aduana', true)).toBe('documentos')
  })

  it('con ?subir= pero sin Documentos en la zona, manda el ?hueco=', () => {
    const sinDocumentos = pestanas.filter((p) => p.clave !== 'documentos')
    expect(pestanaInicial(sinDocumentos, 'aduana', true)).toBe('aduana')
  })

  it('una zona sin pestañas no tiene inicial', () => {
    expect(pestanaInicial([], 'notas', true)).toBeNull()
  })
})
