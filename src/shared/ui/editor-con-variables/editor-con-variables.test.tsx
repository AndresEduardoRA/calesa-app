import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { EditorConVariables, TextoConVariables } from '.'

afterEach(cleanup)

const VARIABLES = [
  { clave: 'cliente', etiqueta: 'Cliente' },
  { clave: 'codigo', etiqueta: 'Código', obligatoria: true },
] as const

function Prueba({ inicial, motivo = null }: { inicial: string; motivo?: string | null }) {
  const [texto, setTexto] = useState(inicial)
  return (
    <EditorConVariables
      id="texto"
      etiqueta="Texto"
      valor={texto}
      alCambiar={setTexto}
      variables={VARIABLES}
      valores={{ cliente: 'Ana', codigo: 'EJM-4F2K9' }}
      motivo={motivo}
      largoMaximo={100}
    />
  )
}

function caja() {
  return screen.getByLabelText('Texto') as HTMLTextAreaElement
}

function ponerCursor(inicio: number, fin = inicio) {
  const area = caja()
  area.setSelectionRange(inicio, fin)
  fireEvent.select(area)
}

describe('EditorConVariables', () => {
  it('inserta la variable en el cursor y deja el cursor detrás', () => {
    render(<Prueba inicial="Hola, ." />)
    ponerCursor(6)
    fireEvent.click(screen.getByRole('button', { name: 'Insertar Cliente ({cliente})' }))
    expect(caja().value).toBe('Hola, {cliente}.')
    expect(caja().selectionStart).toBe(15)
    expect(document.activeElement).toBe(caja())
  })

  it('reemplaza lo seleccionado', () => {
    render(<Prueba inicial="Hola, XXX." />)
    ponerCursor(6, 9)
    fireEvent.click(screen.getByRole('button', { name: 'Insertar Código ({codigo})' }))
    expect(caja().value).toBe('Hola, {codigo}.')
  })

  it('la vista previa reemplaza las variables por los datos de ejemplo', () => {
    render(<Prueba inicial="Hola, {cliente}. Código: {codigo}" />)
    expect(screen.getByRole('group', { name: 'Vista previa' }).textContent).toBe(
      'Hola, Ana. Código: EJM-4F2K9',
    )
  })

  it('avisa en vivo una variable que el texto no acepta', () => {
    render(<Prueba inicial="Hola {foo}" />)
    expect(screen.getByRole('status').textContent).toBe(
      '{foo} no es una variable de este texto. Usa {cliente} o {codigo}.',
    )
  })

  it('una obligatoria ausente dice «Falta» y deja de decirlo al estar', () => {
    render(<Prueba inicial="" />)
    const boton = screen.getByRole('button', { name: 'Insertar Código ({codigo})' })
    expect(boton.textContent).toContain('Falta')
    fireEvent.click(boton)
    expect(
      screen.getByRole('button', { name: 'Insertar Código ({codigo})' }).textContent,
    ).not.toContain('Falta')
  })

  it('cuenta los caracteres', () => {
    render(<Prueba inicial="abc" />)
    expect(screen.getByText('3 de 100')).toBeTruthy()
  })

  it('el motivo del modal va en lugar del aviso en vivo', () => {
    render(<Prueba inicial="Hola {foo}" motivo="No se puede guardar." />)
    expect(screen.getByRole('status').textContent).toBe('No se puede guardar.')
  })
})

describe('TextoConVariables', () => {
  it('resalta las variables y marca en rojo la desconocida', () => {
    const { container } = render(<TextoConVariables texto="{cliente} {foo}" claves={['cliente']} />)
    expect(container.querySelector('[data-variable="cliente"]')?.textContent).toBe('{cliente}')
    expect(container.querySelector('[data-variable="foo"]')?.className).toContain('peligro')
  })

  it('con valores muestra el valor en lugar de la variable', () => {
    const { container } = render(
      <TextoConVariables
        texto="Hola, {cliente}"
        claves={['cliente']}
        valores={{ cliente: 'Ana' }}
      />,
    )
    expect(container.textContent).toBe('Hola, Ana')
  })
})
