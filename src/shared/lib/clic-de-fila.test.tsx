import { describe, expect, it } from 'vitest'
import { abreEnOtraPestana, esClicDelEnlace, esClicPropio, hayTextoElegidoEn } from './clic-de-fila'

function fila(html: string) {
  const raiz = document.createElement('div')
  raiz.innerHTML = html
  document.body.append(raiz)
  return raiz
}

describe('esClicPropio', () => {
  const html = `
    <div id="fila">
      <button data-abre-resumen><span id="nombre">Ana</span></button>
      <span id="texto">Teléfono</span>
      <input id="casilla" type="checkbox" />
      <a id="enlace" href="https://x.test"><b id="dentro-del-enlace">Abrir enlace</b></a>
      <button id="mas"><i id="icono"></i></button>
      <div role="menuitem" id="item"></div>
      <div data-no-abre><p id="excluido">no abre</p></div>
    </div>`

  it('un clic en el texto de la fila abre', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    expect(esClicPropio({ target: raiz.querySelector('#texto'), currentTarget: f })).toBe(false)
    expect(esClicPropio({ target: f, currentTarget: f })).toBe(false)
  })

  it('el botón del nombre abre, también si se pulsa lo de adentro', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    expect(esClicPropio({ target: raiz.querySelector('#nombre'), currentTarget: f })).toBe(false)
  })

  it('la casilla, el enlace (y lo de adentro), el «⋯», un ítem de menú y lo marcado no abren', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    for (const id of [
      'casilla',
      'enlace',
      'dentro-del-enlace',
      'mas',
      'icono',
      'item',
      'excluido',
    ]) {
      expect(esClicPropio({ target: raiz.querySelector(`#${id}`), currentTarget: f }), id).toBe(
        true,
      )
    }
  })

  it('lo que llega desde un portal (fuera de la fila en el DOM) no abre', () => {
    const raiz = fila(html)
    const f = raiz.querySelector('#fila')!
    const portal = document.createElement('div')
    document.body.append(portal)
    expect(esClicPropio({ target: portal, currentTarget: f })).toBe(true)
  })

  it('un destino que no es un elemento no se trata como propio', () => {
    const raiz = fila(html)
    expect(esClicPropio({ target: null, currentTarget: raiz.querySelector('#fila')! })).toBe(false)
  })
})

describe('esClicDelEnlace', () => {
  it('sólo lo que cae en el enlace de la fila (o adentro) es suyo', () => {
    const raiz = fila(`
      <div id="fila">
        <a id="enlace" href="/vehiculos/1" data-abre-resumen data-enlace-de-la-fila><b id="dentro">Kia</b></a>
        <span id="texto">2022</span>
      </div>`)
    const f = raiz.querySelector('#fila')!
    expect(esClicDelEnlace({ target: raiz.querySelector('#enlace'), currentTarget: f })).toBe(true)
    expect(esClicDelEnlace({ target: raiz.querySelector('#dentro'), currentTarget: f })).toBe(true)
    expect(esClicDelEnlace({ target: raiz.querySelector('#texto'), currentTarget: f })).toBe(false)
    expect(esClicDelEnlace({ target: null, currentTarget: f })).toBe(false)
  })
})

describe('abreEnOtraPestana', () => {
  const clic = { button: 0, ctrlKey: false, metaKey: false, shiftKey: false }

  it('un clic simple se queda en la pestaña', () => {
    expect(abreEnOtraPestana(clic)).toBe(false)
  })

  it('Ctrl, Cmd o Shift con el botón principal, o el botón del medio, abren otra', () => {
    expect(abreEnOtraPestana({ ...clic, ctrlKey: true })).toBe(true)
    expect(abreEnOtraPestana({ ...clic, metaKey: true })).toBe(true)
    expect(abreEnOtraPestana({ ...clic, shiftKey: true })).toBe(true)
    expect(abreEnOtraPestana({ ...clic, button: 1 })).toBe(true)
  })

  it('el botón derecho no abre nada', () => {
    expect(abreEnOtraPestana({ ...clic, button: 2 })).toBe(false)
    expect(abreEnOtraPestana({ ...clic, button: 2, ctrlKey: true })).toBe(false)
  })
})

describe('hayTextoElegidoEn', () => {
  it('sólo cuenta un texto elegido dentro de la fila', () => {
    const raiz = fila(
      '<div id="fila"><span id="vin">KNDPB3AC1N7000001</span></div><p id="afuera">otro</p>',
    )
    const f = raiz.querySelector('#fila')!
    const seleccion = window.getSelection()!
    expect(hayTextoElegidoEn(f, seleccion)).toBe(false)
    seleccion.selectAllChildren(raiz.querySelector('#vin')!)
    expect(hayTextoElegidoEn(f, seleccion)).toBe(true)
    seleccion.selectAllChildren(raiz.querySelector('#afuera')!)
    expect(hayTextoElegidoEn(f, seleccion)).toBe(false)
    seleccion.removeAllRanges()
    expect(hayTextoElegidoEn(f, null)).toBe(false)
  })
})
