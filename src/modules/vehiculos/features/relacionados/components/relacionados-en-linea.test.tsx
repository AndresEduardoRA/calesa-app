import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContextoDeAcciones } from '../../../entities/acciones-de-relacionados'
import type { GrupoDeRelacionados, GruposDeRelacionados } from '../../../entities/relacionados'
import { Relacionados } from './relacionados'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

afterEach(cleanup)

const contexto: ContextoDeAcciones = {
  lugar: 'logistica',
  ancla: { lado: 'vehiculo', vehiculoId: 'v1', origenId: 'o1', editable: true },
  para: {
    cotizarEn: [],
    claveDelVehiculo: 'vehiculo',
    claveDelLead: 'lead',
    rutaDeCotizacion: null,
    editarLeads: true,
  },
}

const grupo = (
  tipo: GrupoDeRelacionados<unknown>['tipo'],
  n: number,
): GrupoDeRelacionados<unknown> => ({
  tipo,
  filas: [],
  conteo: { n, hayMas: false },
  ocultos: n,
  hayMas: false,
})

function dibujar(grupos: GruposDeRelacionados<unknown>) {
  return render(
    <Relacionados
      presentacion="linea"
      grupos={grupos}
      contexto={contexto}
      enCurso={false}
      alElegir={vi.fn()}
      filasDe={() => null}
      verTodosDe={() => null}
    />,
  )
}

describe('Relacionados en una línea', () => {
  it('un chip por grupo con algo, sin encabezado ni popover montado; un grupo vacío no tiene chip', () => {
    dibujar({
      vinculado: grupo('vinculado', 3),
      interesado: { ...grupo('interesado', 0), ocultos: 0 },
      cotizado: null,
    })
    const seccion = screen.getByRole('region', { name: 'Relacionados' })
    expect(seccion.querySelector('h2, h3')).toBeNull()
    expect(screen.getByRole('button', { name: /Vinculado · 3/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Interesado/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Cotizado/ })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('las acciones del grupo que no se dibuja van al «⋯» de la línea', () => {
    dibujar({
      vinculado: grupo('vinculado', 1),
      interesado: { ...grupo('interesado', 0), ocultos: 0 },
      cotizado: null,
    })
    expect(screen.getByRole('button', { name: 'Más acciones de «Relacionados»' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Marcar un interesado' })).toBeNull()
  })

  it('con todo vacío: la frase, una sola acción a la vista y el resto en el «⋯»', () => {
    dibujar({
      vinculado: { ...grupo('vinculado', 0), ocultos: 0 },
      interesado: { ...grupo('interesado', 0), ocultos: 0 },
      cotizado: null,
    })
    expect(screen.getByText('Sin relacionados todavía.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Vinculado/ })).toBeNull()
    expect(screen.getByRole('link', { name: 'Vincular a un lead' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Marcar un interesado' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Más acciones de «Relacionados»' })).toBeTruthy()
  })
})
