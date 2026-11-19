import { describe, expect, it } from 'vitest'
import { formulaCruda } from './fila-de-prueba.soporte'
import { entradaDeLaUnidad, modoDelMotor, UNIDAD_EN_CEROS } from './unidad-de-ejemplo'

const formula = formulaCruda([
  { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC' },
  { id: 'remate', tipo: 'input', etiqueta: 'Remate' },
  { id: 'hibrido', tipo: 'bandera', etiqueta: 'Híbrido' },
  { id: 'anio', tipo: 'campo_vehiculo', etiqueta: 'Año', campo: 'anio' },
  {
    id: 'via',
    tipo: 'opcion',
    etiqueta: 'Vía',
    opciones: [
      { clave: 'chile', etiqueta: 'Chile', titulo: 'Por Chile' },
      { clave: 'peru', etiqueta: 'Perú', titulo: 'Por Perú' },
    ],
  },
  { id: 'flete', tipo: 'constante', etiqueta: 'Flete' },
])

describe('entradaDeLaUnidad', () => {
  it('deja lo que la fórmula tiene: inputs, banderas, campos del vehículo y una variante que es opción', () => {
    const unidad = {
      inputs: { remate: 1000 },
      banderas: { hibrido: true },
      vehiculo: { anio: 2020 },
      variante: 'peru',
    }
    expect(entradaDeLaUnidad(formula, unidad)).toEqual(unidad)
  })

  it('suelta lo que ya no existe o no es de ese tipo', () => {
    expect(
      entradaDeLaUnidad(formula, {
        inputs: { remate: 1, borrado: 2, flete: 3, hibrido: 4 },
        banderas: { hibrido: false, remate: true, vieja: true },
        vehiculo: { anio: 2019, cilindrada: 1600 },
        variante: 'bolivia',
      }),
    ).toEqual({
      inputs: { remate: 1 },
      banderas: { hibrido: false },
      vehiculo: { anio: 2019 },
    })
  })

  it('una clave del prototipo no pasa por una propia', () => {
    const inputs = JSON.parse('{"__proto__": 5, "constructor": 6}') as Record<string, number>
    expect(entradaDeLaUnidad(formula, { ...UNIDAD_EN_CEROS, inputs }).inputs).toEqual({})
  })

  it('la unidad en ceros queda en ceros y no se toca', () => {
    expect(entradaDeLaUnidad(formula, UNIDAD_EN_CEROS)).toEqual(UNIDAD_EN_CEROS)
    expect(UNIDAD_EN_CEROS).toEqual({ inputs: {}, banderas: {}, vehiculo: {} })
  })
})

describe('modoDelMotor', () => {
  it('pasa los buckets del diseño al mapa del motor, con su total_en', () => {
    expect(
      modoDelMotor({
        buckets: [
          { bucket: 'afuera', nodo: 'tc_paralelo' },
          { bucket: 'aduana', nodo: 'tc_oficial' },
        ],
        total_en: 'tc_paralelo',
      }),
    ).toEqual({ buckets: { afuera: 'tc_paralelo', aduana: 'tc_oficial' }, total_en: 'tc_paralelo' })
  })
})
