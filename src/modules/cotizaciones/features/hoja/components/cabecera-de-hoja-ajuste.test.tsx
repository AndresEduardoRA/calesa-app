import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hojaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import { CabeceraDeHoja } from './cabecera-de-hoja'
import { ContextoDelAjuste } from './hueco-del-ajuste'
import type { PropsDelAjusteDeLaCabecera } from './huecos'
import { render } from './render-con-url.soporte'

const MODOS = [
  { clave: 'paralelo', nombre: 'Paralelo' },
  { clave: 'unificado', nombre: 'Unificado' },
]
const TITULO = 'Configuración por defecto de Subasta'

// El panel que llenaría el área: dice si está abierto y qué le dio la hoja.
const recibidos: PropsDelAjusteDeLaCabecera[] = []
function PanelDePrueba(props: PropsDelAjusteDeLaCabecera) {
  recibidos.push(props)
  return props.abierto ? <p>Panel abierto</p> : null
}

function montar({ ajustes = true, conHueco = true, busqueda = '' } = {}) {
  const hoja = hojaDePrueba({ modos: MODOS, ajustes })
  const cabecera = (
    <CabeceraDeHoja
      cabecera={hoja.cabecera}
      modoElegido="paralelo"
      alElegirModo={vi.fn()}
      verTotalBs={false}
      alCambiarVerTotalBs={vi.fn()}
      origen={hoja.origen.nombre}
      formula={hoja.formula}
    />
  )
  return render(
    conHueco ? (
      <ContextoDelAjuste value={{ Ajuste: () => null, AjusteDeLaCabecera: PanelDePrueba }}>
        {cabecera}
      </ContextoDelAjuste>
    ) : (
      cabecera
    ),
    busqueda,
  )
}

afterEach(() => {
  cleanup()
  recibidos.length = 0
})

describe('CabeceraDeHoja › el ⚙ de la cabecera', () => {
  it('con `ajustes` y el hueco lleno, dibuja el ⚙ con el nombre del origen; el panel no se monta hasta abrirlo', () => {
    montar()
    const boton = screen.getByRole('button', { name: TITULO })
    expect(boton.getAttribute('title')).toBe(TITULO)
    expect(recibidos).toHaveLength(0)
    fireEvent.click(boton)
    expect(screen.getByText('Panel abierto')).toBeTruthy()
    expect(recibidos.at(-1)?.hoja.modoElegido).toBe('paralelo')
    expect(recibidos.at(-1)?.origen).toBe('Subasta')
  })

  it('`?ajuste=cabecera` lo abre al cargar', () => {
    montar({ busqueda: '?ajuste=cabecera' })
    expect(screen.getByText('Panel abierto')).toBeTruthy()
  })

  it('sin `ajustes` (quien no configura) o sin el hueco, no hay ⚙', () => {
    montar({ ajustes: false })
    expect(screen.queryByRole('button', { name: TITULO })).toBeNull()
    cleanup()
    montar({ conHueco: false })
    expect(screen.queryByRole('button', { name: TITULO })).toBeNull()
  })
})
