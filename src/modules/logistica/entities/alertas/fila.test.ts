import { describe, expect, it } from 'vitest'
import { detalleDeLaFila } from './fila'
import type { FilaDeLaBandeja } from './grupo-leido'

const comun = { vehiculoId: 'v1', origenId: 'o1', titulo: 'Hilux', nombre: 'Hilux' }
const AHORA = new Date('2026-11-14T12:00:00Z')

const demorados: FilaDeLaBandeja = {
  ...comun,
  grupo: 'demorados',
  faseId: 'f1',
  fase: 'Tránsito',
  faseDesde: '2026-11-05T12:00:00Z',
  situacion: 'fase',
  dias: 5,
}
const trabados: FilaDeLaBandeja = {
  ...comun,
  grupo: 'trabados',
  fase: 'Tránsito',
  faseDesde: '2026-11-05T12:00:00Z',
  situacion: 'fase',
  faseSiguiente: 'Aduana',
  motivo: 'Documento: BL',
}
const porAprobar: FilaDeLaBandeja = {
  ...comun,
  grupo: 'por_aprobar',
  documentoId: 'd1',
  tipo: 'BL',
  creadoEn: '2026-11-10T12:00:00Z',
}
const porVencer: FilaDeLaBandeja = {
  ...comun,
  grupo: 'por_vencer',
  documentoId: 'd1',
  tipo: 'Seguro',
  venceEl: '2026-12-01',
  modo: 'renovar',
}
const llegadas: FilaDeLaBandeja = {
  ...comun,
  grupo: 'llegadas',
  fase: 'Tránsito',
  etaEl: '2026-11-10',
  contenedor: 'MSKU1',
}
const salidas: FilaDeLaBandeja = {
  ...comun,
  grupo: 'salidas',
  fase: null,
  zarpeEl: '2026-11-14',
  booking: 'BK1',
  contenedor: null,
}
const sinResolver: FilaDeLaBandeja = {
  ...comun,
  grupo: 'sin_resolver',
  creadoEn: '2026-11-10T12:00:00Z',
}

describe('detalleDeLaFila', () => {
  it('dice dónde está un demorado y qué le falta a un trabado', () => {
    expect(detalleDeLaFila(demorados, AHORA, 'UTC')).toContain('«Tránsito»')
    expect(detalleDeLaFila(demorados, AHORA, 'UTC')).toContain('9 días')
    expect(detalleDeLaFila(trabados, AHORA, 'UTC')).toBe('Falta para «Aduana»: Documento: BL')
  })

  it('un documento dice su tipo y su fecha, y qué hacer cuando vence', () => {
    expect(detalleDeLaFila(porAprobar, AHORA, 'UTC')).toMatch(/^BL · subido el /)
    expect(detalleDeLaFila(porVencer, AHORA, 'UTC')).toMatch(
      /^Seguro · vence el .* · sube el nuevo para renovarlo$/,
    )
    expect(detalleDeLaFila({ ...porVencer, modo: 'solicitar' }, AHORA, 'UTC')).toContain(
      'pide uno nuevo',
    )
  })

  it('una llegada dice la ETA y el contenedor; una salida, que zarpa hoy, sin fase si no la tiene', () => {
    expect(detalleDeLaFila(llegadas, AHORA, 'UTC')).toMatch(
      /^«Tránsito» · ETA .* · contenedor MSKU1$/,
    )
    expect(detalleDeLaFila(salidas, AHORA, 'UTC')).toBe('Sin fase · zarpa hoy · booking BK1')
    expect(detalleDeLaFila(sinResolver, AHORA, 'UTC')).toMatch(/^Subasta sin resolver desde el /)
  })
})
