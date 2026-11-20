import { describe, expect, it } from 'vitest'
import { origenesConUsoDesde } from './origen'
import {
  FRASE_DEL_PASO,
  faltasDeLaTarjeta,
  pasosParaCotizarYMover,
  pasosQueFaltan,
  type ParaCotizarYMover,
} from './pasos'

const FILA = {
  id: '00000000-0000-0000-0000-00000000000a',
  clave: 'corea',
  nombre: 'Corea',
  sustantivo: 'vehículo',
  genero: 'm',
  tipo: 'manual',
  color: '#027a48',
  activo: true,
  apibara_plataformas: [],
  datos_clave: [],
  actualizado_en: '2026-10-12T20:00:00+00:00',
}

const LISTO = {
  fases: 3,
  formula_publicada: true,
  tarjeta_publicada: true,
  campos_activos: 8,
}

function origen(fila: Record<string, unknown>, uso: Record<string, unknown> = {}) {
  const [resultado] = origenesConUsoDesde(
    [{ ...FILA, ...fila }],
    [
      {
        origen_id: FILA.id,
        vehiculos: 0,
        cotizaciones: 0,
        campos_activos: 8,
        categorias: 0,
        fases: 0,
        formula_publicada: false,
        concesiones: 0,
        tarjeta_publicada: false,
        ...uso,
      },
    ],
  )
  if (!resultado) {
    throw new Error('sin origen')
  }
  return resultado
}

function estados(tira: ParaCotizarYMover) {
  if (tira.inactivo) {
    throw new Error('inactivo')
  }
  return tira.pasos.map((paso) => [paso.clave, paso.estado])
}

describe('pasosParaCotizarYMover', () => {
  it('son cinco pasos en su orden; con todo hecho, todos listos y con «Listo»', () => {
    const tira = pasosParaCotizarYMover(origen({}, LISTO), { apibaraActiva: false })
    expect(estados(tira)).toEqual([
      ['datos', 'listo'],
      ['campos', 'listo'],
      ['flujo', 'listo'],
      ['formula', 'listo'],
      ['tarjeta', 'listo'],
    ])
    expect(!tira.inactivo && tira.pasos.every((paso) => paso.frase === 'Listo')).toBe(true)
  })

  it('un origen recién creado: el flujo y la fórmula bloquean, la tarjeta avisa', () => {
    expect(estados(pasosParaCotizarYMover(origen({}), { apibaraActiva: false }))).toEqual([
      ['datos', 'listo'],
      ['campos', 'listo'],
      ['flujo', 'bloquea'],
      ['formula', 'bloquea'],
      ['tarjeta', 'aviso'],
    ])
  })

  it('cada paso que falla dice su frase', () => {
    const tira = pasosParaCotizarYMover(origen({ tipo: 'subasta' }, { campos_activos: 0 }), {
      apibaraActiva: false,
    })
    expect(tira.inactivo ? [] : tira.pasos.map((paso) => paso.frase)).toEqual([
      FRASE_DEL_PASO.datos,
      FRASE_DEL_PASO.campos,
      FRASE_DEL_PASO.flujo,
      FRASE_DEL_PASO.formula,
      FRASE_DEL_PASO.tarjeta,
    ])
    expect(FRASE_DEL_PASO.flujo).toBe('Sin fases: sus vehículos no se pueden mover')
  })

  it('sin campos activos, Campos avisa', () => {
    const tira = pasosParaCotizarYMover(origen({}, { ...LISTO, campos_activos: 0 }), {
      apibaraActiva: false,
    })
    expect(estados(tira)[1]).toEqual(['campos', 'aviso'])
  })

  it('una subasta sin apibara: Datos avisa; con apibara, listo; un manual nunca habla de apibara', () => {
    const subasta = origen({ tipo: 'subasta' }, LISTO)
    expect(estados(pasosParaCotizarYMover(subasta, { apibaraActiva: false }))[0]).toEqual([
      'datos',
      'aviso',
    ])
    expect(estados(pasosParaCotizarYMover(subasta, { apibaraActiva: true }))[0]).toEqual([
      'datos',
      'listo',
    ])
    expect(estados(pasosParaCotizarYMover(origen({}, LISTO), { apibaraActiva: false }))[0]).toEqual(
      ['datos', 'listo'],
    )
  })

  it('un origen inactivo no tiene pasos', () => {
    expect(pasosParaCotizarYMover(origen({ activo: false }), { apibaraActiva: false })).toEqual({
      inactivo: true,
    })
  })
})

describe('pasosQueFaltan', () => {
  it('sólo los que no están listos, en su orden; inactivo, ninguno', () => {
    expect(pasosQueFaltan(origen({}), { apibaraActiva: false }).map((p) => p.clave)).toEqual([
      'flujo',
      'formula',
      'tarjeta',
    ])
    expect(pasosQueFaltan(origen({ activo: false }), { apibaraActiva: false })).toEqual([])
  })
})

describe('faltasDeLaTarjeta', () => {
  it('dice en corto lo que falta, con su estado', () => {
    expect(
      faltasDeLaTarjeta(origen({ tipo: 'subasta' }), { apibaraActiva: false }).map((f) => [
        f.texto,
        f.estado,
      ]),
    ).toEqual([
      ['Falta activar apibara', 'aviso'],
      ['Sin fases', 'bloquea'],
      ['Falta publicar la fórmula', 'bloquea'],
      ['Falta publicar la tarjeta', 'aviso'],
    ])
  })

  it('sin nada pendiente no dice nada; un origen inactivo, tampoco', () => {
    expect(faltasDeLaTarjeta(origen({}, LISTO), { apibaraActiva: false })).toEqual([])
    expect(faltasDeLaTarjeta(origen({ activo: false }), { apibaraActiva: false })).toEqual([])
  })
})
