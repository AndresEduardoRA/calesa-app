import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContextoDeAcciones } from '../../../entities/acciones-de-relacionados'
import type { GrupoDeRelacionados, GruposDeRelacionados } from '../../../entities/relacionados'
import { Relacionados } from './relacionados'

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
  it('un chip por grupo con su cantidad, sin encabezado ni popover montado', () => {
    dibujar({
      vinculado: grupo('vinculado', 3),
      interesado: grupo('interesado', 0),
      cotizado: null,
    })
    const seccion = screen.getByRole('region', { name: 'Relacionados' })
    expect(seccion.querySelector('h2, h3')).toBeNull()
    expect(screen.getByRole('button', { name: /Vinculado/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Interesado · 0/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Cotizado/ })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('con todo vacío dice la frase del bloque, sin chips', () => {
    dibujar({
      vinculado: { ...grupo('vinculado', 0), ocultos: 0 },
      interesado: { ...grupo('interesado', 0), ocultos: 0 },
      cotizado: null,
    })
    expect(screen.getByText('Sin relacionados todavía.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Vinculado/ })).toBeNull()
  })
})
