import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CLASES_DE_VISTO,
  FilaDeLista,
  pesoDelNombre,
  ProveedorDeVistosDeLista,
  SufijoDeVisto,
  TarjetaDeLista,
  type MarcaDeVistoDeLista,
} from '.'

afterEach(cleanup)

const marcas: Record<string, MarcaDeVistoDeLista> = {
  ultima: 'ultimo',
  vista: 'visto',
  nueva: 'nuevo',
}

function conMarcas(hijos: ReactNode) {
  return (
    <ProveedorDeVistosDeLista marca={(id) => marcas[id] ?? null}>{hijos}</ProveedorDeVistosDeLista>
  )
}

describe('lo visto en una lista', () => {
  it('la fila y la tarjeta llevan data-visto según su marca', () => {
    render(
      conMarcas(
        <>
          <table>
            <tbody>
              <FilaDeLista idDeVisto="ultima" data-testid="fila-ultima" />
              <FilaDeLista idDeVisto="vista" data-testid="fila-vista" />
              <FilaDeLista idDeVisto="nueva" data-testid="fila-nueva" />
              <FilaDeLista idDeVisto="sin-marca" data-testid="fila-sin-marca" />
            </tbody>
          </table>
          <ul>
            <TarjetaDeLista idDeVisto="ultima">uno</TarjetaDeLista>
            <TarjetaDeLista idDeVisto="vista">dos</TarjetaDeLista>
          </ul>
        </>,
      ),
    )
    expect(screen.getByTestId('fila-ultima').getAttribute('data-visto')).toBe('ultimo')
    expect(screen.getByTestId('fila-vista').getAttribute('data-visto')).toBe('visto')
    expect(screen.getByTestId('fila-nueva').getAttribute('data-visto')).toBe('nuevo')
    expect(screen.getByTestId('fila-sin-marca').hasAttribute('data-visto')).toBe(false)
    expect(screen.getByText('uno').closest('article')?.getAttribute('data-visto')).toBe('ultimo')
    expect(screen.getByText('dos').closest('article')?.getAttribute('data-visto')).toBe('visto')
  })

  it('el sufijo dice «Último visto» a la vista y «, visto» sólo para el lector', () => {
    render(
      conMarcas(
        <>
          <p data-testid="a">
            <SufijoDeVisto id="ultima" />
          </p>
          <p data-testid="b">
            <SufijoDeVisto id="vista" />
          </p>
          <p data-testid="c">
            <SufijoDeVisto id="nueva" />
          </p>
        </>,
      ),
    )
    expect(screen.getByTestId('a').textContent).toBe('Último visto')
    expect(screen.getByTestId('a').querySelector('.sr-only')).toBeNull()
    expect(screen.getByTestId('b').textContent).toBe(', visto')
    expect(screen.getByTestId('b').querySelector('.sr-only')).not.toBeNull()
    expect(screen.getByTestId('c').textContent).toBe('')
  })

  it('el peso del nombre: negrita si es nuevo, normal si se vio, el de siempre sin marca', () => {
    expect(pesoDelNombre('nuevo')).toBe('font-bold')
    expect(pesoDelNombre('visto')).toBe('font-normal')
    expect(pesoDelNombre('ultimo')).toBe('font-normal')
    expect(pesoDelNombre(null)).toBeUndefined()
    expect(CLASES_DE_VISTO).toContain('data-[visto=nuevo]:[&_[data-abre-resumen]]:font-bold')
    expect(CLASES_DE_VISTO).toContain('data-[visto=visto]:[&_[data-abre-resumen]]:font-normal')
    expect(CLASES_DE_VISTO).toContain('data-[visto=ultimo]:[&_[data-abre-resumen]]:font-normal')
  })

  it('sin proveedor no marca nada', () => {
    render(
      <>
        <ul>
          <TarjetaDeLista idDeVisto="ultima">uno</TarjetaDeLista>
        </ul>
        <p data-testid="s">
          <SufijoDeVisto id="ultima" />
        </p>
      </>,
    )
    expect(screen.getByText('uno').closest('article')?.hasAttribute('data-visto')).toBe(false)
    expect(screen.getByTestId('s').textContent).toBe('')
  })
})
