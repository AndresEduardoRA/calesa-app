import { describe, expect, it } from 'vitest'
import { avisosGuardados, claveDeLosAvisos, textosDeLosAvisos } from './avisos-de-la-copia'

describe('textosDeLosAvisos', () => {
  it('dice cada aviso en el orden de la base y marca los de tablas', () => {
    expect(
      textosDeLosAvisos([
        { tipo: 'tabla_del_destino', clave: 'flete' },
        { tipo: 'tabla_creada', clave: 'gruas' },
        { tipo: 'campo', nodo: 'n1', campo: 'puerto' },
      ]),
    ).toEqual([
      { clave: '0:flete', texto: 'Se usó la tabla «flete» de este origen.', tablas: true },
      {
        clave: '1:gruas',
        texto: 'Se creó la tabla «gruas» con las filas de la copia.',
        tablas: true,
      },
      {
        clave: '2:n1',
        texto: 'El dato «puerto» no existe en este origen: elige otro o créalo.',
        tablas: false,
      },
    ])
  })
})

describe('avisosGuardados', () => {
  it('lee lo guardado y descarta lo que no tiene la forma', () => {
    expect(avisosGuardados(JSON.stringify([{ tipo: 'tabla_creada', clave: 'x' }]))).toEqual([
      { tipo: 'tabla_creada', clave: 'x' },
    ])
    expect(avisosGuardados(null)).toEqual([])
    expect(avisosGuardados('no es json')).toEqual([])
    expect(avisosGuardados(JSON.stringify([{ tipo: 'color' }]))).toEqual([])
  })

  it('la clave lleva el id de la fórmula', () => {
    expect(claveDeLosAvisos('abc')).toBe('avisos-de-la-copia:abc')
  })
})
