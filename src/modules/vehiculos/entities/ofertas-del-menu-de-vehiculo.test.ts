import { describe, expect, it } from 'vitest'
import { accionesDeVehiculo } from './acciones-de-vehiculo'
import {
  SIN_ENTRADA_PARA_CONSULTAR,
  SIN_PERMISO_PARA_EDITAR,
  ofertasDelMenuDeVehiculo,
  soloLasOfertas,
  type EntradaDelMenuDeVehiculo,
} from './ofertas-del-menu-de-vehiculo'

const TODO: EntradaDelMenuDeVehiculo = {
  cotizar: true,
  edicion: 'editable',
  publicar: { estado: 'habilitado' },
  subasta: { consultable: true },
  fechas: true,
  actividad: true,
  papelera: { estado: 'habilitado' },
}

const NADA: EntradaDelMenuDeVehiculo = {
  cotizar: false,
  edicion: 'sin_permiso',
  publicar: null,
  subasta: null,
  fechas: false,
  actividad: false,
  papelera: { estado: 'oculto' },
}

describe('ofertasDelMenuDeVehiculo', () => {
  it('con todo, todas habilitadas y en el orden único', () => {
    const ofertas = ofertasDelMenuDeVehiculo(TODO)
    expect(Object.values(ofertas).every((una) => una.oferta === 'habilitada')).toBe(true)
    expect(accionesDeVehiculo(soloLasOfertas(ofertas))).toEqual([
      ['cotizar'],
      ['editar', 'imagenes', 'fechas', 'publicar', 'actualizar'],
      ['actividad'],
      ['papelera'],
    ])
  })

  it('sin nada, ninguna acción (no hay «⋯»)', () => {
    expect(accionesDeVehiculo(soloLasOfertas(ofertasDelMenuDeVehiculo(NADA)))).toEqual([])
  })

  it('sin cotizar en el origen, no está «Cotizar vehículo» y no queda un bloque vacío', () => {
    const bloques = accionesDeVehiculo(
      soloLasOfertas(ofertasDelMenuDeVehiculo({ ...TODO, cotizar: false })),
    )
    expect(bloques[0]).toEqual(['editar', 'imagenes', 'fechas', 'publicar', 'actualizar'])
  })

  it('con editar en el origen y un vehículo ajeno («propios»): editar, imágenes y actualizar apagadas con el motivo', () => {
    const ofertas = ofertasDelMenuDeVehiculo({ ...TODO, edicion: 'propios' })
    for (const clave of ['editar', 'imagenes', 'actualizar'] as const) {
      expect(ofertas[clave]).toEqual({ oferta: 'apagada', motivo: SIN_PERMISO_PARA_EDITAR })
    }
    expect(ofertas.publicar.oferta).toBe('habilitada')
  })

  it('sin editar en el origen: editar, imágenes y actualizar no aparecen', () => {
    const ofertas = ofertasDelMenuDeVehiculo({ ...TODO, edicion: 'sin_permiso' })
    for (const clave of ['editar', 'imagenes', 'actualizar'] as const) {
      expect(ofertas[clave].oferta).toBe('oculta')
    }
  })

  it('«Actualizar los datos»: oculta fuera de subasta (o sin apibara) y apagada sin enlace, lote ni VIN', () => {
    expect(ofertasDelMenuDeVehiculo({ ...TODO, subasta: null }).actualizar.oferta).toBe('oculta')
    expect(
      ofertasDelMenuDeVehiculo({ ...TODO, subasta: { consultable: false } }).actualizar,
    ).toEqual({ oferta: 'apagada', motivo: SIN_ENTRADA_PARA_CONSULTAR })
    // Fuera de subasta no aparece aunque no edite; con subasta y un vehículo ajeno, manda el motivo de la edición.
    expect(
      ofertasDelMenuDeVehiculo({ ...TODO, subasta: null, edicion: 'propios' }).actualizar.oferta,
    ).toBe('oculta')
    expect(
      ofertasDelMenuDeVehiculo({ ...TODO, subasta: { consultable: false }, edicion: 'propios' })
        .actualizar.motivo,
    ).toBe(SIN_PERMISO_PARA_EDITAR)
  })

  it('publicar: nula no aparece; sin el permiso, apagada con el motivo', () => {
    expect(ofertasDelMenuDeVehiculo({ ...TODO, publicar: null }).publicar.oferta).toBe('oculta')
    expect(
      ofertasDelMenuDeVehiculo({
        ...TODO,
        publicar: { estado: 'deshabilitado', motivo: 'Sin permiso de vitrina.' },
      }).publicar,
    ).toEqual({ oferta: 'apagada', motivo: 'Sin permiso de vitrina.' })
  })

  it('«Ver actividad» sólo con actividad.ver; la papelera, como su permiso', () => {
    expect(ofertasDelMenuDeVehiculo({ ...TODO, actividad: false }).actividad.oferta).toBe('oculta')
    expect(
      ofertasDelMenuDeVehiculo({
        ...TODO,
        papelera: {
          estado: 'deshabilitado',
          motivo: 'Está vinculado a un lead.',
          acciones: { acciones: [], pedido: null },
        },
      }).papelera,
    ).toEqual({ oferta: 'apagada', motivo: 'Está vinculado a un lead.' })
    expect(
      ofertasDelMenuDeVehiculo({ ...TODO, papelera: { estado: 'oculto' } }).papelera.oferta,
    ).toBe('oculta')
  })
})

describe('«Editar fechas de subasta»', () => {
  it('sólo donde la superficie la ofrece (la ficha de una subasta) y con la regla de la edición', () => {
    expect(ofertasDelMenuDeVehiculo({ ...TODO, fechas: false }).fechas.oferta).toBe('oculta')
    expect(ofertasDelMenuDeVehiculo(TODO).fechas.oferta).toBe('habilitada')
    expect(ofertasDelMenuDeVehiculo({ ...TODO, edicion: 'propios' }).fechas).toEqual({
      oferta: 'apagada',
      motivo: SIN_PERMISO_PARA_EDITAR,
    })
    expect(ofertasDelMenuDeVehiculo({ ...TODO, edicion: 'sin_permiso' }).fechas.oferta).toBe(
      'oculta',
    )
    // No depende de apibara: se escribe a mano.
    expect(ofertasDelMenuDeVehiculo({ ...TODO, subasta: null }).fechas.oferta).toBe('habilitada')
  })
})
