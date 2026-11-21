import { describe, expect, it } from 'vitest'
import {
  destinoConPermisos,
  destinoSinLeer,
  seccionConPermisos,
  type DestinosConPermisos,
} from './secciones-viejas'

const ID = '00000000-0000-4000-8000-0000000000a1'
const FICHA = { clave: 'ver', valor: 'ficha' }

describe('`?seccion=fotos` abre el visor', () => {
  it('redirige al visor en la primera foto y conserva los demás parámetros', () => {
    expect(destinoSinLeer(ID, { seccion: 'fotos', panel: 'vitrina', foto: '7' }, FICHA)).toBe(
      `/vehiculos/${ID}?panel=vitrina&visor=${ID}&foto=1`,
    )
    expect(destinoSinLeer(ID, { seccion: 'fotos' }, FICHA)).toBe(
      `/vehiculos/${ID}?visor=${ID}&foto=1`,
    )
  })

  it('sin `seccion`, no redirige', () => {
    expect(destinoSinLeer(ID, {}, FICHA)).toBeNull()
    expect(destinoSinLeer(ID, { visor: ID, foto: '1' }, FICHA)).toBeNull()
  })
})

describe('`?seccion=ficha` abre la ficha completa', () => {
  it('a la misma ficha con `?ver=ficha`, sin `seccion` y con los demás parámetros', () => {
    expect(destinoSinLeer(ID, { seccion: 'ficha', panel: 'vitrina' }, FICHA)).toBe(
      `/vehiculos/${ID}?panel=vitrina&ver=ficha`,
    )
    expect(destinoSinLeer(ID, { seccion: 'ficha', ver: 'otra' }, FICHA)).toBe(
      `/vehiculos/${ID}?ver=ficha`,
    )
  })
})

describe('`?seccion=vitrina` abre el panel de la vitrina', () => {
  it('a la misma ficha con `?panel=vitrina`, sin `seccion` y con el resto de la consulta', () => {
    expect(destinoSinLeer(ID, { seccion: 'vitrina' }, FICHA)).toBe(`/vehiculos/${ID}?panel=vitrina`)
    expect(
      destinoSinLeer(ID, { seccion: 'vitrina', visor: ID, foto: '3', panel: 'imagenes' }, FICHA),
    ).toBe(`/vehiculos/${ID}?visor=${ID}&foto=3&panel=vitrina`)
  })

  it('una `seccion` repetida o un id que no es un uuid: nada', () => {
    expect(destinoSinLeer(ID, { seccion: ['vitrina', 'vitrina'] }, FICHA)).toBeNull()
    expect(destinoSinLeer('../../perfil?x=', { seccion: 'vitrina' }, FICHA)).toBeNull()
  })
})

describe('lo que no redirige sin leer', () => {
  it('un id que no es un uuid no se interpola en la ruta', () => {
    expect(destinoSinLeer('../../perfil?x=', { seccion: 'fotos' }, FICHA)).toBeNull()
    expect(destinoSinLeer('../../perfil?x=', { seccion: 'ficha' }, FICHA)).toBeNull()
  })

  it('una `seccion` repetida, desconocida o de un bloque que sigue: nada', () => {
    expect(destinoSinLeer(ID, { seccion: ['fotos', 'ficha'] }, FICHA)).toBeNull()
    expect(destinoSinLeer(ID, { seccion: 'basura' }, FICHA)).toBeNull()
    expect(destinoSinLeer(ID, { seccion: 'cotizaciones' }, FICHA)).toBeNull()
    expect(destinoSinLeer(ID, { seccion: 'documentos' }, FICHA)).toBeNull()
  })
})

describe('las secciones que se fueron a otra página', () => {
  const CON_TODO: DestinosConPermisos = {
    logistica: {
      unidad: `/logistica/vehiculo/${ID}`,
      documentos: `/logistica/vehiculo/${ID}?hueco=documentos`,
    },
    proyecto: '/repuestos/p1',
  }
  const SIN_NADA: DestinosConPermisos = { logistica: null, proyecto: null }

  it('sólo `documentos`, `fase` y `repuestos`, y una sola vez', () => {
    expect(seccionConPermisos({ seccion: 'documentos' })).toBe('documentos')
    expect(seccionConPermisos({ seccion: 'fase' })).toBe('fase')
    expect(seccionConPermisos({ seccion: 'repuestos' })).toBe('repuestos')
    expect(seccionConPermisos({ seccion: ['fase', 'fase'] })).toBeNull()
    expect(seccionConPermisos({ seccion: 'ficha' })).toBeNull()
    expect(seccionConPermisos({ seccion: 'basura' })).toBeNull()
    expect(seccionConPermisos({})).toBeNull()
  })

  it('`documentos`, al hueco de la unidad con logística; sin ella, arriba', () => {
    expect(destinoConPermisos('documentos', CON_TODO)).toBe(
      `/logistica/vehiculo/${ID}?hueco=documentos`,
    )
    expect(destinoConPermisos('documentos', SIN_NADA)).toBeNull()
  })

  it('`fase`, a la unidad con logística; sin ella, arriba', () => {
    expect(destinoConPermisos('fase', CON_TODO)).toBe(`/logistica/vehiculo/${ID}`)
    expect(destinoConPermisos('fase', SIN_NADA)).toBeNull()
  })

  it('`repuestos`, al proyecto si tiene; si no, arriba', () => {
    expect(destinoConPermisos('repuestos', CON_TODO)).toBe('/repuestos/p1')
    expect(destinoConPermisos('repuestos', { ...CON_TODO, proyecto: null })).toBeNull()
  })
})
