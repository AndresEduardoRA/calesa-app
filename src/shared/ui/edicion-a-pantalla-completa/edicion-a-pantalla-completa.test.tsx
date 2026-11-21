import type { Route } from 'next'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccionesDeLaEdicion } from './acciones-de-la-edicion'
import { EdicionAPantallaCompleta } from './edicion-a-pantalla-completa'
import { useEdicionAPantallaCompleta } from './use-edicion-a-pantalla-completa'
import { useEnLaEdicion } from './contexto'
import type { EstadoDeLaEdicion } from '@/shared/lib/edicion'

const SALIDA = '/configuracion/origenes/o1/formulas/f1/planilla' as Route
const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))

afterEach(() => {
  cleanup()
  push.mockClear()
})

function Editor({
  estado,
  hayCambios,
  alDescartar = () => undefined,
}: {
  estado: EstadoDeLaEdicion
  hayCambios: boolean
  alDescartar?: () => void
}) {
  useEdicionAPantallaCompleta({ estado, hayCambios, alDescartar })
  const enLaEdicion = useEnLaEdicion()
  return (
    <div>
      <p>{enLaEdicion ? 'en el modo' : 'fuera del modo'}</p>
      <AccionesDeLaEdicion orden={2}>
        <button type="button">Publicar…</button>
      </AccionesDeLaEdicion>
      <AccionesDeLaEdicion orden={1}>
        <button type="button">Guardar el borrador</button>
      </AccionesDeLaEdicion>
    </div>
  )
}

function montar(props: Parameters<typeof Editor>[0]) {
  return render(
    <EdicionAPantallaCompleta salirA={SALIDA} titulo="Planilla">
      <Editor {...props} />
    </EdicionAPantallaCompleta>,
  )
}

describe('<EdicionAPantallaCompleta>', () => {
  it('dibuja la barra: Salir, el título como h1 con el foco y el estado', () => {
    montar({ estado: { tipo: 'publicada', version: 3 }, hayCambios: false })
    expect(screen.getByRole('link', { name: 'Salir' }).getAttribute('href')).toBe(
      '/configuracion/origenes/o1/formulas/f1/planilla',
    )
    const titulo = screen.getByRole('heading', { level: 1, name: 'Planilla' })
    expect(document.activeElement).toBe(titulo)
    expect(screen.getByText('Publicada v3')).toBeTruthy()
  })

  it('lleva las acciones a la barra, en su orden', () => {
    const { container } = montar({ estado: null, hayCambios: false })
    const barra = container.querySelector('[data-acciones-de-la-edicion]')
    expect(barra).not.toBeNull()
    const botones = Array.from(barra?.querySelectorAll('button') ?? []).map((b) => b.textContent)
    expect(botones).toEqual(['Publicar…', 'Guardar el borrador'])
    const ordenes = Array.from(barra?.children ?? []).map(
      (hijo) => (hijo as HTMLElement).style.order,
    )
    expect(ordenes).toEqual(['2', '1'])
    expect(screen.getByText('en el modo')).toBeTruthy()
  })

  it('Esc no sale del modo', () => {
    montar({ estado: null, hayCambios: true })
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(screen.queryByText('Tienes cambios sin guardar.')).toBeNull()
    expect(push).not.toHaveBeenCalled()
  })

  it('el estado de los cambios manda y «Salir» con cambios pregunta antes de irse', () => {
    const alDescartar = vi.fn()
    montar({ estado: { tipo: 'cambios' }, hayCambios: true, alDescartar })
    expect(screen.getByText('Cambios sin guardar')).toBeTruthy()
    fireEvent.click(screen.getByRole('link', { name: 'Salir' }))
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeTruthy()
    expect(push).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.queryByText('Tienes cambios sin guardar.')).toBeNull()
    expect(alDescartar).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('link', { name: 'Salir' }))
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    })
    expect(alDescartar).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith('/configuracion/origenes/o1/formulas/f1/planilla')
  })

  it('recargar con cambios no pregunta: lo editado vive en la pestaña', () => {
    montar({ estado: { tipo: 'cambios' }, hayCambios: true })
    const evento = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(evento)
    expect(evento.defaultPrevented).toBe(false)
  })

  it('sin cambios, «Salir» no pregunta', () => {
    montar({ estado: { tipo: 'borrador' }, hayCambios: false })
    // jsdom no navega: se anota si alguien frenó el clic antes de que llegue al enlace y se evita el intento de navegar.
    let frenado = true
    const alLlegar = (evento: Event) => {
      frenado = evento.defaultPrevented
      evento.preventDefault()
    }
    document.addEventListener('click', alLlegar)
    fireEvent.click(screen.getByRole('link', { name: 'Salir' }))
    document.removeEventListener('click', alLlegar)
    expect(frenado).toBe(false)
    expect(screen.queryByText('Tienes cambios sin guardar.')).toBeNull()
  })

  it('fuera del modo las acciones se dibujan donde están y el hook no hace nada', () => {
    render(<Editor estado={{ tipo: 'cambios' }} hayCambios />)
    expect(screen.getByText('fuera del modo')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Publicar…' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Guardar el borrador' })).toBeTruthy()
  })
})
