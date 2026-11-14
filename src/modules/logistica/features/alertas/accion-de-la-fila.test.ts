import { describe, expect, it, vi } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import type { FilaDeLaBandeja } from '../../entities/alertas/grupo-leido'
import { accionDeLaFila } from './accion-de-la-fila'

// `vehiculos` sale por su entrada de servidor.
vi.mock('server-only', () => ({}))

const concede = (clave: string, origenId: string | null = null): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId,
  alcance: 'todos',
})

const comun = { vehiculoId: 'v1', origenId: 'o1', titulo: 'Hilux', nombre: 'Hilux' }

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

describe('accionDeLaFila', () => {
  const mover = [concede('flujos.mover', 'o1'), concede('logistica.ver', 'o1')]

  it('demorados, llegadas y salidas ofrecen «Mover» sólo a quien mueve en su origen', () => {
    for (const fila of [demorados, llegadas, salidas]) {
      expect(accionDeLaFila(fila, mover)).toEqual({
        tipo: 'enlace',
        texto: 'Mover',
        href: '/logistica/vehiculo/v1',
      })
      expect(accionDeLaFila(fila, [concede('logistica.ver', 'o1')])).toBeNull()
      expect(accionDeLaFila(fila, [concede('flujos.mover', 'otro')])).toBeNull()
    }
    expect(accionDeLaFila(demorados, [concede('flujos.mover.cualquiera', 'o1')])).not.toBeNull()
  })

  it('trabados siempre lleva a «qué falta»', () => {
    expect(accionDeLaFila(trabados, [])).toEqual({
      tipo: 'enlace',
      texto: 'Ver qué falta',
      href: '/logistica/vehiculo/v1',
    })
  })

  it('«Revisar» y «Renovar» abren el hueco de documentos, cada uno con su permiso', () => {
    expect(accionDeLaFila(porAprobar, [concede('logistica.documentos.aprobar', 'o1')])).toEqual({
      tipo: 'enlace',
      texto: 'Revisar',
      href: '/logistica/vehiculo/v1?hueco=documentos',
    })
    expect(accionDeLaFila(porAprobar, [concede('logistica.documentos.subir', 'o1')])).toBeNull()
    expect(accionDeLaFila(porVencer, [concede('logistica.documentos.subir', 'o1')])).toEqual({
      tipo: 'enlace',
      texto: 'Renovar',
      href: '/logistica/vehiculo/v1?hueco=documentos',
    })
    expect(accionDeLaFila(porVencer, [concede('logistica.documentos.aprobar', 'o1')])).toBeNull()
  })

  it('una subasta sin resolver se resuelve a quien mueve y ve la logística del origen', () => {
    expect(accionDeLaFila(sinResolver, mover)).toEqual({
      tipo: 'resolver',
      hrefDeLaGanamos: '/logistica/vehiculo/v1?ganada=si',
      origenId: 'o1',
      vehiculoId: 'v1',
    })
    expect(accionDeLaFila(sinResolver, [concede('flujos.mover', 'o1')])).toBeNull()
    expect(accionDeLaFila(sinResolver, [concede('logistica.ver', 'o1')])).toBeNull()
  })
})
