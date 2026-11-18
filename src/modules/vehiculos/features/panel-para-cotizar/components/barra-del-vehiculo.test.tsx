import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AltaDelPanel } from '../alta-del-panel'
import { BarraDelVehiculo } from './barra-del-vehiculo'

const panelMontado = vi.fn()
vi.mock('./diferidos', () => ({
  PanelDelVehiculoDiferido: (props: { alta: AltaDelPanel | null }) => {
    panelMontado(props)
    return null
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const ID = '00000000-0000-4000-8000-000000000001'

function montar(props: Partial<Parameters<typeof BarraDelVehiculo>[0]> = {}, url = '?origen=o') {
  render(
    <NuqsTestingAdapter searchParams={url}>
      <BarraDelVehiculo
        origenId="o"
        esSubasta
        elegido={null}
        alta={null}
        puedeVer
        claveDeLaUrl="vehiculo"
        cotizado={null}
        historial={null}
        {...props}
      />
    </NuqsTestingAdapter>,
  )
}

describe('BarraDelVehiculo', () => {
  it('sin vehículo invita a elegir uno', () => {
    montar()
    expect(screen.getByRole('button', { name: /Selecciona un vehículo/ })).toBeTruthy()
  })

  it('«Obligatorio» sólo si el rol no guarda sin vehículo y no hay vehículo, en su propio texto: «Selecciona un vehículo» no se parte', () => {
    montar({ obligatorio: true })
    expect(screen.getByText('Obligatorio')).toBeTruthy()
    expect(screen.getByText('Selecciona un vehículo')).toBeTruthy()
    expect(screen.getAllByRole('button')).toHaveLength(1)
    cleanup()
    montar()
    expect(screen.queryByText('Obligatorio')).toBeNull()
    cleanup()
    montar({
      obligatorio: true,
      elegido: { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: '4455', portadaRuta: null },
    })
    expect(screen.queryByText('Obligatorio')).toBeNull()
  })

  it('con vehículo dice su título, su número y su lote', () => {
    montar({
      elegido: { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: '4455', portadaRuta: null },
    })
    const boton = screen.getByRole('button', { name: /Toyota Corolla/ })
    expect(boton.textContent).toContain('#12 · Lote 4455')
    expect(screen.getAllByRole('button')).toHaveLength(1)
  })

  it('sin permiso para ver los vehículos del origen no ofrece elegir', () => {
    montar({ puedeVer: false })
    expect(screen.getByText('No puedes ver los vehículos de este origen.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('dice «Cotizado (n)» dentro del botón, sin sumar una parada de Tab', () => {
    const elegido = { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: null, portadaRuta: null }
    montar({ elegido, cotizado: '2' })
    const boton = screen.getByRole('button', { name: /Toyota Corolla/ })
    expect(boton.textContent).toContain('Cotizado (2)')
    expect(boton.getAttribute('aria-label') ?? boton.textContent).toContain('Cotizado (2)')
    expect(screen.getAllByRole('button')).toHaveLength(1)
    cleanup()
    montar({ elegido, cotizado: '20+' })
    expect(screen.getByRole('button', { name: /Toyota Corolla/ }).textContent).toContain(
      'Cotizado (20+)',
    )
  })

  it('no dice «Cotizado» sin conteo ni sin vehículo', () => {
    const elegido = { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: null, portadaRuta: null }
    montar({ elegido, cotizado: null })
    expect(screen.getByRole('button', { name: /Toyota Corolla/ }).textContent).not.toContain(
      'Cotizado',
    )
    cleanup()
    montar({ elegido: null, cotizado: '3' })
    expect(
      screen.getByRole('button', { name: /Selecciona un vehículo/ }).textContent,
    ).not.toContain('Cotizado')
  })

  it('le pasa al panel el alta que arma la página; sin alta, null', () => {
    const alta = {
      origen: { id: 'o', tipo: 'manual' },
      apibara: { activa: false, puedeConfigurar: false },
    } as unknown as AltaDelPanel
    montar({ alta }, '?origen=o&panel=vehiculo')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ alta }))
    cleanup()
    montar({}, '?origen=o&panel=vehiculo')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ alta: null }))
  })
})

describe('BarraDelVehiculo › el título de lo que se cotiza (T307)', () => {
  const elegido = { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: '4455', portadaRuta: null }

  it('con vehículo, el título grande (entero en `title`) y debajo el vehículo y su referencia', () => {
    montar({ elegido, titulo: 'Para Juan Pérez' })
    const boton = screen.getByRole('button', { name: /Para Juan Pérez/ })
    expect(boton.textContent).toContain('Toyota Corolla · #12 · Lote 4455')
    expect(screen.getByTitle('Para Juan Pérez')).toBeTruthy()
  })

  it('automático (el título es el del vehículo): debajo sólo la referencia, sin repetirlo', () => {
    montar({ elegido, titulo: 'Toyota Corolla' })
    const boton = screen.getByRole('button', { name: /Toyota Corolla/ })
    expect(boton.textContent).toContain('#12 · Lote 4455')
    expect(boton.textContent).not.toContain('Toyota Corolla · #12')
  })

  it('sin vehículo, el título solo y «Selecciona un vehículo» debajo, con «Obligatorio» si lo es', () => {
    montar({ titulo: 'Para Juan Pérez', obligatorio: true })
    const boton = screen.getByRole('button', { name: /Para Juan Pérez/ })
    expect(boton.textContent).toContain('Selecciona un vehículo')
    expect(screen.getByText('Obligatorio')).toBeTruthy()
  })

  it('sin ver los vehículos pero con algo arriba del panel: la barra abre igual, con el título y por qué no hay vehículos', () => {
    montar(
      { puedeVer: false, titulo: 'Para Juan Pérez', arribaDelPanel: <p>campo</p> },
      '?origen=o&panel=vehiculo',
    )
    const boton = screen.getByRole('button', { name: /Para Juan Pérez/ })
    expect(boton.textContent).toContain('No puedes ver los vehículos de este origen.')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ soloElegido: true }))
  })

  it('«solo_mostrar»: no es un botón y no hay panel; «ver_elegido»: el panel sólo con lo de arriba y el elegido', () => {
    montar({ elegido, titulo: 'Para Juan Pérez', modo: 'solo_mostrar' }, '?origen=o&panel=vehiculo')
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Para Juan Pérez')).toBeTruthy()
    expect(panelMontado).not.toHaveBeenCalled()
    cleanup()
    montar({ elegido, titulo: 'Para Juan Pérez', modo: 'ver_elegido' }, '?origen=o&panel=vehiculo')
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ soloElegido: true }))
  })

  it('una guardada sin vehículo dice «Sin vehículo»; con uno que no se ve, nada debajo del título', () => {
    montar({ titulo: 'Para Juan Pérez', modo: 'solo_mostrar', textoSinVehiculo: 'Sin vehículo' })
    expect(screen.getByText('Sin vehículo')).toBeTruthy()
    cleanup()
    montar({ titulo: 'Para Juan Pérez', modo: 'solo_mostrar', textoSinVehiculo: null })
    expect(screen.queryByText('Sin vehículo')).toBeNull()
    expect(screen.queryByText('Selecciona un vehículo')).toBeNull()
  })
})

describe('BarraDelVehiculo › cambiar el vehículo de una guardada (T315)', () => {
  const elegido = { id: ID, numero: 12, titulo: 'Toyota Corolla', lote: '4455', portadaRuta: null }

  it('«cambiar»: el panel de elegir (con buscador y listas) sin «Quitar»; «elegir» sí lo ofrece', () => {
    montar({ elegido, modo: 'cambiar' }, '?origen=o&panel=vehiculo')
    expect(panelMontado).toHaveBeenLastCalledWith(
      expect.objectContaining({ soloElegido: false, sinQuitar: true }),
    )
    cleanup()
    montar({ elegido }, '?origen=o&panel=vehiculo')
    expect(panelMontado).toHaveBeenLastCalledWith(
      expect.objectContaining({ soloElegido: false, sinQuitar: false }),
    )
  })

  it('«ver_elegido» lleva al panel el motivo para no cambiarlo', () => {
    montar(
      {
        elegido,
        modo: 'ver_elegido',
        motivoSinCambiar: 'Una cotización final no cambia de vehículo.',
      },
      '?origen=o&panel=vehiculo',
    )
    expect(panelMontado).toHaveBeenLastCalledWith(
      expect.objectContaining({
        soloElegido: true,
        motivo: 'Una cotización final no cambia de vehículo.',
      }),
    )
  })

  it('el aviso del elegido va bajo la barra con «Elegir otro vehículo», que abre el panel', () => {
    montar({ elegido, modo: 'cambiar', avisoDelElegido: 'No se puede usar ese vehículo.' })
    expect(screen.getByRole('alert').textContent).toBe('No se puede usar ese vehículo.')
    expect(panelMontado).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Elegir otro vehículo' }))
    expect(panelMontado).toHaveBeenLastCalledWith(expect.objectContaining({ abierto: true }))
  })

  it('sin aviso, ni el texto ni el botón', () => {
    montar({ elegido, modo: 'cambiar' })
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Elegir otro vehículo' })).toBeNull()
  })
})
