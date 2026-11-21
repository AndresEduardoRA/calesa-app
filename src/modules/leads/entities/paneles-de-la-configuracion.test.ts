import { describe, expect, it } from 'vitest'
import {
  CLAVES_DE_LAS_FAMILIAS,
  FAMILIAS_DE_LA_CONFIGURACION,
  destinoDeLaSeccionVieja,
  destinoDeLaSubrutaVieja,
  familiaDelPanel,
  esClaveDeFamilia,
} from './paneles-de-la-configuracion'

describe('familiaDelPanel', () => {
  it('cada panel de una familia dice la suya', () => {
    expect(familiaDelPanel('origenes')).toBe('origenes')
    expect(familiaDelPanel('nuevo-origen')).toBe('origenes')
    expect(familiaDelPanel('editar-origen')).toBe('origenes')
    expect(familiaDelPanel('eliminar-origen')).toBe('origenes')
    expect(familiaDelPanel('nuevo-tipo')).toBe('tipos')
    expect(familiaDelPanel('eliminar-tipo-de-seguimiento')).toBe('seguimientos')
    expect(familiaDelPanel('restablecer-embudo')).toBe('embudo')
    expect(familiaDelPanel('restablecer-portal')).toBe('portal')
    expect(familiaDelPanel('telefonos')).toBe('telefonos')
  })

  it('un panel ajeno, vacío o ausente no es de ninguna', () => {
    expect(familiaDelPanel('exportar')).toBeNull()
    expect(familiaDelPanel('')).toBeNull()
    expect(familiaDelPanel(null)).toBeNull()
    expect(familiaDelPanel(undefined)).toBeNull()
  })
})

describe('las familias', () => {
  it('ningún panel está en dos familias y el principal es de la suya', () => {
    const todos = CLAVES_DE_LAS_FAMILIAS.flatMap(
      (clave) => FAMILIAS_DE_LA_CONFIGURACION[clave].paneles,
    )
    expect(new Set(todos).size).toBe(todos.length)
    for (const clave of CLAVES_DE_LAS_FAMILIAS) {
      const familia = FAMILIAS_DE_LA_CONFIGURACION[clave]
      expect(familia.paneles).toContain(familia.principal)
      expect(familia.principal).toBe(clave)
    }
  })

  it('esClaveDeFamilia reconoce las seis claves y nada más', () => {
    expect(CLAVES_DE_LAS_FAMILIAS.every((clave) => esClaveDeFamilia(clave))).toBe(true)
    expect(esClaveDeFamilia('campos')).toBe(false)
    expect(esClaveDeFamilia(null)).toBe(false)
  })
})

const ID = '00000000-0000-4000-8000-000000000001'
const RAIZ = '/configuracion/leads'
const de = (busqueda: string) => new URLSearchParams(busqueda)

describe('las seis sub-rutas viejas van a su tarjeta', () => {
  it.each(CLAVES_DE_LAS_FAMILIAS)('/configuracion/leads/%s abre ?panel=%s', (clave) => {
    expect(destinoDeLaSubrutaVieja(clave, de(''))).toBe(`${RAIZ}?panel=${clave}`)
  })

  it('son exactamente las seis tarjetas', () => {
    expect([...CLAVES_DE_LAS_FAMILIAS].sort()).toEqual(
      ['embudo', 'origenes', 'portal', 'seguimientos', 'telefonos', 'tipos'].sort(),
    )
  })

  it('un panel de la misma tarjeta manda y se conserva todo lo demás', () => {
    expect(destinoDeLaSubrutaVieja('origenes', de(`panel=editar-origen&origen=${ID}`))).toBe(
      `${RAIZ}?panel=editar-origen&origen=${ID}`,
    )
    expect(destinoDeLaSubrutaVieja('tipos', de(`panel=eliminar-tipo&tipo=${ID}`))).toBe(
      `${RAIZ}?panel=eliminar-tipo&tipo=${ID}`,
    )
    expect(destinoDeLaSubrutaVieja('embudo', de('panel=restablecer-embudo'))).toBe(
      `${RAIZ}?panel=restablecer-embudo`,
    )
  })

  it('un panel que era de otra parte se descarta, y lo demás se conserva', () => {
    expect(destinoDeLaSubrutaVieja('tipos', de('panel=nuevo-origen&otro=1'))).toBe(
      `${RAIZ}?panel=tipos&otro=1`,
    )
  })

  it('sin el panel, el id que sobra se conserva (el modal lo revisa al abrir)', () => {
    expect(destinoDeLaSubrutaVieja('seguimientos', de(`tipo-de-seguimiento=${ID}`))).toBe(
      `${RAIZ}?panel=seguimientos&tipo-de-seguimiento=${ID}`,
    )
  })
})

describe('destinoDeLaSeccionVieja (`?seccion=` de cuando había pestañas)', () => {
  it('sin `seccion` no hay nada que mover: la raíz dibuja las tarjetas', () => {
    expect(destinoDeLaSeccionVieja(de(''))).toBeNull()
    expect(destinoDeLaSeccionVieja(de('panel=tipos'))).toBeNull()
  })

  it.each(CLAVES_DE_LAS_FAMILIAS)('?seccion=%s abre su panel', (clave) => {
    expect(destinoDeLaSeccionVieja(de(`seccion=${clave}`))).toBe(`${RAIZ}?panel=${clave}`)
  })

  it('conserva el panel de la tarjeta y lo que elige, en su orden', () => {
    expect(destinoDeLaSeccionVieja(de(`panel=editar-origen&seccion=origenes&origen=${ID}`))).toBe(
      `${RAIZ}?panel=editar-origen&origen=${ID}`,
    )
    expect(destinoDeLaSeccionVieja(de('seccion=tipos&panel=nuevo-tipo'))).toBe(
      `${RAIZ}?panel=nuevo-tipo`,
    )
    expect(destinoDeLaSeccionVieja(de('seccion=portal&panel=restablecer-portal'))).toBe(
      `${RAIZ}?panel=restablecer-portal`,
    )
  })

  it('`seccion=campos` va a su ruta, con lo demás', () => {
    expect(destinoDeLaSeccionVieja(de('seccion=campos'))).toBe('/configuracion/leads/campos')
    expect(destinoDeLaSeccionVieja(de(`seccion=campos&campo=${ID}`))).toBe(
      `/configuracion/leads/campos?campo=${ID}`,
    )
  })

  it('un `seccion` que no existe se quita', () => {
    expect(destinoDeLaSeccionVieja(de('seccion=basura'))).toBe(RAIZ)
    expect(destinoDeLaSeccionVieja(de('seccion=%3Cscript%3E&panel=tipos'))).toBe(
      `${RAIZ}?panel=tipos`,
    )
    expect(destinoDeLaSeccionVieja(de('seccion='))).toBe(RAIZ)
  })

  it('ningún destino lleva `seccion`: no vuelve a redirigir', () => {
    for (const busqueda of [
      'seccion=tipos&panel=nuevo-tipo',
      'seccion=x',
      'seccion=campos&seccion=tipos',
      'seccion=origenes&seccion=origenes',
    ]) {
      expect(destinoDeLaSeccionVieja(de(busqueda))).not.toContain('seccion')
    }
  })
})
