import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { EleccionesDeLaHoja } from '../../../entities/obligatorios-al-cotizar'
import type { Guardado } from '../hooks/use-guardado'
import { HojaDeCotizar } from './hoja-de-cotizar'
import { render } from './render-con-url.soporte'

vi.mock('../../../composicion.client', () => ({ recalcular: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))

// Lo que la hoja pide elegir antes de guardar según el rol (`obligatorios`) y cómo se elige (`elecciones`): `docs/UX.md` › «Cotizar». El guardado es un doble quieto.
const QUIETO: Guardado = {
  estado: { tipo: 'listo' },
  enLinea: true,
  hayPendiente: false,
  ocupado: false,
  guardar: () => {},
  guardarConLaAbierta: () => {},
  olvidarAviso: () => {},
  reiniciar: () => {},
}

const LEAD = '33333333-3333-4333-8333-333333333333'
const ELECCIONES: EleccionesDeLaHoja = {
  lead: { panel: 'cliente' },
  vehiculo: { panel: 'vehiculo' },
  titulo: { panel: 'vehiculo' },
}

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({ usd: 2350, valores: { remate: 0 } }),
  estado: { tipo: 'al_dia' },
}

afterEach(cleanup)

describe('HojaDeCotizar: lo obligatorio al cotizar', () => {
  it('sin vehículo y con el rol que lo pide: dice qué falta junto a «Guardar» y ofrece elegirlo', () => {
    render(
      <HojaDeCotizar
        hoja={hojaDePrueba()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={LEAD}
        obligatorios={{ lead: true, vehiculo: true }}
        elecciones={ELECCIONES}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={QUIETO}
      />,
    )
    expect(screen.getByText('Para guardar, elige el vehículo en «Vehículo».')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Elegir el vehículo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Elegir el cliente' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Guardar' }).hasAttribute('disabled')).toBe(true)
  })

  it('sin cliente, el cliente va primero: su motivo y su botón, no el del vehículo', () => {
    render(
      <HojaDeCotizar
        hoja={hojaDePrueba()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={null}
        obligatorios={{ lead: true, vehiculo: true }}
        elecciones={ELECCIONES}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={QUIETO}
      />,
    )
    expect(screen.getByText('Para guardar, elige el cliente en «Cliente».')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Elegir el cliente' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Elegir el vehículo' })).toBeNull()
  })
})

describe('HojaDeCotizar: lo que se pide elegir según el permiso, y el vehículo soltado', () => {
  it('sin permiso para ver los vehículos del origen: el pedido en lugar del botón', () => {
    render(
      <HojaDeCotizar
        hoja={hojaDePrueba()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={LEAD}
        obligatorios={{ lead: false, vehiculo: true }}
        elecciones={{
          ...ELECCIONES,
          vehiculo: { pedido: 'Para elegir el vehículo, pídeselo a quien administra los roles.' },
        }}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={QUIETO}
      />,
    )
    expect(
      screen.getByText('Para elegir el vehículo, pídeselo a quien administra los roles.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Elegir el vehículo' })).toBeNull()
  })

  it('el rol que no pide nada (las dos claves) deja la hoja sin motivo ni «Elegir…»', () => {
    render(
      <HojaDeCotizar
        hoja={hojaDePrueba()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
        leadId={null}
        obligatorios={{ lead: false, vehiculo: false }}
        elecciones={ELECCIONES}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={QUIETO}
      />,
    )
    expect(screen.queryByText(/Para guardar, elige/)).toBeNull()
    expect(screen.queryByRole('button', { name: /^Elegir/ })).toBeNull()
  })

  it('el vehículo de la URL que la base no dejó usar se dice', () => {
    render(
      <HojaDeCotizar
        hoja={hojaDePrueba()}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado
        leadId={LEAD}
        borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
        guardado={QUIETO}
      />,
    )
    expect(screen.getByText('No se puede usar ese vehículo.')).toBeTruthy()
  })
})
