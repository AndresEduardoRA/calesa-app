import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { Moneda } from '../../../entities/tipos-cambio'
import { FormularioEmpresa } from './formulario-empresa'

// La barra de cambios sin guardar del formulario de la empresa: cuándo aparece, qué repone «Descartar» y que no se va a mitad del guardado.
const ejecutar = vi.fn<(entrada: unknown) => Promise<unknown>>()
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: ejecutar, result: {}, isPending: false }),
}))
vi.mock('../../../composicion.client', () => ({
  prepararLogo: vi.fn(),
  subirLogo: vi.fn(),
  descartarLogo: vi.fn(),
}))
// La barra pregunta al salir con el router de Next.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../actions/guardar-ajustes', () => ({ guardarAjustes: {} }))
vi.mock('@/shared/ui/toasts', () => ({
  avisar: vi.fn(),
  avisarError: vi.fn(),
  avisarExito: vi.fn(),
}))

const AJUSTES: AjustesEmpresa = {
  nombre: 'Importadora Andina',
  razonSocial: null,
  nit: null,
  direccion: null,
  ciudad: null,
  pais: 'Bolivia',
  telefono: null,
  telefonoCc: null,
  whatsapp: null,
  email: null,
  logoRuta: null,
  logoOscuroRuta: null,
  colorAcento: '#3b5bdb',
  iconos: null,
  locale: 'es-BO',
  zonaHoraria: 'America/La_Paz',
  monedaBase: 'USD',
  registroAbierto: false,
  papeleraDias: 30,
  actividadDias: 14,
  limpiezaAutomatica: true,
  limpiezaDiasGracia: 7,
  actualizadoEn: '2026-10-12T14:00:00+00:00',
}

const MONEDAS: readonly Moneda[] = [
  { codigo: 'USD', nombre: 'Dólar', simbolo: '$', decimales: 2, activa: true, actualizadoEn: 'v' },
]

function dibujar(puedeEditar = true) {
  render(
    <FormularioEmpresa
      ajustes={AJUSTES}
      logoUrl={null}
      logoOscuroUrl={null}
      monedas={MONEDAS}
      zonas={['America/La_Paz']}
      conDatosCargados={false}
      puedeEditar={puedeEditar}
    />,
  )
}

const barra = () => screen.queryByRole('region', { name: 'Cambios sin guardar' })
const nombre = () => screen.getByLabelText<HTMLInputElement>('Nombre de la empresa')

beforeEach(() => {
  window.sessionStorage.clear()
  ejecutar.mockReset()
})
afterEach(cleanup)

describe('la barra de cambios sin guardar de Datos de la empresa', () => {
  it('no está al cargar y aparece al tipear un texto', async () => {
    dibujar()
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
    fireEvent.input(nombre(), { target: { value: 'Otra' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
  })

  it('aparece al cambiar el color y al tocar un interruptor', async () => {
    dibujar()
    fireEvent.change(screen.getByLabelText('Color de la marca'), { target: { value: '#000000' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    cleanup()
    dibujar()
    fireEvent.click(screen.getByRole('switch', { name: /Registro abierto/ }))
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
  })

  it('«Descartar» repone lo guardado y la quita', async () => {
    dibujar()
    fireEvent.input(nombre(), { target: { value: 'Otra' } })
    fireEvent.change(screen.getByLabelText('Color de la marca'), { target: { value: '#000000' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => {
      expect(barra()).toBeNull()
    })
    expect(nombre().value).toBe('Importadora Andina')
    expect(screen.getByLabelText<HTMLInputElement>('Color de la marca').value).toBe('#3b5bdb')
    expect(window.sessionStorage.getItem('borrador:ajustes-empresa')).toBeNull()
  })

  it('sin permiso de editar no aparece', async () => {
    dibujar(false)
    await act(async () => {
      await new Promise((resolver) => requestAnimationFrame(resolver))
    })
    expect(barra()).toBeNull()
  })

  it('mientras guarda no se va, y si el guardado falla sigue', async () => {
    let responder: (valor: unknown) => void = () => {}
    ejecutar.mockReturnValueOnce(
      new Promise((resolver) => {
        responder = resolver
      }),
    )
    dibujar()
    fireEvent.input(nombre(), { target: { value: 'Otra' } })
    await waitFor(() => {
      expect(barra()).not.toBeNull()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    })
    await act(async () => {
      await new Promise((resolver) => requestAnimationFrame(resolver))
    })
    expect(barra()).not.toBeNull()
    // Sin respuesta: un fallo de red.
    await act(async () => {
      responder(undefined)
      await Promise.resolve()
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
    })
    await act(async () => {
      await new Promise((resolver) => requestAnimationFrame(resolver))
    })
    expect(barra()).not.toBeNull()
    expect(nombre().value).toBe('Otra')
  })
})
