import { describe, expect, it } from 'vitest'
import { RUTAS } from '@/shared/lib/rutas'
import { PARTES_DEL_ORIGEN, PARTES_GENERALES, SECCION_DE_COTIZACION } from './seccion'

describe('la sección Cotización de Configuración', () => {
  it('tiene su clave, su ruta y se abre con ver los roles o configurar la cotización', () => {
    expect(SECCION_DE_COTIZACION.clave).toBe('cotizacion')
    expect(SECCION_DE_COTIZACION.ruta).toBe(RUTAS.configuracionDeCotizacion)
    expect([...SECCION_DE_COTIZACION.permisos]).toEqual([
      'equipo.roles.ver',
      'equipo.roles.gestionar',
      'cotizaciones.configurar',
    ])
  })

  it('su descripción nombra lo de cada origen y lo general', () => {
    expect(SECCION_DE_COTIZACION.descripcion).toBe(
      'La fórmula, la hoja, la tarjeta y las tablas de cada origen, y los colores, los niveles y la vigencia.',
    )
  })

  it('primero las cuatro partes de un origen, como plantillas con su respaldo, y después las tres generales', () => {
    expect(
      SECCION_DE_COTIZACION.subsecciones.map((sub) => [sub.clave, sub.titulo, sub.grupo]),
    ).toEqual([
      ['formula', 'Fórmula', 'Por origen'],
      ['hoja', 'Hoja', 'Por origen'],
      ['tarjeta', 'Tarjeta', 'Por origen'],
      ['tablas', 'Tablas', 'Por origen'],
      ['colores', 'Colores', 'General'],
      ['niveles', 'Niveles', 'General'],
      ['vigencia', 'Vigencia', 'General'],
    ])
    expect(PARTES_DEL_ORIGEN.map((parte) => [parte.ruta, parte.respaldo])).toEqual([
      ['/configuracion/cotizacion/[origen]/formula', '/configuracion/cotizacion?seccion=formula'],
      ['/configuracion/cotizacion/[origen]/hoja', '/configuracion/cotizacion?seccion=diseno'],
      ['/configuracion/cotizacion/[origen]/tarjeta', '/configuracion/cotizacion?seccion=tarjeta'],
      ['/configuracion/cotizacion/[origen]/tablas', '/configuracion/cotizacion?seccion=tablas'],
    ])
    expect(PARTES_GENERALES.map((parte) => parte.ruta)).toEqual([
      '/configuracion/cotizacion/general/colores',
      '/configuracion/cotizacion/general/niveles',
      '/configuracion/cotizacion/general/vigencia',
    ])
  })

  it('cada parte, con su permiso; Niveles, apagada con el nombre exacto del permiso', () => {
    expect(
      PARTES_DEL_ORIGEN.every((parte) => parte.permisos.join() === 'cotizaciones.configurar'),
    ).toBe(true)
    expect(PARTES_GENERALES.map((parte) => [...parte.permisos])).toEqual([
      ['cotizaciones.configurar'],
      ['equipo.roles.ver', 'equipo.roles.gestionar'],
      ['cotizaciones.configurar'],
    ])
    expect(PARTES_GENERALES[1].motivoSinPermiso).toBe('Te falta el permiso «Ver roles».')
  })

  it('cada parte, con su frase', () => {
    expect(SECCION_DE_COTIZACION.subsecciones.map((sub) => sub.descripcion)).toEqual([
      'Qué se calcula.',
      'Cómo se ve y se llena la cotización.',
      'La imagen que recibe el cliente.',
      'Valores de referencia: depreciación, transporte…',
      'Los colores de la hoja y de la tarjeta, para toda la empresa.',
      'Quién ve y edita qué celdas.',
      'Cuántos días vale una cotización.',
    ])
  })
})
