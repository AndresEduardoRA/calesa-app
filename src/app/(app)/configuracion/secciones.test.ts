import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { NAVEGACION } from '../_shell/navegacion'
import { SECCION_DE_COTIZACION } from './cotizacion/seccion'
import { PERMISOS_DE_EMPRESA } from './empresa/pestanas'
import { SECCION_DE_FLUJOS } from './flujos/seccion'
import { SECCION_DE_REPUESTOS } from './repuestos/seccion'
import {
  GRUPOS,
  SECCIONES,
  conSubseccionesVisibles,
  gruposVisibles,
  paraElNavegador,
  primeraSubseccionAbierta,
  seccionesVisibles,
  type SeccionDeConfiguracion,
} from './secciones'
import { PESTANAS } from './web/pestanas'
import { SECCION_DE_WEB, SECCIONES_DE_WEB } from './web/seccion'

const APP = path.join(process.cwd(), 'src/app/(app)')

describe('secciones de configuración', () => {
  const porClave = (clave: string) =>
    SECCIONES.find((seccion: SeccionDeConfiguracion) => seccion.clave === clave)

  it('son las de hoy, ordenadas por grupo, y Cotización viene de su carpeta', () => {
    expect(SECCIONES.map((seccion) => seccion.clave)).toEqual([
      'empresa',
      'equipo',
      'roles',
      'origenes',
      'leads',
      'cotizacion',
      'flujos',
      'logistica',
      'repuestos',
      ...(SECCIONES_DE_WEB.length > 0 ? ['web'] : []),
      'cola-web',
    ])
    expect(porClave('cotizacion')).toBe(SECCION_DE_COTIZACION)
    expect(porClave('flujos')).toBe(SECCION_DE_FLUJOS)
    expect(porClave('repuestos')).toBe(SECCION_DE_REPUESTOS)
  })

  it('los grupos son los cuatro, en su orden, y cada sección está en uno de ellos y en su orden', () => {
    expect(GRUPOS.map((grupo) => grupo.titulo)).toEqual([
      'Empresa y equipo',
      'Ventas',
      'Operación',
      'Web',
    ])
    const orden = GRUPOS.map((grupo) => grupo.clave)
    const lugares = SECCIONES.map((seccion: SeccionDeConfiguracion) => orden.indexOf(seccion.grupo))
    expect(lugares.every((lugar) => lugar >= 0)).toBe(true)
    expect(lugares).toEqual([...lugares].sort((a, b) => a - b))
    expect(porClave('equipo')?.grupo).toBe('empresa-y-equipo')
    expect(porClave('leads')?.grupo).toBe('ventas')
    expect(porClave('repuestos')?.grupo).toBe('operacion')
    expect(porClave('cola-web')?.grupo).toBe('web')
  })

  it('Sitio web figura sólo si alguna pestaña está llena, y su ruta existe igual', () => {
    expect(SECCIONES_DE_WEB.length > 0).toBe(PESTANAS.some((pestana) => pestana.llena))
    expect(SECCIONES.some((seccion) => seccion.clave === 'web')).toBe(SECCIONES_DE_WEB.length > 0)
    expect(existsSync(path.join(APP, SECCION_DE_WEB.ruta, 'page.tsx'))).toBe(true)
  })

  it('Empresa se abre con los permisos de todas sus pestañas', () => {
    expect(porClave('empresa')?.permisos).toBe(PERMISOS_DE_EMPRESA)
  })

  it('cada sección y cada sub-sección llevan a una pantalla que existe', () => {
    for (const seccion of SECCIONES as readonly SeccionDeConfiguracion[]) {
      expect(existsSync(path.join(APP, seccion.ruta, 'page.tsx')), seccion.ruta).toBe(true)
      for (const sub of seccion.subsecciones) {
        expect(sub.ruta === seccion.ruta || sub.ruta.startsWith(`${seccion.ruta}/`), sub.ruta).toBe(
          true,
        )
        expect(existsSync(path.join(APP, sub.ruta, 'page.tsx')), sub.ruta).toBe(true)
      }
    }
  })

  it('quien puede abrir una sección ve «Configuración» en el menú', () => {
    const delMenu = NAVEGACION.find((entrada) => entrada.clave === 'configuracion')?.permisos ?? []
    for (const seccion of SECCIONES as readonly SeccionDeConfiguracion[]) {
      for (const clave of [
        ...seccion.permisos,
        ...seccion.subsecciones.flatMap((s) => s.permisos),
      ]) {
        expect(delMenu, clave).toContain(clave)
      }
    }
  })

  it('muestra sólo las secciones que la persona puede abrir', () => {
    const ver: Permisos = [{ clave: 'equipo.roles.ver', origenId: null, alcance: 'todos' }]
    const asesora: Permisos = [{ clave: 'leads.ver', origenId: null, alcance: 'propios' }]
    expect(seccionesVisibles(ver).map((s) => s.clave)).toContain('roles')
    expect(seccionesVisibles(asesora)).toEqual([])
  })
})

describe('grupos visibles de configuración', () => {
  it('agrupa lo visible: sólo leads.configurar es «Ventas › Leads»; sin permisos, nada', () => {
    const leads: Permisos = [{ clave: 'leads.configurar', origenId: null, alcance: 'todos' }]
    expect(
      gruposVisibles(leads).map((g) => ({
        clave: g.clave,
        secciones: g.secciones.map((s) => s.clave),
      })),
    ).toEqual([{ clave: 'ventas', secciones: ['leads'] }])
    expect(gruposVisibles([])).toEqual([])
  })
})

describe('sub-secciones de configuración', () => {
  // Una sección de prueba con una índice, una que pide otro permiso sin motivo y otra con motivo.
  const conSub: SeccionDeConfiguracion = {
    ...SECCION_DE_REPUESTOS,
    subsecciones: [
      {
        clave: 'a',
        titulo: 'A',
        descripcion: 'La A.',
        ruta: '/configuracion/repuestos',
        permisos: ['repuestos.configurar'],
      },
      {
        clave: 'b',
        titulo: 'B',
        descripcion: 'La B.',
        ruta: '/configuracion/repuestos/b',
        permisos: ['equipo.roles.gestionar'],
      },
      {
        clave: 'c',
        titulo: 'C',
        descripcion: 'La C.',
        ruta: '/configuracion/repuestos/c',
        permisos: ['equipo.roles.gestionar'],
        motivoSinPermiso: 'Pide el permiso «Roles».',
      },
    ],
  }
  const repuestos: Permisos = [{ clave: 'repuestos.configurar', origenId: null, alcance: 'todos' }]

  it('una sub-sección sin permiso no figura; con motivo, figura apagada', () => {
    const visible = conSubseccionesVisibles(conSub, repuestos)
    expect(visible.subsecciones.map((s) => [s.clave, s.apagada ?? false])).toEqual([
      ['a', false],
      ['c', true],
    ])
    const todas = conSubseccionesVisibles(conSub, [
      ...repuestos,
      { clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' },
    ])
    expect(todas.subsecciones.map((s) => [s.clave, s.apagada ?? false])).toEqual([
      ['a', false],
      ['b', false],
      ['c', false],
    ])
  })

  it('al navegador no viajan iconos, permisos ni frases, y el motivo sólo en la apagada', () => {
    const [grupo] = paraElNavegador([
      {
        clave: 'operacion',
        titulo: 'Operación',
        secciones: [conSubseccionesVisibles(conSub, repuestos)],
      },
    ])
    expect(grupo?.secciones[0]).toEqual({
      clave: 'repuestos',
      titulo: 'Repuestos',
      ruta: '/configuracion/repuestos',
      subsecciones: [
        { clave: 'a', titulo: 'A', ruta: '/configuracion/repuestos' },
        {
          clave: 'c',
          titulo: 'C',
          ruta: '/configuracion/repuestos/c',
          motivo: 'Pide el permiso «Roles».',
        },
      ],
    })
  })

  it('la primera sub-sección abierta es la primera con permiso, o ninguna', () => {
    const roles: Permisos = [{ clave: 'equipo.roles.gestionar', origenId: null, alcance: 'todos' }]
    expect(primeraSubseccionAbierta(conSub, repuestos)).toBe('/configuracion/repuestos')
    expect(primeraSubseccionAbierta(conSub, roles)).toBe('/configuracion/repuestos/b')
    expect(primeraSubseccionAbierta(conSub, [])).toBeNull()
  })
})
