import { describe, expect, it } from 'vitest'
import {
  ACCION_PRINCIPAL_DEL_LEAD,
  BLOQUES_DEL_MENU_DE_LEAD,
  ETIQUETA_DE_ACCION_DE_LEAD,
  ETIQUETA_DE_EDITAR_TELEFONOS,
  accionesDeLead,
  edicionDelMenu,
  etiquetaDeAccionDeLead,
  type ClaveDeAccionDeLead,
} from './acciones-de-lead'

const aplanar = (bloques: readonly (readonly string[])[]) => bloques.flat()

const CON_TODO = {
  cotizar: true,
  actuar: true,
  verOportunidades: true,
  editar: 'lead' as const,
  actividad: true,
  enviar: true,
}

describe('accionesDeLead: el orden', () => {
  it('con todo: «Cotizar lead» primero, seguimiento, editar, actividad, marcas y la papelera al final', () => {
    expect(aplanar(accionesDeLead(CON_TODO))).toEqual([
      'cotizar',
      'agendar',
      'anotar',
      'oportunidad',
      'oportunidades',
      'editar',
      'actividad',
      'etiquetas',
      'favorito',
      'tachado',
      'papelera',
    ])
  })

  it('va en seis bloques: la principal sola, seguimiento, «Editar lead» en el suyo bajo «Ver oportunidades», actividad, marcas y lo destructivo', () => {
    expect(accionesDeLead(CON_TODO)).toEqual([
      ['cotizar'],
      ['agendar', 'anotar', 'oportunidad', 'oportunidades'],
      ['editar'],
      ['actividad'],
      ['etiquetas', 'favorito', 'tachado'],
      ['papelera'],
    ])
  })

  it('la acción principal es «Cotizar lead» y va sola en el primer bloque', () => {
    expect(ACCION_PRINCIPAL_DEL_LEAD).toBe('cotizar')
    expect(BLOQUES_DEL_MENU_DE_LEAD[0]).toEqual(['cotizar'])
    expect(ETIQUETA_DE_ACCION_DE_LEAD.cotizar).toBe('Cotizar lead')
  })
})

describe('accionesDeLead: quién ve qué', () => {
  it('lo que quien mira no puede hacer no aparece, y no queda un bloque vacío', () => {
    expect(accionesDeLead({ actuar: false, enviar: false })).toEqual([
      ['etiquetas', 'favorito', 'tachado'],
    ])
    expect(accionesDeLead({ actuar: true, enviar: false })).toEqual([
      ['agendar', 'anotar', 'oportunidad'],
      ['etiquetas', 'favorito', 'tachado'],
    ])
    expect(accionesDeLead({ actuar: false, enviar: true })).toEqual([
      ['etiquetas', 'favorito', 'tachado'],
      ['papelera'],
    ])
  })

  it('sin `cotizaciones.crear` en ningún origen no hay «Cotizar lead»; con él, aunque no pueda editar el lead', () => {
    expect(aplanar(accionesDeLead({ ...CON_TODO, cotizar: false }))).not.toContain('cotizar')
    expect(accionesDeLead({ cotizar: true, actuar: false, enviar: false })).toEqual([
      ['cotizar'],
      ['etiquetas', 'favorito', 'tachado'],
    ])
  })

  it('un lead fuera de la cartera: sin editar, agendar, anotar ni oportunidades; las marcas sí', () => {
    expect(
      accionesDeLead({
        cotizar: true,
        actuar: false,
        editar: null,
        actividad: true,
        enviar: false,
      }),
    ).toEqual([['cotizar'], ['actividad'], ['etiquetas', 'favorito', 'tachado']])
  })

  it('«Editar lead» con `leads.editar`; con sólo los teléfonos extra, el mismo lugar con «Editar teléfonos»', () => {
    expect(accionesDeLead({ actuar: false, editar: 'telefonos', enviar: false })).toEqual([
      ['editar'],
      ['etiquetas', 'favorito', 'tachado'],
    ])
    expect(etiquetaDeAccionDeLead('editar', 'lead')).toBe('Editar lead')
    expect(etiquetaDeAccionDeLead('editar', 'telefonos')).toBe(ETIQUETA_DE_EDITAR_TELEFONOS)
    expect(ETIQUETA_DE_EDITAR_TELEFONOS).toBe('Editar teléfonos')
    expect(etiquetaDeAccionDeLead('agendar', 'telefonos')).toBe('Agendar recordatorio…')
  })

  it('marcar basta con ver el lead: las tres marcas están siempre', () => {
    for (const puede of [
      { actuar: false, enviar: false },
      { actuar: true, enviar: true },
    ]) {
      const claves = aplanar(accionesDeLead(puede))
      expect(claves).toEqual(expect.arrayContaining(['etiquetas', 'favorito', 'tachado']))
    }
  })

  it('«Ver actividad» sólo con actividad.ver, en su bloque, entre editar y las marcas', () => {
    expect(aplanar(accionesDeLead({ actuar: true, enviar: true }))).not.toContain('actividad')
    expect(accionesDeLead({ actuar: true, enviar: true, actividad: true })).toEqual([
      ['agendar', 'anotar', 'oportunidad'],
      ['actividad'],
      ['etiquetas', 'favorito', 'tachado'],
      ['papelera'],
    ])
    expect(ETIQUETA_DE_ACCION_DE_LEAD.actividad).toBe('Ver actividad')
  })

  it('«Nueva oportunidad…» pide poder actuar; «Ver oportunidades» sólo pide tener el lead en la cartera', () => {
    expect(
      aplanar(accionesDeLead({ actuar: false, verOportunidades: true, enviar: false })),
    ).toEqual(['oportunidades', 'etiquetas', 'favorito', 'tachado'])
    expect(ETIQUETA_DE_ACCION_DE_LEAD.oportunidad).toBe('Nueva oportunidad…')
    expect(ETIQUETA_DE_ACCION_DE_LEAD.oportunidades).toBe('Ver oportunidades')
  })
})

describe('edicionDelMenu', () => {
  it('todo el lead con `leads.editar`; sólo los teléfonos sin él; nada sin ninguno', () => {
    expect(edicionDelMenu({ editar: true, telefonos: true })).toBe('lead')
    expect(edicionDelMenu({ editar: true, telefonos: false })).toBe('lead')
    expect(edicionDelMenu({ editar: false, telefonos: true })).toBe('telefonos')
    expect(edicionDelMenu({ editar: false, telefonos: false })).toBeNull()
  })
})

describe('los textos', () => {
  it('cada acción está en un solo bloque y tiene su texto, en español y sin signos de exclamación', () => {
    const claves = aplanar(BLOQUES_DEL_MENU_DE_LEAD) as ClaveDeAccionDeLead[]
    expect(new Set(claves).size).toBe(claves.length)
    expect(claves.sort()).toEqual(Object.keys(ETIQUETA_DE_ACCION_DE_LEAD).sort())
    for (const texto of [
      ...Object.values(ETIQUETA_DE_ACCION_DE_LEAD),
      ETIQUETA_DE_EDITAR_TELEFONOS,
    ]) {
      expect(texto).not.toMatch(/[!¡]/)
    }
    expect(ETIQUETA_DE_ACCION_DE_LEAD.papelera).toBe('Enviar a la papelera')
    expect(ETIQUETA_DE_ACCION_DE_LEAD.favorito).toBe('Favorito')
    expect(ETIQUETA_DE_ACCION_DE_LEAD.tachado).toBe('Tachado')
  })
})
