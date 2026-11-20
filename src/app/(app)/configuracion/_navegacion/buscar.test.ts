import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import { gruposVisibles, paraElNavegador, type GrupoDelNavegador } from '../secciones'
import { TOPE_DE_RESULTADOS, buscarEnConfiguracion, normalizar } from './buscar'

const TODO: Permisos = [
  'equipo.usuarios.gestionar',
  'equipo.roles.gestionar',
  'empresa.ajustes.gestionar',
  'origenes.gestionar',
  'leads.campos.gestionar',
  'leads.configurar',
  'cotizaciones.configurar',
  'flujos.configurar',
  'repuestos.configurar',
  'web.ajustes.gestionar',
  'web.contenido.gestionar',
  'web.cola.gestionar',
].map((clave) => ({ clave, origenId: null, alcance: 'todos' }) as Permisos[number])

const grupos = paraElNavegador(gruposVisibles(TODO))
const caminos = (texto: string, de: readonly GrupoDelNavegador[] = grupos, actual = '/') =>
  buscarEnConfiguracion(de, texto, actual).map((r) => r.camino)

describe('normalizar', () => {
  it('quita acentos, mayúsculas y espacios de más', () => {
    expect(normalizar('  Orígenes   DEL  Lead ')).toBe('origenes del lead')
  })
})

describe('buscarEnConfiguracion', () => {
  it('un texto vacío no busca', () => {
    expect(caminos('')).toEqual([])
    expect(caminos('   ')).toEqual([])
  })

  it('encuentra por nombre, sin acentos ni mayúsculas, y lo que más se parece va primero', () => {
    expect(caminos('ORIGENES')[0]).toBe('Orígenes')
    expect(caminos('portal')).toEqual(['Leads › Mensaje del portal', 'Leads'])
  })

  it('encuentra por las palabras clave que declara el registro', () => {
    expect(caminos('logo')[0]).toBe('Empresa › Datos de la empresa')
    expect(caminos('whatsapp')).toContain('Leads › Mensaje del portal')
    expect(caminos('código')).toContain('Leads › Mensaje del portal')
  })

  it('la sección y su sub-sección índice, que abren lo mismo, se ven como la sub-sección', () => {
    const empresa = buscarEnConfiguracion(grupos, 'empresa', '/')
    expect(empresa.map((r) => r.ruta).filter((r) => r === '/configuracion/empresa')).toHaveLength(1)
    expect(empresa[0]?.camino).toBe('Empresa › Datos de la empresa')
  })

  it('varias palabras: todas tienen que estar, en el título con el de su sección o en sus palabras', () => {
    expect(caminos('leads portal')[0]).toBe('Leads › Mensaje del portal')
    expect(caminos('empresa zzz')).toEqual([])
  })

  it('sin coincidencias, nada', () => {
    expect(caminos('xyzxyz')).toEqual([])
  })

  it('sólo ofrece lo que la persona puede abrir: la sub-sección apagada no figura', () => {
    const soloLeads = paraElNavegador(
      gruposVisibles([{ clave: 'leads.configurar', origenId: null, alcance: 'todos' }]),
    )
    expect(caminos('campos', soloLeads)).toEqual([])
    expect(caminos('empresa', soloLeads)).toEqual([])
    expect(caminos('portal', soloLeads)).toContain('Leads › Mensaje del portal')
    expect(caminos('portal', [])).toEqual([])
  })

  it('una plantilla se rellena con la ruta actual o usa su respaldo', () => {
    const id = '00000000-0000-4000-8000-000000000001'
    const conOrigen = buscarEnConfiguracion(grupos, 'campos', `/configuracion/origenes/${id}/datos`)
    expect(conOrigen.map((r) => r.ruta)).toContain(`/configuracion/origenes/${id}/campos`)
    const sinOrigen = buscarEnConfiguracion(grupos, 'fórmula', '/configuracion/inicio')
    const formula = sinOrigen.find((r) => r.camino === 'Cotización › Fórmula')
    expect(formula?.ruta).toBe('/configuracion/cotizacion?seccion=formula')
    // Sin origen en la URL y sin respaldo, la parte de un origen no se ofrece.
    expect(
      buscarEnConfiguracion(grupos, 'categorías', '/configuracion/inicio').map((r) => r.camino),
    ).not.toContain('Orígenes › Categorías')
  })

  it('dibuja como mucho el tope', () => {
    expect(buscarEnConfiguracion(grupos, 'e', '/').length).toBeLessThanOrEqual(TOPE_DE_RESULTADOS)
  })
})
