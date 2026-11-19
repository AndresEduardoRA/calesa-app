import { cleanup, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CampoDeLead } from '../../../entities/campo'
import type { LeadDeFicha } from '../../../entities/ficha'
import { DatosClaveDelLead } from './datos-clave-del-lead'

// La tabla de países no llega en jsdom: el país del teléfono se prueba en `datos-clave-del-lead.test.ts` y en el e2e.
vi.mock('../../telefono/hooks/use-paises', () => ({ usePaises: () => null }))

afterEach(cleanup)

const ficha = {
  id: 'l-1',
  nombre: 'Ana Prieto',
  creadoEn: '2026-11-10T14:00:00Z',
  telefono: '59170000004',
  telefonoCc: '591',
  telefonos: [],
  atributos: { pais: 'Perú', notas: 'Quiere un sedán\nrojo' },
  enCartera: true,
} as unknown as LeadDeFicha

const campo = (clave: string, etiqueta: string, extra: Partial<CampoDeLead> = {}) =>
  ({
    clave,
    etiqueta,
    tipo: 'texto',
    grupo: null,
    activo: true,
    soloCartera: false,
    ...extra,
  }) as unknown as CampoDeLead

const CAMPOS = [
  campo('pais', 'País', { grupo: 'Ubicación' }),
  campo('notas', 'Notas', { tipo: 'texto_largo' }),
]

function montar(props: Partial<Parameters<typeof DatosClaveDelLead>[0]> = {}) {
  return render(
    <NuqsTestingAdapter>
      <DatosClaveDelLead
        ficha={ficha}
        campos={CAMPOS}
        origen={{ nombre: 'Facebook', activo: true, icono: null }}
        tipo={null}
        edicion="lead"
        {...props}
      />
    </NuqsTestingAdapter>,
  )
}

describe('DatosClaveDelLead', () => {
  it('se lee «Facebook (inactivo)» de corrido: el espacio es texto y no sólo el hueco entre cajas', () => {
    const { container } = montar({
      origen: { nombre: 'Facebook', activo: false, icono: 'compartir' },
    })
    expect(container.textContent).toContain('Facebook (inactivo)')
  })

  it('los cuatro datos clave y «Notas» a lo ancho; los grupos no van a la vista', () => {
    const { container } = montar()
    expect(screen.getByRole('heading', { level: 2, name: 'Datos' })).toBeTruthy()
    const etiquetas = [...container.querySelectorAll('dt')].map((dt) => dt.textContent)
    expect(etiquetas).toEqual(['Tipo', 'Origen del lead', 'País', 'Teléfono principal', 'Notas'])
    expect(container.textContent).toContain('Perú')
    const notas = screen.getByText(/Quiere un sedán/).closest('div.col-span-full')
    expect(notas?.querySelector('dd')?.className).toContain('line-clamp-4')
    expect(screen.queryByRole('heading', { level: 3 })).toBeNull()
    expect(container.textContent).not.toContain('Completo solo para su cartera.')
  })

  it('«Ver más» abre un diálogo', () => {
    montar()
    const boton = screen.getByRole('button', { name: 'Ver más' })
    expect(boton.getAttribute('aria-haspopup')).toBe('dialog')
  })

  it('sin campo «Notas» no se dibuja; vacío dice «Sin notas»', () => {
    const { container, unmount } = montar({ campos: [CAMPOS[0] as CampoDeLead] })
    expect(container.textContent).not.toContain('Notas')
    unmount()
    montar({ ficha: { ...ficha, atributos: { pais: 'Perú' } } as LeadDeFicha })
    expect(screen.getByText('Sin notas')).toBeTruthy()
  })

  it('fuera de la cartera: los privados dicen «Solo la cartera» y el teléfono lleva su aviso', () => {
    const { container } = montar({
      campos: [
        campo('pais', 'País', { soloCartera: true }),
        campo('notas', 'Notas', { tipo: 'texto_largo', soloCartera: true }),
      ],
      ficha: {
        ...ficha,
        telefono: '591•••••04',
        atributos: {},
        enCartera: false,
      } as unknown as LeadDeFicha,
      edicion: null,
    })
    expect(screen.getAllByText('Solo la cartera')).toHaveLength(2)
    expect(container.textContent).toContain('Completo solo para su cartera.')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
