import { describe, expect, it } from 'vitest'
import { ordenarConPorPagina, resumenDe } from './grupos'
import type { GrupoDeVistaYOpciones } from './tipos'

const grupo = (clave: string, resumen?: string): GrupoDeVistaYOpciones => ({
  clave,
  titulo: clave,
  contenido: null,
  ...(resumen === undefined ? {} : { resumen }),
})

const POR_PAGINA = grupo('por-pagina', '25 por página')
const claves = (grupos: readonly GrupoDeVistaYOpciones[]) => grupos.map((cada) => cada.clave)

describe('ordenarConPorPagina', () => {
  it('va después del último grupo con resumen y antes de los que no lo tienen', () => {
    const opciones = [
      grupo('vista', 'Lista'),
      grupo('alcance', 'Míos'),
      grupo('vistas'),
      grupo('mas'),
    ]
    expect(claves(ordenarConPorPagina(opciones, POR_PAGINA))).toEqual([
      'vista',
      'alcance',
      'por-pagina',
      'vistas',
      'mas',
    ])
  })

  it('sin grupos con resumen va primero', () => {
    expect(claves(ordenarConPorPagina([grupo('vistas'), grupo('mas')], POR_PAGINA))).toEqual([
      'por-pagina',
      'vistas',
      'mas',
    ])
  })

  it('sin «Ítems por página» deja los grupos como estaban', () => {
    const opciones = [grupo('vista', 'Lista'), grupo('mas')]
    expect(ordenarConPorPagina(opciones, null)).toBe(opciones)
  })

  it('sin opciones queda sólo «Ítems por página»', () => {
    expect(claves(ordenarConPorPagina([], POR_PAGINA))).toEqual(['por-pagina'])
    expect(ordenarConPorPagina([], null)).toEqual([])
  })
})

describe('resumenDe', () => {
  it('nombra lo activo en orden y salta los grupos sin resumen', () => {
    expect(
      resumenDe([grupo('vista', 'Lista'), grupo('vistas'), grupo('alcance', 'Todos'), POR_PAGINA]),
    ).toEqual(['Lista', 'Todos', '25 por página'])
  })

  it('sin grupos no dice nada', () => {
    expect(resumenDe([])).toEqual([])
  })
})
