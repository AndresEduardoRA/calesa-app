import { describe, expect, it } from 'vitest'
import { esquemaDiseno, type Diseno } from '../diseno'
import { esquemaDefinicion } from '../formula'
import { validarDiseno } from '../validar-diseno'
import { ponerPorDefecto, ponerVerTotalBs, quitarModo, sumarModo } from './edicion-de-la-cabecera'

const contexto = { niveles: ['costos'], retirados: [], tonos: [] }

// Congela hasta el fondo: una función que mutara lo que recibe cae con un TypeError.
function congelar<T>(valor: T): T {
  if (typeof valor === 'object' && valor !== null) {
    Object.values(valor).forEach(congelar)
    Object.freeze(valor)
  }
  return valor
}

const definicion = esquemaDefinicion.parse({
  buckets: { exterior: 'tc_a' },
  total_en: 'tc_a',
  nodos: [
    { id: 'tc_a', tipo: 'tipo_cambio', clave: 'a', etiqueta: 'TC A' },
    { id: 'a', tipo: 'input', etiqueta: 'A' },
    { id: 'neto', tipo: 'calculo', op: 'suma', de: ['a'], etiqueta: 'Neto', salida: 'total' },
  ],
})

// Un diseño con tres modos (uno, dos y tres) y «Ver total» ofrecido.
const conTresModos = (): Diseno => {
  let d = esquemaDiseno.parse({
    cabecera: { modos: [], ver_total_bs: true },
    secciones: [
      {
        id: 's',
        presentacion: 'principal',
        items: [
          { tipo: 'celda', nodo: 'a', ancho: 'completo' },
          { tipo: 'celda', nodo: 'tc_a', ancho: 'completo' },
          { tipo: 'celda', nodo: 'neto', ancho: 'completo' },
        ],
      },
    ],
    tarjeta_total: { nodo: 'neto', secundarios: [] },
  })
  for (const nombre of ['Uno', 'Dos', 'Tres']) d = sumarModo(definicion, d, nombre)
  return congelar(d)
}
const valida = (d: Diseno) => validarDiseno(definicion, d, contexto).ok

describe('lo que la cabecera trae por defecto', () => {
  it('ponerPorDefecto escribe las tres claves y el diseño valida', () => {
    const d = ponerPorDefecto(conTresModos(), {
      modo: 'dos',
      verTotalBs: true,
      visibles: ['dos', 'tres'],
    })
    expect(d.cabecera).toMatchObject({
      modo_por_defecto: 'dos',
      ver_total_bs_por_defecto: true,
      modos_visibles: ['dos', 'tres'],
    })
    expect(valida(d)).toBe(true)
  })

  it('apagar «Ver total» quita «Ver total» por defecto; encenderlo no lo pone', () => {
    const con = ponerPorDefecto(conTresModos(), {
      modo: 'uno',
      verTotalBs: true,
      visibles: ['uno'],
    })
    const apagado = ponerVerTotalBs(con, false)
    expect(apagado.cabecera.ver_total_bs).toBe(false)
    expect('ver_total_bs_por_defecto' in apagado.cabecera).toBe(false)
    expect(valida(apagado)).toBe(true)
    expect('ver_total_bs_por_defecto' in ponerVerTotalBs(apagado, true).cabecera).toBe(false)
  })

  it('sumar un modo con una lista de visibles lo deja visible; sin lista no la crea', () => {
    const con = ponerPorDefecto(conTresModos(), {
      modo: 'uno',
      verTotalBs: false,
      visibles: ['uno'],
    })
    expect(sumarModo(definicion, con, 'Cuatro').cabecera.modos_visibles).toStrictEqual([
      'uno',
      'cuatro',
    ])
    expect('modos_visibles' in sumarModo(definicion, conTresModos(), 'Cuatro').cabecera).toBe(false)
  })

  it('quitar el modo por defecto suelta la clave y el primero que queda se ve', () => {
    const con = ponerPorDefecto(conTresModos(), {
      modo: 'uno',
      verTotalBs: false,
      visibles: ['uno', 'tres'],
    })
    const sin = quitarModo(con, 'uno')
    expect('modo_por_defecto' in sin.cabecera).toBe(false)
    expect(sin.cabecera.modos_visibles).toStrictEqual(['dos', 'tres'])
    expect(valida(sin)).toBe(true)
  })

  it('quitar un modo visible lo saca de la lista; quitar todos limpia las claves de los modos', () => {
    const con = ponerPorDefecto(conTresModos(), {
      modo: 'dos',
      verTotalBs: true,
      visibles: ['dos', 'tres'],
    })
    const sinTres = quitarModo(con, 'tres')
    expect(sinTres.cabecera).toMatchObject({ modo_por_defecto: 'dos', modos_visibles: ['dos'] })
    expect(valida(sinTres)).toBe(true)
    const vacio = quitarModo(quitarModo(quitarModo(con, 'uno'), 'dos'), 'tres')
    expect('modo_por_defecto' in vacio.cabecera).toBe(false)
    expect('modos_visibles' in vacio.cabecera).toBe(false)
    expect(vacio.cabecera.ver_total_bs_por_defecto).toBe(true)
  })
})
