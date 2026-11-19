import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO } from './edicion-de-seguimiento'
import { lineasDelMas } from './mas-del-seguimiento'

const claves = (lineas: ReturnType<typeof lineasDelMas>) => lineas.map((l) => l.clave)

describe('lineasDelMas', () => {
  it('con la cartera y `leads.editar`: anotar y agendar, ninguna apagada', () => {
    const lineas = lineasDelMas({ puedoAnotar: true, puedoAgendar: true, hayTipos: true })
    expect(claves(lineas)).toEqual(['anotar', 'agendar'])
    expect(lineas.every((l) => l.tipo === 'accion' && !l.apagada)).toBe(true)
  })

  it('sin tipos activos: «Anotar seguimiento» apagado con su motivo y agendar sigue', () => {
    const lineas = lineasDelMas({ puedoAnotar: true, puedoAgendar: true, hayTipos: false })
    expect(lineas).toEqual([
      { tipo: 'accion', clave: 'anotar', etiqueta: 'Anotar seguimiento', apagada: true },
      { tipo: 'nota', clave: 'sin-tipos', texto: MENSAJE_SIN_TIPOS_DE_SEGUIMIENTO },
      { tipo: 'accion', clave: 'agendar', etiqueta: 'Agendar recordatorio', apagada: false },
    ])
  })

  it('cada línea, sólo con su permiso', () => {
    expect(
      claves(lineasDelMas({ puedoAnotar: true, puedoAgendar: false, hayTipos: true })),
    ).toEqual(['anotar'])
    expect(
      claves(lineasDelMas({ puedoAnotar: false, puedoAgendar: true, hayTipos: false })),
    ).toEqual(['agendar'])
  })

  it('fuera de la cartera: nada, sin «+»', () => {
    expect(lineasDelMas({ puedoAnotar: false, puedoAgendar: false, hayTipos: true })).toEqual([])
  })
})
