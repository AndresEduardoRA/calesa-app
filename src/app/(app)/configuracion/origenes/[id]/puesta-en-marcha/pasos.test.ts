import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  PASOS_DE_LA_PUESTA_EN_MARCHA,
  estadoDeLaPuestaEnMarcha,
  type OrigenConUso,
} from '@/modules/origenes'
import { rutaDeLaPuestaEnMarcha } from '@/shared/lib/rutas'
import { existeLaRuta } from '../../existe-la-ruta'
import { MOTIVO_DEL_PASO, conMotivos } from './pasos'

vi.mock('server-only', () => ({}))

const APP = path.join(process.cwd(), 'src/app/(app)')
const ORIGEN = '00000000-0000-4000-8000-000000000001'

const existe = (ruta: string) =>
  existeLaRuta(
    APP,
    ruta
      .split('/')
      .filter(Boolean)
      .map((segmento) => (segmento === ORIGEN ? '[id]' : segmento)),
  )

const USO: OrigenConUso['uso'] = {
  vehiculos: 0,
  cotizaciones: 0,
  camposActivos: 0,
  categorias: 0,
  fases: 0,
  formulaPublicada: false,
  concesiones: 0,
  tarjetaPublicada: false,
}

describe('las rutas de la puesta en marcha', () => {
  it('cada paso, «Listo» y la raíz tienen su pantalla (atravesando los grupos de rutas)', () => {
    for (const paso of [...PASOS_DE_LA_PUESTA_EN_MARCHA, 'listo' as const]) {
      expect(existe(rutaDeLaPuestaEnMarcha(ORIGEN, paso)), paso).toBe(true)
    }
    expect(existe(rutaDeLaPuestaEnMarcha(ORIGEN))).toBe(true)
  })
})

describe('conMotivos', () => {
  it('sin el permiso, el paso va sin enlace a lo que no abre y con su motivo', () => {
    const estado = estadoDeLaPuestaEnMarcha({
      uso: USO,
      hayFormulaDeTrabajo: false,
      permisos: { gestionar: true, flujo: false, cotizador: true },
    })
    const pasos = conMotivos(estado, ORIGEN)
    expect(pasos.map((paso) => [paso.clave, paso.estado])).toEqual([
      ['datos', 'hecho'],
      ['campos', 'pendiente'],
      ['flujo', 'sin_permiso'],
      ['formula', 'pendiente'],
      ['tarjeta', 'pendiente'],
      ['publicar', 'pendiente'],
    ])
    expect(pasos.find((paso) => paso.clave === 'flujo')?.motivo).toBe(MOTIVO_DEL_PASO.flujo)
    expect(pasos.filter((paso) => paso.motivo !== null)).toHaveLength(1)
    expect(pasos[1]?.ruta).toBe(rutaDeLaPuestaEnMarcha(ORIGEN, 'campos'))
  })
})
