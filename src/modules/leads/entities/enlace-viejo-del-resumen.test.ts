import { describe, expect, it } from 'vitest'
import { destinoDelEnlaceViejo } from './enlace-viejo-del-resumen'

const LEAD = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const OTRO = '9b2c7d1e-1f3a-4b6c-8d4e-2a5f6b7c8d90'
const TODO = { editar: true, telefonos: true }
const NADA = { editar: false, telefonos: false }
const SOLO_TELEFONOS = { editar: false, telefonos: true }

describe('destinoDelEnlaceViejo', () => {
  it('sin `?lead=` no es un enlace viejo', () => {
    expect(destinoDelEnlaceViejo({ lead: undefined }, TODO)).toBeNull()
    expect(destinoDelEnlaceViejo({ lead: '' }, TODO)).toBeNull()
  })

  it('lleva a la ficha limpia', () => {
    expect(destinoDelEnlaceViejo({ lead: LEAD }, NADA)).toBe(`/leads/${LEAD}`)
  })

  it('un `lead` que no es un id redirige igual, codificado: la ficha dice que no está', () => {
    expect(destinoDelEnlaceViejo({ lead: 'abc' }, TODO)).toBe('/leads/abc')
    expect(destinoDelEnlaceViejo({ lead: 'a/b?c' }, TODO)).toBe('/leads/a%2Fb%3Fc')
  })

  it('`pestana=seguimientos|recordatorios` lleva al bloque de seguimientos', () => {
    expect(destinoDelEnlaceViejo({ lead: LEAD, pestana: 'seguimientos' }, NADA)).toBe(
      `/leads/${LEAD}?seccion=seguimientos`,
    )
    expect(destinoDelEnlaceViejo({ lead: LEAD, pestana: 'recordatorios' }, NADA)).toBe(
      `/leads/${LEAD}?seccion=seguimientos`,
    )
  })

  it('con la pestaña, el modal que traía y su id; un id que no es un id se descarta', () => {
    expect(
      destinoDelEnlaceViejo(
        { lead: LEAD, pestana: 'seguimientos', panel: 'editar-seguimiento', seguimiento: OTRO },
        NADA,
      ),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos&panel=editar-seguimiento&seguimiento=${OTRO}`)
    expect(
      destinoDelEnlaceViejo(
        { lead: LEAD, pestana: 'recordatorios', panel: 'editar-recordatorio', recordatorio: OTRO },
        NADA,
      ),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos&panel=editar-recordatorio&recordatorio=${OTRO}`)
    expect(
      destinoDelEnlaceViejo(
        {
          lead: LEAD,
          pestana: 'seguimientos',
          panel: 'editar-seguimiento',
          seguimiento: '1; drop',
        },
        NADA,
      ),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos&panel=editar-seguimiento`)
    expect(
      destinoDelEnlaceViejo({ lead: LEAD, pestana: 'seguimientos', panel: 'etiquetas' }, TODO),
    ).toBe(`/leads/${LEAD}?seccion=seguimientos`)
  })
})

describe('destinoDelEnlaceViejo: los paneles sin pestaña', () => {
  it('anotar, agendar y la oportunidad se conservan con `editar`; sin él se quitan', () => {
    for (const panel of ['anotar-seguimiento', 'agendar-recordatorio', 'oportunidad-rapida']) {
      expect(destinoDelEnlaceViejo({ lead: LEAD, panel }, TODO)).toBe(
        `/leads/${LEAD}?panel=${panel}`,
      )
      expect(destinoDelEnlaceViejo({ lead: LEAD, panel }, SOLO_TELEFONOS)).toBe(`/leads/${LEAD}`)
    }
  })

  it('`editar-lead` se conserva con sólo los teléfonos; sin permisos se quita', () => {
    expect(destinoDelEnlaceViejo({ lead: LEAD, panel: 'editar-lead' }, SOLO_TELEFONOS)).toBe(
      `/leads/${LEAD}?panel=editar-lead`,
    )
    expect(destinoDelEnlaceViejo({ lead: LEAD, panel: 'editar-lead' }, NADA)).toBe(`/leads/${LEAD}`)
  })

  it('`extra=nuevo` y `panel=agregar-telefono` abren la edición con «Agregar teléfono»; sin permiso, nada', () => {
    const conAgregar = `/leads/${LEAD}?panel=editar-lead&extra=nuevo`
    expect(destinoDelEnlaceViejo({ lead: LEAD, extra: 'nuevo' }, SOLO_TELEFONOS)).toBe(conAgregar)
    expect(destinoDelEnlaceViejo({ lead: LEAD, panel: 'editar-lead', extra: 'nuevo' }, TODO)).toBe(
      conAgregar,
    )
    expect(destinoDelEnlaceViejo({ lead: LEAD, panel: 'agregar-telefono' }, TODO)).toBe(conAgregar)
    expect(destinoDelEnlaceViejo({ lead: LEAD, extra: 'nuevo' }, NADA)).toBe(`/leads/${LEAD}`)
    expect(destinoDelEnlaceViejo({ lead: LEAD, panel: 'agregar-telefono' }, NADA)).toBe(
      `/leads/${LEAD}`,
    )
  })

  it('un panel que la ficha no abre desde el resumen se quita', () => {
    expect(destinoDelEnlaceViejo({ lead: LEAD, panel: 'etiquetas' }, TODO)).toBe(`/leads/${LEAD}`)
    expect(destinoDelEnlaceViejo({ lead: LEAD, panel: 'editar-seguimiento' }, TODO)).toBe(
      `/leads/${LEAD}`,
    )
  })

  it('otra pestaña cuenta como ninguna', () => {
    expect(
      destinoDelEnlaceViejo({ lead: LEAD, pestana: 'resumen', panel: 'anotar-seguimiento' }, TODO),
    ).toBe(`/leads/${LEAD}?panel=anotar-seguimiento`)
  })
})
