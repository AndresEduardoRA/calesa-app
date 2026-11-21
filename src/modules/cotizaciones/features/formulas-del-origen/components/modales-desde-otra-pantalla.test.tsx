import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { FormulaDeLaLista } from '../../../entities/formulas-del-origen/lista'
import { ModalDeActivar } from './modal-de-activar'
import { ModalDeNuevaFormula } from './modal-de-nueva-formula'

const empujar = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: empujar, refresh: vi.fn() }) }))
const cerrarYReleer = vi.fn()
vi.mock('../hooks/use-cerrar-y-releer', () => ({ useCerrarYReleer: () => cerrarYReleer }))
vi.mock('../../../areas/formulas-del-origen/composicion.client', () => ({
  leerFormulasParaCopiar: vi.fn(),
}))
const crear = vi.fn()
vi.mock('../actions/crear-formula', () => ({
  crearFormulaDelOrigen: (entrada: unknown) => crear(entrada) as Promise<unknown>,
}))
const activar = vi.fn()
vi.mock('../actions/activar-formula', () => ({
  activarFormulaDelOrigen: (entrada: unknown) => activar(entrada) as Promise<unknown>,
}))
vi.mock('@/shared/ui/toasts', () => ({ avisarExito: vi.fn(), avisarError: vi.fn() }))

const ORIGEN = { id: '00000000-0000-4000-8000-000000000001', nombre: 'Japón' }
const CREADA = '44444444-4444-4444-8444-444444444444'
const HORA = '2026-11-21T15:00:00.123456+00:00'

beforeEach(() => {
  empujar.mockReset()
  cerrarYReleer.mockReset()
  crear.mockReset()
  activar.mockReset()
})
afterEach(cleanup)

describe('ModalDeNuevaFormula desde la puesta en marcha', () => {
  it('abre con el nombre propuesto, sin «Copia de este origen», y al crear llama a alCrear en vez de abrir la planilla', async () => {
    crear.mockResolvedValue({
      data: { ok: true, data: { id: CREADA, actualizadoEn: HORA, avisos: [] } },
    })
    const alCrear = vi.fn()
    render(
      <ProveedorAtajos>
        <ModalDeNuevaFormula
          abierto
          alCerrar={vi.fn()}
          origen={ORIGEN}
          origenesParaCopiar={[]}
          copiaInicial={null}
          comoInicial="blanco"
          nombreInicial="Japón"
          alCrear={alCrear}
          sinCopiaDeEste
        />
      </ProveedorAtajos>,
    )
    expect((screen.getByLabelText(/^Nombre/) as HTMLInputElement).value).toBe('Japón')
    expect(screen.queryByText('Copia de este origen')).toBeNull()
    expect(screen.queryByText('Copia de otro origen')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Crear fórmula' }))
    await waitFor(() => {
      expect(alCrear).toHaveBeenCalledWith(CREADA)
    })
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Japón', copiaDe: null }))
    expect(empujar).not.toHaveBeenCalled()
  })
})

const FORMULA: FormulaDeLaLista = {
  id: CREADA,
  nombre: 'Japón',
  activa: false,
  activadaEn: null,
  archivadaEn: null,
  copiadaDeOtroOrigen: false,
  actualizadoEn: HORA,
  formula: {
    borrador: { id: '55555555-5555-4555-8555-555555555555', actualizadoEn: HORA },
    publicada: null,
  },
  tarjeta: {
    borrador: { id: '66666666-6666-4666-8666-666666666666', actualizadoEn: HORA },
    publicada: null,
  },
}

describe('ModalDeActivar desde la puesta en marcha', () => {
  it('al activar llama a alActivar en vez de cerrar y volver a leer', async () => {
    activar.mockResolvedValue({
      data: { ok: true, data: { activa: CREADA, formula: 'f', plantilla: 'p' } },
    })
    const alActivar = vi.fn()
    render(
      <ProveedorAtajos>
        <ModalDeActivar
          abierto
          alCerrar={vi.fn()}
          origen={ORIGEN}
          formula={FORMULA}
          activa={null}
          alActivar={alActivar}
        />
      </ProveedorAtajos>,
    )
    fireEvent.change(screen.getByLabelText('Nota'), { target: { value: 'Primera versión' } })
    fireEvent.click(screen.getByRole('button', { name: 'Activar «Japón»' }))
    await waitFor(() => {
      expect(alActivar).toHaveBeenCalledTimes(1)
    })
    expect(activar).toHaveBeenCalledWith(expect.objectContaining({ nota: 'Primera versión' }))
    expect(cerrarYReleer).not.toHaveBeenCalled()
  })
})
