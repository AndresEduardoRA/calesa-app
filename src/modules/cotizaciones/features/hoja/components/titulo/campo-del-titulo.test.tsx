import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  useTituloDeLaCotizacion,
  type TituloDeLaCotizacion,
} from '../../hooks/use-titulo-de-la-cotizacion'
import { AYUDA_DEL_AUTOMATICO, CampoDelTitulo } from './campo-del-titulo'
import { ProveedorDelTitulo } from './proveedor-del-titulo'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const NUEVA = { personaId: 'p', origenId: 'o', vehiculoAlAbrir: null }
// Lo que el proveedor da, leído después de cada dibujo.
const espiado: { actual: TituloDeLaCotizacion | null } = { actual: null }

function Espia() {
  const titulo = useTituloDeLaCotizacion()
  useEffect(() => {
    espiado.actual = titulo
  })
  return <p data-testid="mostrado">{titulo?.mostrado ?? '(sin título)'}</p>
}

function montar(
  vehiculo: string | null,
  mas: Partial<Parameters<typeof ProveedorDelTitulo>[0]> = {},
) {
  return render(
    <ProveedorDelTitulo deLaPestana={NUEVA} vehiculo={vehiculo} {...mas}>
      <CampoDelTitulo />
      <Espia />
    </ProveedorDelTitulo>,
  )
}

const campo = () =>
  screen.getByRole<HTMLInputElement>('textbox', { name: 'Título de la cotización' })

describe('CampoDelTitulo (T307)', () => {
  it('automático: muestra el del vehículo, con la ayuda; escribir lo vuelve manual', () => {
    montar('Toyota Hilux')
    expect(campo().value).toBe('Toyota Hilux')
    expect(screen.getByText(AYUDA_DEL_AUTOMATICO)).toBeTruthy()
    fireEvent.change(campo(), { target: { value: 'Para Ana' } })
    expect(screen.getByTestId('mostrado').textContent).toBe('Para Ana')
    expect(espiado.actual?.estado).toEqual({ texto: 'Para Ana', manual: true })
    expect(screen.queryByText(AYUDA_DEL_AUTOMATICO)).toBeNull()
  })

  it('vaciarlo vuelve a automático: con el foco queda vacío (el del vehículo de ejemplo) y al salir vuelve el del vehículo', () => {
    montar('Toyota Hilux')
    fireEvent.change(campo(), { target: { value: 'Para Ana' } })
    fireEvent.change(campo(), { target: { value: '   ' } })
    expect(campo().value).toBe('')
    expect(campo().placeholder).toBe('Toyota Hilux')
    expect(espiado.actual?.estado.manual).toBe(false)
    expect(screen.getByTestId('mostrado').textContent).toBe('Toyota Hilux')
    fireEvent.blur(campo())
    expect(campo().value).toBe('Toyota Hilux')
  })

  it('el contador aparece cerca del tope y el campo no deja pasar de 120', () => {
    montar(null)
    expect(campo().maxLength).toBe(120)
    fireEvent.change(campo(), { target: { value: 'a'.repeat(99) } })
    expect(screen.queryByText('99/120')).toBeNull()
    fireEvent.change(campo(), { target: { value: 'a'.repeat(100) } })
    expect(screen.getByText('100/120')).toBeTruthy()
  })

  it('toma el foco sólo si «Escribir el título» lo pidió', () => {
    montar(null)
    expect(document.activeElement).not.toBe(campo())
    act(() => {
      espiado.actual?.pedirFoco()
    })
    expect(document.activeElement).toBe(campo())
    expect(espiado.actual?.focoPedido).toBe(false)
  })

  it('el rechazo de la base va debajo del campo; escribir lo quita', () => {
    montar(null)
    act(() => {
      espiado.actual?.ponerRechazo('Escribe el título de la cotización.')
    })
    expect(screen.getByText('Escribe el título de la cotización.')).toBeTruthy()
    expect(campo().getAttribute('aria-invalid')).toBe('true')
    fireEvent.change(campo(), { target: { value: 'Para Ana' } })
    expect(screen.queryByText('Escribe el título de la cotización.')).toBeNull()
  })
})

describe('CampoDelTitulo › una guardada (T307)', () => {
  it('una guardada abre con lo guardado; sin poder guardarla no hay campo', () => {
    const guardada = { personaId: 'p', cotizacionId: 'c', actualizadoEn: 'v1' }
    montar('Toyota Hilux', { deLaPestana: guardada, titulo: 'Para Ana', tituloManual: true })
    expect(campo().value).toBe('Para Ana')
    cleanup()
    montar('Toyota Hilux', {
      deLaPestana: guardada,
      titulo: 'Para Ana',
      tituloManual: true,
      puede: false,
    })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByTestId('mostrado').textContent).toBe('Para Ana')
  })

  it('en una guardada, otra versión vuelve a lo guardado sin remontar (guardar, «Recargar»)', () => {
    const v1 = { personaId: 'p', cotizacionId: 'c', actualizadoEn: 'v1' }
    const { rerender } = montar('Toyota Hilux', {
      deLaPestana: v1,
      titulo: 'Para Ana',
      tituloManual: true,
    })
    fireEvent.change(campo(), { target: { value: 'Para Luis' } })
    rerender(
      <ProveedorDelTitulo
        deLaPestana={{ ...v1, actualizadoEn: 'v2' }}
        vehiculo="Toyota Hilux"
        titulo="Para Bea"
        tituloManual
      >
        <CampoDelTitulo />
        <Espia />
      </ProveedorDelTitulo>,
    )
    expect(campo().value).toBe('Para Bea')
  })
})
