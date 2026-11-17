import { describe, expect, it } from 'vitest'
import { indexarFlujo } from './pasos'
import { FASES, G, fase, flujo, item, pide, salida } from './pasos.soporte'
import { siguienteDelItem, type ContextoDelSiguiente } from './siguiente'

const TODO: ContextoDelSiguiente = {
  pago: false,
  cerrado: false,
  puede: { mover: true, cotizar: true, registrarPago: true },
}
const sin = (clave: keyof ContextoDelSiguiente['puede']): ContextoDelSiguiente => ({
  ...TODO,
  puede: { ...TODO.puede, [clave]: false },
})

describe('el siguiente de un ítem', () => {
  const indice = indexarFlujo(flujo())

  it('mover con la acción de la transición, o «Mover a «X»» sin ella', () => {
    expect(siguienteDelItem(indice, item(1), TODO)).toEqual({
      tipo: 'mover',
      faseId: G(2),
      texto: 'Comprar',
    })
    const sinAccion = indexarFlujo(flujo({ salidas: [salida(1, 2, null), salida(1, 3, '  ')] }))
    expect(siguienteDelItem(sinAccion, item(1), TODO)).toEqual({
      tipo: 'mover',
      faseId: G(2),
      texto: 'Mover a «Comprado»',
    })
  })

  it('una fase final (también «Perdido») o el proyecto cerrado: nada', () => {
    expect(siguienteDelItem(indice, item(4), TODO)).toEqual({ tipo: 'ninguno' })
    expect(siguienteDelItem(indice, item(5), TODO)).toEqual({ tipo: 'ninguno' })
    expect(siguienteDelItem(indice, item(1), { ...TODO, cerrado: true })).toEqual({
      tipo: 'ninguno',
    })
  })

  it('con varias salidas, la que va hacia adelante más cerca; si ninguna va hacia adelante, la primera por orden', () => {
    const varias = indexarFlujo(
      flujo({ salidas: [salida(3, 5, 'Perder'), salida(3, 4, 'Recibir'), salida(3, 1, 'Volver')] }),
    )
    expect(siguienteDelItem(varias, item(3), TODO)).toMatchObject({
      faseId: G(4),
      texto: 'Recibir',
    })
    const atras = indexarFlujo(
      flujo({ salidas: [salida(3, 2, 'Devolver'), salida(3, 1, 'Reiniciar')] }),
    )
    expect(siguienteDelItem(atras, item(3), TODO)).toMatchObject({
      faseId: G(1),
      texto: 'Reiniciar',
    })
  })

  it('una salida a una fase jubilada no cuenta, y sin salidas no hay nada', () => {
    const fases = FASES.map((f) => (f.id === G(2) ? { ...f, activa: false } : f))
    expect(siguienteDelItem(indexarFlujo(flujo({ fases })), item(1), TODO)).toEqual({
      tipo: 'ninguno',
    })
  })

  it('sin fase: la única inicial; con varias, «Elegir fase»; sin inicial, nada', () => {
    expect(siguienteDelItem(indice, item(null), TODO)).toEqual({
      tipo: 'mover',
      faseId: G(1),
      texto: 'Mover a «Por cotizar»',
    })
    const dos = indexarFlujo(flujo({ fases: [...FASES, fase(6, 'Otra', 5, { esInicial: true })] }))
    expect(siguienteDelItem(dos, item(null), TODO)).toEqual({
      tipo: 'mover',
      faseId: null,
      texto: 'Elegir fase',
    })
    expect(siguienteDelItem(dos, item(null), sin('mover'))).toEqual({ tipo: 'ninguno' })
    const ninguna = indexarFlujo(flujo({ fases: FASES.map((f) => ({ ...f, esInicial: false })) }))
    expect(siguienteDelItem(ninguna, item(null), TODO)).toEqual({ tipo: 'ninguno' })
  })
})

describe('el siguiente de un ítem cuando el destino pide un hito', () => {
  const indice = indexarFlujo(flujo())

  it('un precio bloqueante que falta: «Nueva cotización»; con precio o sin `repuestos.cotizar`, mover', () => {
    const conPrecio = indexarFlujo(flujo({ pedidos: [pide(2, 'precio')] }))
    expect(siguienteDelItem(conPrecio, item(1), TODO)).toEqual({
      tipo: 'cotizacion',
      texto: 'Nueva cotización',
    })
    expect(siguienteDelItem(conPrecio, item(1, 10), TODO)).toMatchObject({
      tipo: 'mover',
      texto: 'Comprar',
    })
    expect(siguienteDelItem(conPrecio, item(1), sin('cotizar'))).toEqual({
      tipo: 'informar',
      texto: 'Sigue: «Precio al cliente»',
    })
  })

  it('un hito informativo no cambia el botón', () => {
    const informativo = indexarFlujo(
      flujo({ pedidos: [pide(2, 'precio', false), pide(2, 'pago', false)] }),
    )
    expect(siguienteDelItem(informativo, item(1), TODO)).toMatchObject({
      tipo: 'mover',
      texto: 'Comprar',
    })
  })

  it('un pago bloqueante: «Registrar pago» sólo si se sabe que falta y se puede registrar', () => {
    const conPago = indexarFlujo(flujo({ pedidos: [pide(3, 'pago')] }))
    expect(siguienteDelItem(conPago, item(2), TODO)).toEqual({
      tipo: 'pago',
      texto: 'Registrar pago',
    })
    expect(siguienteDelItem(conPago, item(2), { ...TODO, pago: true })).toMatchObject({
      tipo: 'mover',
    })
    expect(siguienteDelItem(conPago, item(2), { ...TODO, pago: null })).toMatchObject({
      tipo: 'mover',
    })
    expect(siguienteDelItem(conPago, item(2), sin('registrarPago'))).toEqual({
      tipo: 'informar',
      texto: 'Sigue: «Pago del cliente»',
    })
  })

  it('el precio va antes que el pago cuando el destino pide los dos', () => {
    const ambos = indexarFlujo(flujo({ pedidos: [pide(2, 'pago'), pide(2, 'precio')] }))
    expect(siguienteDelItem(ambos, item(1), TODO)).toMatchObject({ tipo: 'cotizacion' })
    expect(siguienteDelItem(ambos, item(1, 3), TODO)).toMatchObject({ tipo: 'pago' })
  })

  it('sin `repuestos.mover` y sin hito que hacer, sólo «Sigue: «X»»', () => {
    expect(siguienteDelItem(indice, item(2), sin('mover'))).toEqual({
      tipo: 'informar',
      texto: 'Sigue: «En tránsito»',
    })
  })
})
