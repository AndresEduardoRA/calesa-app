import { describe, expect, it } from 'vitest'
import type { CampoDeDatoClave, DatoClaveDelOrigen } from './datos-clave-del-vehiculo'
import { datosClaveDelVehiculo } from './datos-clave-del-vehiculo'
import type { Vehiculo } from './vehiculo'

const VEHICULO: Vehiculo = {
  id: '00000000-0000-0000-0000-000000000001',
  numero: 12,
  origenId: '00000000-0000-0000-0000-0000000000aa',
  titulo: '2021 Toyota RAV4',
  marca: 'Toyota',
  modelo: null,
  anio: 2021,
  vin: 'JTMW1RFV8MD012345',
  lote: '58540656',
  plataforma: 'copart',
  urlOrigen: 'https://copart.com/lot/1',
  precio: 24500,
  precioNegociable: false,
  aceptaPermuta: null,
  placado: true,
  kilometraje: 42000,
  categoriaId: 'c1',
  faseId: null,
  atributos: {},
  leadId: null,
  publicadoWeb: false,
  destacadoWeb: false,
  precioWeb: null,
  precioWebHasta: null,
  precioWebNota: null,
  limpiezaEl: null,
  portadaRuta: null,
  estadoSubasta: null,
  situacion: 'fase',
  creadoPor: null,
  creadoEn: '2026-10-13T12:00:00+00:00',
  actualizadoEn: '2026-10-13T12:00:00+00:00',
}

const CATEGORIAS = [{ id: 'c1', nombre: 'SUV', activa: true }]
const CAMPO_COLOR: CampoDeDatoClave = {
  id: '00000000-0000-4000-8000-0000000000f1',
  clave: 'color',
  tipo: 'texto',
  opciones: [],
}
const contexto = (campos: readonly CampoDeDatoClave[] = []) => ({
  tipoDeOrigen: 'subasta' as const,
  campos,
  categorias: CATEGORIAS,
  locale: 'es-BO',
})

// Los de fábrica de un origen de subasta, como los resuelve `origenes`.
const DE_FABRICA: DatoClaveDelOrigen[] = [
  { de: 'comun', clave: 'plataforma', etiqueta: 'Plataforma' },
  { de: 'comun', clave: 'url_origen', etiqueta: 'Enlace de la subasta' },
  { de: 'comun', clave: 'kilometraje', etiqueta: 'Kilometraje' },
  { de: 'comun', clave: 'anio', etiqueta: 'Año' },
]

describe('los datos clave de un vehículo', () => {
  it('los de fábrica de subasta, en su orden: plataforma, el enlace como enlace, km con su unidad y el año sin separador', () => {
    expect(datosClaveDelVehiculo(DE_FABRICA, VEHICULO, contexto())).toEqual([
      { clave: 'plataforma', etiqueta: 'Plataforma', valor: { tipo: 'texto', texto: 'copart' } },
      {
        clave: 'url_origen',
        etiqueta: 'Enlace de la subasta',
        valor: { tipo: 'enlace', url: 'https://copart.com/lot/1' },
      },
      {
        clave: 'kilometraje',
        etiqueta: 'Kilometraje',
        valor: { tipo: 'texto', texto: '42.000 km' },
      },
      { clave: 'anio', etiqueta: 'Año', valor: { tipo: 'texto', texto: '2021' } },
    ])
  })

  it('la categoría por su id, con su nombre', () => {
    const datos: DatoClaveDelOrigen[] = [
      { de: 'comun', clave: 'categoria_id', etiqueta: 'Categoría' },
    ]
    expect(datosClaveDelVehiculo(datos, VEHICULO, contexto())[0]?.valor).toEqual({
      tipo: 'texto',
      texto: 'SUV',
    })
  })

  it('un campo del layout, de los atributos', () => {
    const datos: DatoClaveDelOrigen[] = [
      { de: 'campo', clave: 'color', etiqueta: 'Color', campoId: CAMPO_COLOR.id },
    ]
    const conColor = { ...VEHICULO, atributos: { color: 'Rojo' } }
    expect(datosClaveDelVehiculo(datos, conColor, contexto([CAMPO_COLOR]))).toEqual([
      { clave: 'color', etiqueta: 'Color', valor: { tipo: 'texto', texto: 'Rojo' } },
    ])
  })

  it('un dato vacío se muestra vacío («—»), no se quita', () => {
    const datos: DatoClaveDelOrigen[] = [
      { de: 'comun', clave: 'modelo', etiqueta: 'Modelo' },
      { de: 'campo', clave: 'color', etiqueta: 'Color', campoId: CAMPO_COLOR.id },
    ]
    expect(
      datosClaveDelVehiculo(datos, VEHICULO, contexto([CAMPO_COLOR])).map((d) => d.valor),
    ).toEqual([{ tipo: 'vacio' }, { tipo: 'vacio' }])
  })

  it('un campo que no llegó y un común de otro tipo de origen no se muestran; el orden se conserva', () => {
    const datos: DatoClaveDelOrigen[] = [
      { de: 'comun', clave: 'anio', etiqueta: 'Año' },
      { de: 'campo', clave: 'color', etiqueta: 'Color', campoId: CAMPO_COLOR.id },
      { de: 'comun', clave: 'lote', etiqueta: 'Lote' },
      { de: 'comun', clave: 'vin', etiqueta: 'VIN' },
    ]
    const manual = { ...contexto(), tipoDeOrigen: 'manual' as const }
    expect(datosClaveDelVehiculo(datos, VEHICULO, manual).map((d) => d.clave)).toEqual([
      'anio',
      'vin',
    ])
  })
})
