import { describe, expect, it } from 'vitest'
import { definicionSql } from '../../../../../scripts/lib/definicion-sql'
import {
  CLAVES_QUE_SE_PIDEN,
  esClaveQueSePide,
  LARGO_DEL_TITULO_DEL_PEDIDO,
  nadieTieneLaClave,
  tituloDelPedido,
  VERBO_DE_LA_CLAVE,
} from './pedido-de-requisito'

describe('el pedido de lo que falta', () => {
  it('el título nombra lo que falta y la fase', () => {
    expect(tituloDelPedido('BL aprobado', 'Embarcado')).toBe(
      'Falta: BL aprobado para pasar a «Embarcado»',
    )
  })

  it('se recorta a 120 caracteres con «…»', () => {
    const titulo = tituloDelPedido('ñ'.repeat(200), 'Fase')
    expect([...titulo]).toHaveLength(LARGO_DEL_TITULO_DEL_PEDIDO)
    expect(titulo.endsWith('…')).toBe(true)
  })

  it('cada clave que se pide tiene su verbo', () => {
    for (const clave of CLAVES_QUE_SE_PIDEN) {
      expect(VERBO_DE_LA_CLAVE[clave].length).toBeGreaterThan(0)
      expect(esClaveQueSePide(clave)).toBe(true)
    }
    expect(esClaveQueSePide('repuestos.editar')).toBe(false)
  })

  it('cuando nadie la tiene, dice a quién pedírselo con el verbo', () => {
    expect(nadieTieneLaClave('logistica.documentos.subir')).toEqual({
      texto: 'Nadie que pueda recibir tareas tiene permiso para subir documentos en este origen.',
      pedido: 'Para subir documentos, pídeselo a quien administra los roles.',
    })
  })
})

describe('las claves que se piden, en la base', () => {
  it('agenda_quienes_reciben acepta las mismas claves que pide «Qué falta»', () => {
    const { texto } = definicionSql('agenda_quienes_reciben')
    const lista = /p_permiso <> all \(array\[([^\]]*)\]\)/.exec(texto)?.[1] ?? ''
    const enLaBase = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(enLaBase.sort()).toEqual([...CLAVES_QUE_SE_PIDEN].sort())
  })
})
