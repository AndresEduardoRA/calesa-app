import { describe, expect, it } from 'vitest'
import type { HojaDeUnaGuardada } from '../hoja-de-una-guardada'
import { paginaDeLaPortada } from './pagina-de-la-portada'

const GUARDADA_EL = '2026-11-07T02:30:00.123456+00:00'
const hoja = (titulo: string | null) =>
  ({
    cotizacion: { numero: 12, titulo, actualizadoEn: GUARDADA_EL },
    venceEl: '2026-11-20',
  }) as unknown as Pick<HojaDeUnaGuardada, 'cotizacion' | 'venceEl'>
const LOGO = { nombre: 'Importadora', url: 'https://almacen.test/marca/logo.png' }
const VEHICULO = { titulo: 'Toyota Hilux 2020', lote: '4455', vin: null }

describe('paginaDeLaPortada', () => {
  it('arma la página con el título guardado, el contexto, el número, el vencimiento, el último guardado tal cual y la empresa', () => {
    expect(
      paginaDeLaPortada({
        hoja: hoja('Hilux para Juan'),
        contexto: {
          cliente: 'Juan',
          vehiculo: VEHICULO,
          asesor: { nombre: 'Ana', telefono: null, cargo: null, foto: null },
        },
        empresa: 'Calesa',
        logo: LOGO,
      }),
    ).toEqual({
      titulo: 'Hilux para Juan',
      cliente: 'Juan',
      vehiculo: VEHICULO,
      asesor: { nombre: 'Ana', telefono: null, cargo: null, foto: null },
      numero: 12,
      venceEl: '2026-11-20',
      guardadaEl: GUARDADA_EL,
      empresa: 'Calesa',
      logo: LOGO,
    })
  })

  it('sin título propio, el del vehículo que ve; sin ninguno, nada (el número ya va al lado)', () => {
    expect(
      paginaDeLaPortada({
        hoja: hoja(null),
        contexto: { cliente: null, vehiculo: VEHICULO, asesor: null },
        empresa: 'Calesa',
        logo: null,
      }).titulo,
    ).toBe('Toyota Hilux 2020')
    expect(
      paginaDeLaPortada({
        hoja: hoja(null),
        contexto: { cliente: null, vehiculo: null, asesor: null },
        empresa: 'Calesa',
        logo: null,
      }).titulo,
    ).toBeNull()
  })
})
