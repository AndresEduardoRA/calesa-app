import { describe, expect, it, vi } from 'vitest'
import {
  menuDeLaFormulaDelOrigen,
  NOTA_DE_LA_ACTIVA,
  NOTA_SIN_TARJETA,
  NOTA_SIN_VERSION,
} from './menu'

const HORA = '2026-11-20 10:00:00+00'
const P = { id: 'p', version: 1 }
const B = { id: 'b', actualizadoEn: HORA }

const formula = (cambios: Partial<Parameters<typeof menuDeLaFormulaDelOrigen>[0]> = {}) => ({
  activa: false,
  activadaEn: null,
  archivadaEn: null,
  formula: { publicada: P, borrador: null },
  tarjeta: { publicada: null, borrador: B },
  ...cambios,
})

const q = () => ({
  alRenombrar: vi.fn(),
  alCopiar: vi.fn(),
  alActivar: vi.fn(),
  alArchivar: vi.fn(),
  alEliminar: vi.fn(),
})

const resumen = (acciones: ReturnType<typeof menuDeLaFormulaDelOrigen>) =>
  acciones.map((a) =>
    a.tipo === 'accion'
      ? `${a.clave}${a.deshabilitada ? ' (apagada)' : ''}`
      : a.tipo === 'nota'
        ? `nota: ${a.texto}`
        : a.tipo,
  )

describe('menuDeLaFormulaDelOrigen', () => {
  it('una que nunca estuvo activa: Renombrar, Copiar, Activar… y Eliminar', () => {
    const quehaceres = q()
    const menu = menuDeLaFormulaDelOrigen(formula(), quehaceres)
    expect(resumen(menu)).toEqual(['renombrar', 'copiar', 'activar', 'separador', 'eliminar'])
    const activar = menu.find((a) => a.tipo === 'accion' && a.clave === 'activar')
    if (activar?.tipo === 'accion') activar.alElegir()
    expect(quehaceres.alActivar).toHaveBeenCalledOnce()
  })

  it('una que estuvo activa se archiva', () => {
    expect(resumen(menuDeLaFormulaDelOrigen(formula({ activadaEn: HORA }), q())).at(-1)).toBe(
      'archivar',
    )
  })

  it('la activa no se activa ni se archiva: dice por qué', () => {
    expect(
      resumen(menuDeLaFormulaDelOrigen(formula({ activa: true, activadaEn: HORA }), q())),
    ).toEqual(['renombrar', 'copiar', 'separador', `nota: ${NOTA_DE_LA_ACTIVA}`])
  })

  it('sin tarjeta o sin versión, «Activar…» apagada con su motivo', () => {
    expect(
      resumen(
        menuDeLaFormulaDelOrigen(formula({ tarjeta: { publicada: null, borrador: null } }), q()),
      ),
    ).toContain(`nota: ${NOTA_SIN_TARJETA}`)
    expect(
      resumen(
        menuDeLaFormulaDelOrigen(formula({ formula: { publicada: null, borrador: null } }), q()),
      ).slice(2, 4),
    ).toEqual(['activar (apagada)', `nota: ${NOTA_SIN_VERSION}`])
  })

  it('una archivada sólo se renombra y se copia', () => {
    expect(resumen(menuDeLaFormulaDelOrigen(formula({ archivadaEn: HORA }), q()))).toEqual([
      'renombrar',
      'copiar',
    ])
  })
})
