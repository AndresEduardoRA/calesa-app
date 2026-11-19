import { describe, expect, it } from 'vitest'
import type { PlantillaEnCuadricula } from '../cuadricula-de-la-tarjeta'
import { AVISO_DE_LA_CONVERSION } from './borrador-de-la-plantilla'
import type { Plantilla } from './forma-de-plantilla'
import type { PlantillaDelOrigen, VersionDePlantilla } from './lectura-de-la-plantilla'
import { idsDelContexto, propsDelEditor } from './props-del-editor'

const plantilla: Plantilla = {
  grupos: [{ grupo: 'compra' }],
  total: { etiqueta: 'T' },
  logo: true,
  columnas: { leyenda: false, plazo: false, tipo_cambio: false },
}
const cuadricula: PlantillaEnCuadricula = {
  forma: 2,
  columnas: [{ id: 'a', ancho: 100 }],
  filas: [{ id: 'f', alto: 20, ocultar_si: 'nunca' }],
  celdas: [
    {
      id: 'c',
      fila: 'f',
      columna: 'a',
      contenido: { tipo: 'dato', nodo: 'fees', mostrar: 'monto' },
    },
  ],
}
const HORA = '2026-11-07T15:00:00.123456+00:00'
const v = (extra: Partial<VersionDePlantilla> = {}): VersionDePlantilla => ({
  id: 'x',
  version: null,
  nota: null,
  actualizadoEn: HORA,
  publicadoEn: null,
  contenido: { forma: 1, plantilla },
  ...extra,
})
const lectura = (extra: Partial<PlantillaDelOrigen> = {}): PlantillaDelOrigen => ({
  publicada: null,
  borrador: null,
  formula: { id: 'f', version: 1 },
  contexto: {
    definicion: {
      nodos: [
        {
          id: 'fees',
          grupo: 'compra',
          etiqueta: 'Fees',
          // El cuerpo del nodo no viaja (la descripción de los primeros miembros sí: es la leyenda de la vista previa).
          texto: 'secreto',
          entradas: ['remate'],
        } as never,
        { id: 'cif', etiqueta: 'CIF', salida: 'base_imponible' },
      ],
      grupos: [{ id: 'compra', etiqueta: 'Compra', tono: 'verde', bucket: 'b' }],
    },
    diseno: null,
    visibilidad: { fees: { ver: 'todos', editar: 'x' }, cif: { ver: 'costos' } },
    tonos: ['verde'],
  },
  tonos: [{ clave: 'verde', nombre: 'Verde' }],
  ...extra,
})
const origen = { id: 'o', nombre: 'Origen', activo: true } as { id: string; nombre: string }

describe('propsDelEditor', () => {
  it('sin fórmula, nada', () => {
    expect(propsDelEditor(lectura({ formula: null, contexto: null }), origen)).toBeNull()
  })
  it('con fórmula, sólo lo que dibuja el editor: ni la definición ni el cuerpo de un nodo', () => {
    const r = propsDelEditor(lectura({ borrador: v() }), origen)!
    expect(Object.keys(r).sort()).toEqual([
      'avisos',
      'contexto',
      'de',
      'esperada',
      'guardada',
      'inicial',
      'origen',
      'publicada',
      'tonos',
    ])
    const texto = JSON.stringify(r)
    expect(texto).not.toContain('secreto')
    expect(texto).not.toContain('"entradas"')
    expect(texto).not.toContain('"editar"')
    expect(r.origen).toEqual({ id: 'o', nombre: 'Origen' })
  })
  it('la esperada es el actualizadoEn tal cual, o nula sin borrador', () => {
    expect(propsDelEditor(lectura({ borrador: v() }), origen)!.esperada).toBe(HORA)
    const sin = propsDelEditor(lectura(), origen)!
    expect(sin.esperada).toBeNull()
    expect(sin.guardada).toBeNull()
    expect(sin.de).toBe('omision')
  })
  it('la publicada va sin su plantilla', () => {
    const r = propsDelEditor(
      lectura({ publicada: v({ version: 3, nota: 'N', publicadoEn: HORA }) }),
      origen,
    )!
    expect(r.publicada).toEqual({ version: 3, nota: 'N', publicadoEn: HORA })
    expect(r.de).toBe('publicada')
  })
  it('una forma 2 guardada en el borrador nace tal cual y es la guardada; una forma 1 se convierte y no cuenta como guardada', () => {
    const conCuadricula = propsDelEditor(
      lectura({ borrador: v({ contenido: { forma: 2, cuadricula } }) }),
      origen,
    )!
    expect(conCuadricula.inicial).toEqual(cuadricula)
    expect(conCuadricula.guardada).toEqual(cuadricula)
    expect(conCuadricula.avisos).toEqual([])
    const deLaForma1 = propsDelEditor(lectura({ borrador: v() }), origen)!
    expect(deLaForma1.inicial.forma).toBe(2)
    expect(deLaForma1.guardada).toBeNull()
    expect(deLaForma1.avisos[0]).toBe(AVISO_DE_LA_CONVERSION)
  })
  it('el contexto lleva lo del nivel «todos» y los restringidos que la cuadrícula nombra; idsDelContexto, sus ids', () => {
    const r = propsDelEditor(
      lectura({ borrador: v({ contenido: { forma: 2, cuadricula } }) }),
      origen,
    )!
    expect(r.contexto.definicion.nodos?.map((n) => n.id)).toEqual(['fees'])
    expect([...idsDelContexto(r.contexto)]).toEqual(['fees'])
    const nombraCif: PlantillaEnCuadricula = {
      ...cuadricula,
      celdas: [
        {
          id: 'c',
          fila: 'f',
          columna: 'a',
          contenido: { tipo: 'dato', nodo: 'cif', mostrar: 'monto' },
        },
      ],
    }
    const conCif = propsDelEditor(
      lectura({ borrador: v({ contenido: { forma: 2, cuadricula: nombraCif } }) }),
      origen,
    )!
    expect([...idsDelContexto(conCif.contexto)].sort()).toEqual(['cif', 'fees'])
  })
})

describe('idsDelContexto', () => {
  it('sólo los nodos que viajan: un id que sólo está en la visibilidad (un `pct` o un tipo de cambio de otro nivel) no', () => {
    const ids = idsDelContexto({
      definicion: { nodos: [{ id: 'comision', pct: 'comision_pct' }] },
      diseno: null,
      visibilidad: {
        comision: { ver: 'todos' },
        comision_pct: { ver: 'costos' },
        tc_uni: { ver: 'costos' },
      },
      tonos: null,
    })
    expect([...ids]).toEqual(['comision'])
  })
})
