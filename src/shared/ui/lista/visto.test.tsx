import { cleanup, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CLASES_DE_VISTO,
  CLASES_DE_VISTO_DE_FILA,
  FilaDeLista,
  pesoDelNombre,
  ProveedorDeVistosDeLista,
  SufijoDeVisto,
  TarjetaDeLista,
  type MarcaDeVistoDeLista,
} from '.'
import { ID_DEL_ICONO_OJO, SimbolosDeLista } from './simbolos-de-lista'

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

  it('el peso del nombre: negrita si es nuevo, normal si se vio, el de siempre sin marca', () => {
    expect(pesoDelNombre('nuevo')).toBe('font-bold')
    expect(pesoDelNombre('visto')).toBe('font-normal')
    expect(pesoDelNombre('ultimo')).toBe('font-normal')
    expect(pesoDelNombre(null)).toBeUndefined()
    expect(CLASES_DE_VISTO).toContain('data-[visto=nuevo]:[&_[data-abre-resumen]]:font-bold')
    expect(CLASES_DE_VISTO).toContain('data-[visto=visto]:[&_[data-abre-resumen]]:font-normal')
    expect(CLASES_DE_VISTO).toContain('data-[visto=ultimo]:[&_[data-abre-resumen]]:font-normal')
    // Un <tr> no dibuja un box-shadow propio: la fila lo lleva en su primera celda.
    expect(CLASES_DE_VISTO_DE_FILA).toContain('[&>:first-child]:shadow-')
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

describe('la marca del último visto', () => {
  it('el último lleva un ojo, su tooltip y «último visto» sólo para el lector; lo visto, «, visto»', () => {
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
    const a = screen.getByTestId('a')
    // Ningún texto a la vista: el único texto es el del lector.
    expect(a.querySelector('[title="Último visto"]')).not.toBeNull()
    expect(a.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(a.querySelector('use')?.getAttribute('href')).toBe(`#${ID_DEL_ICONO_OJO}`)
    expect(a.querySelector('.sr-only')?.textContent).toBe(', último visto')
    expect(a.textContent).toBe(', último visto')
    expect(screen.queryByText('Último visto')).toBeNull()
    expect(screen.getByTestId('b').textContent).toBe(', visto')
    expect(screen.getByTestId('b').querySelector('.sr-only')).not.toBeNull()
    expect(screen.getByTestId('b').querySelector('svg')).toBeNull()
    expect(screen.getByTestId('c').textContent).toBe('')
  })

  it('el ojo está en el sprite que monta el layout', () => {
    render(<SimbolosDeLista />)
    const simbolo = document.getElementById(ID_DEL_ICONO_OJO)
    expect(simbolo?.tagName.toLowerCase()).toBe('g')
    expect(simbolo?.querySelectorAll('path, circle')).toHaveLength(2)
  })
})
