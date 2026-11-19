import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LeadDeFicha } from '../../../entities/ficha'
import { AccionesDeLaFicha } from './acciones-de-la-ficha'

const menu = vi.fn<(props: Record<string, unknown>) => void>()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('../../marcas/components/menu-de-lead', () => ({
  MenuDeLeadConMarcas: (props: Record<string, unknown>) => {
    menu(props)
    return <button type="button">Más acciones</button>
  },
}))
vi.mock('../../oportunidades/hooks/use-panel-de-oportunidad-rapida', () => ({
  usePanelDeOportunidadRapida: () => ({ abierto: false, abrir: vi.fn(), cerrar: vi.fn() }),
}))
vi.mock('../../oportunidades/components/nueva-oportunidad-del-lead', () => ({
  NuevaOportunidadDelLead: () => null,
}))
vi.mock('../hooks/use-abrir-en-la-ficha', () => ({
  useAbrirEnLaFicha: () => ({ anotar: vi.fn(), agendar: vi.fn(), irA: vi.fn() }),
}))
vi.mock('../hooks/use-panel-de-lead', () => ({
  usePanelDeLead: () => ({ abrir: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  menu.mockClear()
})

const ficha = { id: 'l-1', nombre: 'Ana Prieto', vehiculosVinculados: 0 } as unknown as LeadDeFicha
const RUTA = '/cotizaciones/nuevo?origen=o-1&lead=l-1'

function montar(paraCotizar: string | null, puedeEditar = true) {
  render(
    <AccionesDeLaFicha
      ficha={ficha}
      marcas={{} as never}
      etiquetas={{} as never}
      alGestionar={vi.fn()}
      puedeEditar={puedeEditar}
      puedeEditarExtras={false}
      puedeEnviarAPapelera={false}
      paraCotizar={paraCotizar}
      paraActividad={null}
    />,
  )
}

describe('AccionesDeLaFicha', () => {
  it('sólo el «⋯»: «Cotizar» y «Editar» no van sueltos', () => {
    montar(RUTA)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['Más acciones'])
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('el «⋯» recibe la hoja de cotizar y la edición, sin borde (va en la esquina)', () => {
    montar(RUTA)
    expect(menu).toHaveBeenCalledWith(
      expect.objectContaining({
        paraCotizar: RUTA,
        editar: expect.objectContaining({ modo: 'lead' }) as unknown,
      }),
    )
    expect(menu.mock.calls[0]?.[0]).not.toHaveProperty('conBorde')
  })

  it('sin poder editar, el «⋯» no ofrece la edición', () => {
    montar(null, false)
    expect(menu.mock.calls[0]?.[0]).toMatchObject({ paraCotizar: null, editar: undefined })
  })
})
