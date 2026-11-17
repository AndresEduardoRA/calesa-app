import { describe, expect, it } from 'vitest'
import { SIN_ULTIMO_CONTACTO, type FilaDeLead } from './listado'
import {
  destinoDeLaPestanaVieja,
  hayModalEnElResumen,
  vistaDelRapido,
  type LecturaDelRapido,
} from './rapido'
import { SIN_MARCAS } from './marcas'

describe('vistaDelRapido', () => {
  const lead = (extra: Partial<FilaDeLead> = {}): FilaDeLead => ({
    id: 'a',
    numeros: { numero: 1, numeroPropio: null, creadorDelPropio: null },
    nombre: 'Ana',
    telefono: '591•••••01',
    enCartera: true,
    duenoId: null,
    tipoLeadId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    origenId: null,
    creadoEn: '2026-10-14T00:00:00Z',
    atributos: {},
    marcas: SIN_MARCAS,
    ...SIN_ULTIMO_CONTACTO,
    ...extra,
  })
  const base = { id: 'a', idValido: true, lectura: null, delListado: null, soloMios: false }
  const lectura = (l: Partial<LecturaDelRapido> & { estado: LecturaDelRapido['estado'] }) =>
    ({ id: 'a', ...l }) as LecturaDelRapido

  it('sin lead en la URL no hay nada que decir', () => {
    expect(vistaDelRapido({ ...base, id: null })).toEqual({ tipo: 'cargando' })
  })

  it('un id que no es un id, o que ya no existe o no se ve, es «no disponible»', () => {
    expect(vistaDelRapido({ ...base, idValido: false })).toEqual({ tipo: 'no_disponible' })
    expect(vistaDelRapido({ ...base, lectura: lectura({ estado: 'no_disponible' }) })).toEqual({
      tipo: 'no_disponible',
    })
  })

  it('mientras llega la lectura se dibuja con la fila de la página; sin ella, cargando', () => {
    expect(vistaDelRapido({ ...base, delListado: lead() })).toEqual({
      tipo: 'lead',
      lead: lead(),
      completo: false,
      fallo: false,
    })
    expect(vistaDelRapido(base)).toEqual({ tipo: 'cargando' })
  })

  it('con la lectura, el lead completo', () => {
    const vista = vistaDelRapido({ ...base, lectura: lectura({ estado: 'listo', lead: lead() }) })
    expect(vista).toEqual({ tipo: 'lead', lead: lead(), completo: true, fallo: false })
  })

  it('«propios» no muestra un lead que no es de su cartera aunque la base lo haya entregado', () => {
    const ajeno = lead({ enCartera: false })
    const entrada = { ...base, lectura: lectura({ estado: 'listo', lead: ajeno }) }
    expect(vistaDelRapido({ ...entrada, soloMios: true })).toEqual({ tipo: 'no_disponible' })
    expect(vistaDelRapido({ ...entrada, soloMios: false }).tipo).toBe('lead')
  })

  it('un fallo de lectura: con la fila, se sigue viendo y se avisa; sin ella, error', () => {
    const error = lectura({ estado: 'error' })
    expect(vistaDelRapido({ ...base, lectura: error, delListado: lead() })).toMatchObject({
      tipo: 'lead',
      completo: false,
      fallo: true,
    })
    expect(vistaDelRapido({ ...base, lectura: error })).toEqual({ tipo: 'error' })
  })
})

describe('hayModalEnElResumen', () => {
  it('el panel de edición y los modales del «⋯» cuentan; lo demás, no', () => {
    expect(hayModalEnElResumen('editar-lead')).toBe(true)
    expect(hayModalEnElResumen('oportunidad-rapida')).toBe(true)
    expect(hayModalEnElResumen('anotar-seguimiento')).toBe(true)
    expect(hayModalEnElResumen('agendar-recordatorio')).toBe(true)
    expect(hayModalEnElResumen('editar-seguimiento')).toBe(false)
    expect(hayModalEnElResumen('filtros')).toBe(false)
    expect(hayModalEnElResumen(null)).toBe(false)
  })
})

describe('destinoDeLaPestanaVieja', () => {
  const LEAD = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
  const OTRO = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'

  it('`?lead=<id>&pestana=seguimientos|recordatorios` lleva a la ficha en el bloque de seguimientos', () => {
    expect(destinoDeLaPestanaVieja({ lead: LEAD, pestana: 'seguimientos' })).toBe(
      `/leads/${LEAD}?seccion=seguimientos`,
    )
    expect(destinoDeLaPestanaVieja({ lead: LEAD, pestana: 'recordatorios' })).toBe(
      `/leads/${LEAD}?seccion=seguimientos`,
    )
  })

  it('lleva el modal que traía, con su id', () => {
    expect(
      destinoDeLaPestanaVieja({
        lead: LEAD,
        pestana: 'seguimientos',
        panel: 'editar-seguimiento',
        seguimiento: OTRO,
      }),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos&panel=editar-seguimiento&seguimiento=${OTRO}`)
    expect(
      destinoDeLaPestanaVieja({
        lead: LEAD,
        pestana: 'recordatorios',
        panel: 'editar-recordatorio',
        recordatorio: OTRO,
      }),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos&panel=editar-recordatorio&recordatorio=${OTRO}`)
  })

  it('lo que no es de entonces no pasa: un panel ajeno o un id que no es un id', () => {
    expect(
      destinoDeLaPestanaVieja({ lead: LEAD, pestana: 'seguimientos', panel: 'etiquetas' }),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos`)
    expect(
      destinoDeLaPestanaVieja({
        lead: LEAD,
        pestana: 'seguimientos',
        panel: 'editar-seguimiento',
        seguimiento: '1; drop',
      }),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos&panel=editar-seguimiento`)
  })

  it('sin lead, con un lead que no es un id o con otra pestaña, no redirige', () => {
    expect(destinoDeLaPestanaVieja({ lead: undefined, pestana: 'seguimientos' })).toBeNull()
    expect(destinoDeLaPestanaVieja({ lead: 'abc', pestana: 'seguimientos' })).toBeNull()
    expect(destinoDeLaPestanaVieja({ lead: LEAD, pestana: 'resumen' })).toBeNull()
    expect(destinoDeLaPestanaVieja({ lead: LEAD, pestana: undefined })).toBeNull()
  })
})
