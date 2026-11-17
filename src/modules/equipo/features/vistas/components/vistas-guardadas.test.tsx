import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VistaGuardada } from '../../../entities/vista'
import { VistasGuardadas } from './vistas-guardadas'

const navegar = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => '/vehiculos',
  useRouter: () => ({ push: navegar }),
}))
const guardar = vi.fn(() => Promise.resolve(true))
const eliminar = vi.fn(() => Promise.resolve())
vi.mock('../hooks/use-vistas', () => ({
  useVistas: () => ({ guardar, eliminar, enCurso: false, errorDeNombre: undefined }),
}))

const cerrar = vi.fn()
vi.mock('@/shared/ui/vista-y-opciones', () => ({
  useVistaYOpciones: () => ({ cerrar, cerrarYLuego: vi.fn() }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const VISTAS: VistaGuardada[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    nombre: 'Automáticos',
    params: { origen: 'o', fase: 'a' },
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    nombre: 'Con llave',
    params: { origen: 'o', 'a.llave': 'si' },
  },
]

function dibujar(props: Partial<Parameters<typeof VistasGuardadas>[0]> = {}) {
  render(
    <VistasGuardadas
      pantalla="vehiculos"
      vistas={VISTAS}
      actuales={{ origen: 'o', fase: 'a' }}
      puedeGuardar
      {...props}
    />,
  )
}

describe('VistasGuardadas', () => {
  it('lista las vistas y marca la que se está viendo', () => {
    dibujar()
    expect(screen.getByRole('button', { name: /^Automáticos/ }).getAttribute('aria-current')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: 'Con llave' }).hasAttribute('aria-current')).toBe(
      false,
    )
  })

  it('aplicar una vista es navegar a su URL', () => {
    dibujar()
    fireEvent.click(screen.getByRole('button', { name: 'Con llave' }))
    expect(navegar).toHaveBeenCalledWith('/vehiculos?a.llave=si&origen=o')
    // Antes de navegar se cierra «Vista y opciones».
    expect(cerrar).toHaveBeenCalledTimes(1)
  })

  it('guarda los filtros de ahora con el nombre escrito y cierra el panel', async () => {
    dibujar()
    fireEvent.change(screen.getByLabelText('Guardar los filtros de ahora'), {
      target: { value: 'Mis filtros' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar vista' }))
    expect(guardar).toHaveBeenCalledWith('Mis filtros', { origen: 'o', fase: 'a' })
    await waitFor(() => {
      expect(cerrar).toHaveBeenCalledTimes(1)
    })
  })

  it('sin filtros puestos no hay nada que guardar, y lo dice', () => {
    dibujar({ puedeGuardar: false })
    expect(screen.getByLabelText('Guardar los filtros de ahora').hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByText('Pon algún filtro para poder guardarlo.')).toBeDefined()
  })

  it('eliminar nombra la vista', () => {
    dibujar()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar la vista Con llave' }))
    expect(eliminar).toHaveBeenCalledWith(VISTAS[1])
  })

  it('sin vistas explica para qué sirven', () => {
    dibujar({ vistas: [] })
    expect(screen.getByText(/Todavía no guardaste ninguna/)).toBeDefined()
  })
})
