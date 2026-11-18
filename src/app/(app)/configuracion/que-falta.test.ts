import { describe, expect, it } from 'vitest'
import type { ClaveDePaso, PasoSiguiente } from '@/modules/origenes'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { conDestino } from './origenes/pasos'
import { faltasPorSeccion } from './que-falta'

const CHINA = { id: '00000000-0000-4000-8000-000000000001', nombre: 'China', activo: true }
const JAPON = { id: '00000000-0000-4000-8000-000000000002', nombre: 'Japón', activo: true }

const pendientes = (...claves: ClaveDePaso[]): PasoSiguiente[] =>
  claves.map((clave) => ({ clave, titulo: clave, detalle: '', pendiente: true }))

const con = (...claves: ClavePermiso[]): Permisos =>
  claves.map((clave) => ({ clave, origenId: null, alcance: 'todos' }))

const TODO = con(
  'cotizaciones.configurar',
  'flujos.configurar',
  'empresa.ajustes.gestionar',
  'equipo.roles.gestionar',
)

function de(origen: typeof CHINA, pasos: PasoSiguiente[], permisos: Permisos = TODO) {
  return { origen, pasos: conDestino(pasos, permisos, origen.id) }
}

describe('faltasPorSeccion', () => {
  it('un origen sin fórmula: en Cotización, con el enlace a su fórmula', () => {
    expect(faltasPorSeccion([de(CHINA, pendientes('formula'))])).toEqual({
      cotizacion: [
        {
          clave: `formula-${CHINA.id}`,
          texto: 'Falta publicar la fórmula de China',
          ruta: `/configuracion/cotizacion?seccion=formula&origen=${CHINA.id}`,
        },
      ],
    })
  })

  it('sin configurar el cotizador en ese origen, no se ofrece', () => {
    const enOtro: Permisos = [
      { clave: 'cotizaciones.configurar', origenId: JAPON.id, alcance: 'todos' },
    ]
    expect(faltasPorSeccion([de(CHINA, pendientes('formula'), enOtro)])).toEqual({})
  })

  it('un origen inactivo no pide nada', () => {
    expect(
      faltasPorSeccion([de({ ...CHINA, activo: false }, pendientes('formula', 'flujo'))]),
    ).toEqual({})
  })

  it('el flujo sin fases va a Flujos con su origen', () => {
    expect(faltasPorSeccion([de(CHINA, pendientes('flujo'))]).flujos).toEqual([
      {
        clave: `flujo-${CHINA.id}`,
        texto: 'Falta configurar el flujo de China',
        ruta: `/configuracion/flujos?origen=${CHINA.id}`,
      },
    ])
  })

  it('dos subastas sin apibara: una sola falta en Empresa', () => {
    const faltas = faltasPorSeccion([
      de(CHINA, pendientes('apibara')),
      de(JAPON, pendientes('apibara')),
    ])
    expect(faltas.empresa).toEqual([
      {
        clave: 'apibara',
        texto: 'Falta activar apibara',
        ruta: '/configuracion/empresa?seccion=integraciones',
      },
    ])
  })

  it('los permisos del origen no van al inicio, ni lo que ya está hecho', () => {
    const hecho = pendientes('formula').map((paso) => ({ ...paso, pendiente: false }))
    expect(faltasPorSeccion([de(CHINA, [...pendientes('permisos'), ...hecho])])).toEqual({})
  })

  it('cada sección junta las de todos los orígenes, en su orden', () => {
    const faltas = faltasPorSeccion([
      de(CHINA, pendientes('formula')),
      de(JAPON, pendientes('formula')),
    ])
    expect(faltas.cotizacion?.map((falta) => falta.texto)).toEqual([
      'Falta publicar la fórmula de China',
      'Falta publicar la fórmula de Japón',
    ])
  })
})
