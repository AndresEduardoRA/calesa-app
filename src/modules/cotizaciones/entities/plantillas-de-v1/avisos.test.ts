import { describe, expect, it } from 'vitest'
import { avisosDeLaPlantilla, loQueLeeLaFormula } from './avisos'
import { PLANTILLAS_DE_V1 } from '.'

// Un paquete sintético: los cuatro reales sólo leen `anio`, una columna fija.
const sintetico = {
  tiposDeCambio: [
    { clave: 'oficial', nombre: 'Oficial' },
    { clave: 'aduana', nombre: 'Aduana' },
  ],
  camposDelVehiculo: [
    { clave: 'anio', nombre: 'Año' },
    { clave: 'tipo_vehiculo', nombre: 'Tipo de vehículo' },
  ],
}
const todo = {
  tiposDeCambio: ['oficial', 'aduana'],
  campos: ['tipo_vehiculo'],
  origen: 'Importadora USA',
}

describe('avisosDeLaPlantilla', () => {
  it('sin nada que falte, ningún aviso', () => {
    expect(avisosDeLaPlantilla(sintetico, todo)).toEqual([])
  })

  it('un tipo de cambio que la empresa no tiene (o no está activo)', () => {
    expect(avisosDeLaPlantilla(sintetico, { ...todo, tiposDeCambio: ['oficial'] })).toEqual([
      'Este paquete usa el tipo de cambio «Aduana», que la empresa no tiene: créalo en Empresa › Monedas antes de publicar.',
    ])
  })

  it('un campo que el origen no tiene (o no está activo); una columna fija nunca avisa', () => {
    expect(avisosDeLaPlantilla(sintetico, { ...todo, campos: [] })).toEqual([
      'Este paquete lee «Tipo de vehículo», que Importadora USA no tiene: esas celdas valdrán 0 hasta sumarlo en Orígenes › Campos.',
    ])
  })

  it('los tipos de cambio primero y después los campos', () => {
    expect(
      avisosDeLaPlantilla(sintetico, { tiposDeCambio: [], campos: [], origen: 'X' }),
    ).toHaveLength(3)
  })
})

describe('lo que dicen leer las cuatro plantillas de V1', () => {
  it('es lo que lee su fórmula, y con la empresa de siempre no avisan nada', () => {
    for (const p of PLANTILLAS_DE_V1) {
      const lee = loQueLeeLaFormula(p)
      expect(p.tiposDeCambio.map((t) => t.clave).sort()).toEqual(lee.tiposDeCambio.sort())
      expect(p.camposDelVehiculo.map((c) => c.clave).sort()).toEqual(lee.campos.sort())
      expect(
        avisosDeLaPlantilla(p, { tiposDeCambio: ['oficial', 'paralelo'], campos: [], origen: 'X' }),
      ).toEqual([])
    }
  })
})
