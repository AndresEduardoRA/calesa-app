import { describe, expect, it } from 'vitest'
import { celda, celdaPorId, grilla, ocupante, texto } from './edicion.soporte'
import {
  estadoInicial,
  reductorDelEditor,
  type AccionDelEditor,
  type EstadoDelEditor,
} from './reductor'
import type { Seleccion } from './seleccion'

const hacer = (e: EstadoDelEditor, ...acciones: AccionDelEditor[]) =>
  acciones.reduce(reductorDelEditor, e)
const celdas = (f0: number, k0: number, f1 = f0, k1 = k0): AccionDelEditor => ({
  tipo: 'seleccionar',
  seleccion: {
    tipo: 'celdas',
    ancla: { f: f0, k: k0 },
    foco: { f: f1, k: k1 },
  } satisfies Seleccion,
})
const VISIBLES = [0, 1, 2]
const inicial = () =>
  estadoInicial(grilla(3, 3, [celda('a', 0, 0, texto('Hola')), celda('b', 0, 1, texto('Chau'))]))

describe('reductorDelEditor', () => {
  it('elegir no es un paso del historial, y se anuncia', () => {
    const e = hacer(inicial(), celdas(0, 0), {
      tipo: 'mover',
      direccion: 'derecha',
      extender: true,
      visibles: VISIBLES,
    })
    expect(e.historial.atras).toHaveLength(0)
    expect(e.seleccion).toEqual({ tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 1 } })
    expect(e.anuncio.texto).toBe('Fila 1 › Columnas «A» a «B»: 2 casillas.')
  })

  it('combinar es un paso que se anuncia; deshacer y rehacer lo dicen y vuelven a lo de antes', () => {
    const elegido = hacer(inicial(), celdas(0, 0, 0, 2))
    const combinado = hacer(elegido, { tipo: 'combinar' })
    expect(combinado.anuncio.texto).toMatch(/^Se combinaron 3 celdas\./)
    expect(celdaPorId(combinado.plantilla, 'a')?.abarca_columnas).toBe(3)
    expect(combinado.historial.atras.map((x) => x.nombre)).toEqual(['combinar'])
    const deshecho = hacer(combinado, { tipo: 'deshacer' })
    expect(deshecho.anuncio.texto).toBe('Deshiciste: combinar.')
    expect(deshecho.plantilla).toEqual(elegido.plantilla)
    expect(deshecho.seleccion).toEqual(elegido.seleccion)
    const rehecho = hacer(deshecho, { tipo: 'rehacer' })
    expect(rehecho.anuncio.texto).toBe('Rehiciste: combinar.')
    expect(rehecho.plantilla).toEqual(combinado.plantilla)
  })

  it('lo que no se puede deja el estado igual con su motivo en `rechazo`', () => {
    const e = hacer(inicial(), { tipo: 'combinar' })
    expect(e.rechazo).toBe('Elige una celda primero.')
    expect(e.plantilla).toEqual(inicial().plantilla)
    expect(e.historial.atras).toHaveLength(0)
    expect(hacer(inicial(), { tipo: 'deshacer' }).rechazo).toBe('No hay nada que deshacer.')
  })
})

describe('reductorDelEditor: escribir', () => {
  it('escribir en el lugar: una letra reemplaza, Enter confirma y es un paso', () => {
    const escribiendo = hacer(inicial(), celdas(0, 0), {
      tipo: 'empezarAEscribir',
      texto: 'x',
      visibles: VISIBLES,
    })
    expect(escribiendo.escribiendo).toEqual({ pos: { f: 0, k: 0 }, texto: 'x' })
    const confirmado = hacer(
      escribiendo,
      { tipo: 'escribir', texto: 'xy' },
      { tipo: 'confirmarEscritura' },
    )
    expect(confirmado.escribiendo).toBeNull()
    expect(celdaPorId(confirmado.plantilla, 'a')?.contenido).toEqual(texto('xy'))
    expect(confirmado.historial.atras.map((x) => x.nombre)).toEqual(['escribir'])
  })

  it('Enter o F2 siguen con el texto que había; Esc descarta sin paso', () => {
    const e = hacer(inicial(), celdas(0, 1), { tipo: 'empezarAEscribir', visibles: VISIBLES })
    expect(e.escribiendo?.texto).toBe('Chau')
    const descartado = hacer(e, { tipo: 'escribir', texto: 'otra' }, { tipo: 'descartarEscritura' })
    expect(celdaPorId(descartado.plantilla, 'b')?.contenido).toEqual(texto('Chau'))
    expect(descartado.historial.atras).toHaveLength(0)
  })

  it('un texto que no se puede guardar queda en la celda en edición con su motivo', () => {
    const e = hacer(
      inicial(),
      celdas(0, 0),
      { tipo: 'empezarAEscribir', texto: 'a{{b', visibles: VISIBLES },
      { tipo: 'confirmarEscritura' },
    )
    expect(e.escribiendo).toEqual({ pos: { f: 0, k: 0 }, texto: 'a{{b' })
    expect(e.rechazo).toBe('Un texto no lleva «{{».')
    expect(celdaPorId(e.plantilla, 'a')?.contenido).toEqual(texto('Hola'))
  })

  it('el texto del panel con la misma clave se junta en un paso, hasta que cambia la selección', () => {
    const e = hacer(
      inicial(),
      celdas(0, 0),
      { tipo: 'contenido', contenido: texto('H'), clave: 'texto:a' },
      { tipo: 'contenido', contenido: texto('Ho'), clave: 'texto:a' },
      { tipo: 'contenido', contenido: texto('Hol'), clave: 'texto:a' },
    )
    expect(e.historial.atras).toHaveLength(1)
    const otra = hacer(e, celdas(0, 0), {
      tipo: 'contenido',
      contenido: texto('Hola!'),
      clave: 'texto:a',
    })
    expect(otra.historial.atras).toHaveLength(2)
    expect(
      celdaPorId(hacer(otra, { tipo: 'deshacer' }, { tipo: 'deshacer' }).plantilla, 'a')?.contenido,
    ).toEqual(texto('Hola'))
  })
})

describe('reductorDelEditor: el portapapeles y lo recuperado', () => {
  it('copiar y pegar llevan texto y formato; pegar sin nada copiado se rechaza', () => {
    expect(hacer(inicial(), celdas(1, 1), { tipo: 'pegar' }).rechazo).toBe('No hay nada copiado.')
    const conFormato = hacer(inicial(), celdas(0, 0), { tipo: 'estilo', cambio: { negrita: true } })
    const copiado = hacer(conFormato, { tipo: 'copiar' })
    expect(copiado.bloque?.celdas).toHaveLength(1)
    expect(copiado.anuncio.texto).toBe('Se copió una celda.')
    const pegado = hacer(copiado, celdas(2, 2), { tipo: 'pegar' })
    const id = ocupante(pegado.plantilla, 2, 2)
    const nueva = pegado.plantilla.celdas.find((c) => c.id === id)
    expect(nueva?.contenido).toEqual(texto('Hola'))
    expect(nueva?.estilo).toEqual({ negrita: true })
  })

  it('pegar un texto del sistema lo escribe en la celda activa', () => {
    const e = hacer(inicial(), celdas(2, 0), { tipo: 'pegarTexto', texto: 'Del sistema\n' })
    const id = ocupante(e.plantilla, 2, 0)
    expect(e.plantilla.celdas.find((c) => c.id === id)?.contenido).toEqual(texto('Del sistema'))
  })

  it('reponer lo recuperado es un paso: deshacer vuelve a lo guardado', () => {
    const otra = grilla(1, 1, [celda('z', 0, 0, texto('Recuperado'))])
    const e = hacer(inicial(), { tipo: 'reponer', plantilla: otra, nombre: 'recuperar lo escrito' })
    expect(e.plantilla).toEqual(otra)
    expect(e.historial.atras.map((x) => x.nombre)).toEqual(['recuperar lo escrito'])
    expect(hacer(e, { tipo: 'deshacer' }).plantilla).toEqual(inicial().plantilla)
  })

  it('Esc suelta la selección (el panel vuelve al resumen); todo elige la tarjeta entera', () => {
    expect(
      hacer(inicial(), celdas(1, 1), { tipo: 'seleccionar', seleccion: null }).seleccion,
    ).toBeNull()
    expect(hacer(inicial(), { tipo: 'todo' }).seleccion).toEqual({
      tipo: 'celdas',
      ancla: { f: 0, k: 0 },
      foco: { f: 2, k: 2 },
    })
  })
})
