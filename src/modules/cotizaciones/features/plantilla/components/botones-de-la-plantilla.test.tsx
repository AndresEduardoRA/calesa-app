import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotonesDeLaPlantilla } from './botones-de-la-plantilla'

const HORA = '2026-11-07T15:00:00.123456+00:00'

afterEach(cleanup)

type Props = Parameters<typeof BotonesDeLaPlantilla>[0]

function montar(cambios: Partial<Props> = {}, guardar: Partial<Props['guardar']> = {}) {
  const alPublicar = vi.fn()
  const alDescartar = vi.fn()
  const alGuardar = vi.fn()
  render(
    <BotonesDeLaPlantilla
      esperada={HORA}
      hayCambios={false}
      ocupado={false}
      guardar={{ puede: true, motivo: null, enCurso: false, alGuardar, ...guardar }}
      alPublicar={alPublicar}
      alDescartar={alDescartar}
      {...cambios}
    />,
  )
  return { alPublicar, alDescartar, alGuardar }
}

const publicar = () => screen.getByRole('button', { name: 'Publicar…' }) as HTMLButtonElement
const guardar = () => screen.getByRole('button', { name: 'Guardar borrador' }) as HTMLButtonElement
const mas = () =>
  screen.queryByRole('button', { name: 'Más acciones de la tarjeta' }) as HTMLButtonElement | null

async function abrirElMenu() {
  const boton = mas()
  if (boton === null) throw new Error('No hay «⋯».')
  act(() => {
    fireEvent.pointerDown(boton)
    fireEvent.mouseDown(boton)
    fireEvent.click(boton)
  })
  await waitFor(() => {
    expect(screen.getAllByRole('menuitem').length).toBeGreaterThan(0)
  })
}

describe('BotonesDeLaPlantilla', () => {
  it('«Guardar borrador» es el principal y llama a su callback', () => {
    const { alGuardar } = montar({ hayCambios: true })
    expect(guardar().disabled).toBe(false)
    fireEvent.click(guardar())
    expect(alGuardar).toHaveBeenCalledTimes(1)
  })

  it('«Guardar borrador» se apaga con su motivo a la vista (la forma o los 24 KiB)', () => {
    montar({}, { puede: false, motivo: 'La tarjeta pasa de 24 KiB: quita filas o textos.' })
    expect(guardar().disabled).toBe(true)
    const motivo = screen.getByText('La tarjeta pasa de 24 KiB: quita filas o textos.')
    expect(guardar().getAttribute('aria-describedby')).toBe(motivo.id)
  })

  it('con borrador y sin cambios, «Publicar…» y «Descartar borrador…» (en el «⋯») llaman a su callback', async () => {
    const { alPublicar, alDescartar } = montar()
    expect(publicar().disabled).toBe(false)
    fireEvent.click(publicar())
    expect(alPublicar).toHaveBeenCalledTimes(1)
    await abrirElMenu()
    act(() => {
      fireEvent.click(screen.getByRole('menuitem', { name: 'Descartar borrador…' }))
    })
    expect(alDescartar).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/^Guarda (un|los)/)).toBeNull()
  })

  it('sin borrador «Publicar…» está apagado con su motivo a la vista y no hay «⋯»', () => {
    montar({ esperada: null, hayCambios: true })
    expect(publicar().disabled).toBe(true)
    const motivo = screen.getByText('Guarda un borrador para poder publicarlo.')
    expect(publicar().getAttribute('aria-describedby')).toBe(motivo.id)
    expect(mas()).toBeNull()
  })

  it('con cambios sin guardar «Publicar…» se apaga con su motivo, pero el «⋯» sigue', () => {
    montar({ hayCambios: true })
    expect(publicar().disabled).toBe(true)
    expect(screen.getByText('Guarda los cambios para poder publicarlos.')).toBeTruthy()
    expect(mas()?.disabled).toBe(false)
  })

  it('ocupado (guardando, recargando o con un conflicto) apaga los tres', () => {
    montar({ ocupado: true, hayCambios: true })
    expect(guardar().disabled).toBe(true)
    expect(publicar().disabled).toBe(true)
    expect(mas()?.disabled).toBe(true)
  })
})
